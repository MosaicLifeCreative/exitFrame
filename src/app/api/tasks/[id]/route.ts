import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
export const dynamic = "force-dynamic";

function computeScore(importance: number, urgency: number, effort: number): number {
  return Math.round(((importance * urgency) / effort) * 100) / 100;
}

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled", "waiting"]).optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  projectId: z.string().uuid().nullable().optional(),
  phaseId: z.string().uuid().nullable().optional(),
  noteId: z.string().uuid().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  dependsOnTaskId: z.string().uuid().nullable().optional(),
  importanceScore: z.number().int().min(1).max(5).optional(),
  urgencyScore: z.number().int().min(1).max(5).optional(),
  effortScore: z.number().int().min(1).max(5).optional(),
  isDailyHighlight: z.boolean().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderInterval: z.enum(["daily", "hourly"]).nullable().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

const taskInclude = {
  project: { select: { id: true, name: true, domain: true, domainRefId: true } },
  group: { select: { id: true, name: true, color: true, icon: true } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  note: { select: { id: true, title: true } },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        ...taskInclude,
        phase: { select: { id: true, name: true } },
        dependsOn: { select: { id: true, title: true } },
        recurringConfig: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("Failed to get task:", error);
    return NextResponse.json({ error: "Failed to get task" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.task.findUnique({
      where: { id: params.id },
      select: { importanceScore: true, urgencyScore: true, effortScore: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { tagIds, ...fields } = parsed.data;
    const data: Record<string, unknown> = { ...fields };

    // Date handling
    if (data.dueDate !== undefined) {
      data.dueDate = data.dueDate ? new Date(data.dueDate as string) : null;
    }
    if (data.startDate !== undefined) {
      data.startDate = data.startDate ? new Date(data.startDate as string) : null;
    }

    // Completion handling
    if (fields.status === "done" && existing.status !== "done") {
      data.completedAt = new Date();
    } else if (fields.status && fields.status !== "done" && existing.status === "done") {
      data.completedAt = null;
    }

    // Recompute score if any score field changed
    const importance = fields.importanceScore ?? existing.importanceScore;
    const urgency = fields.urgencyScore ?? existing.urgencyScore;
    const effort = fields.effortScore ?? existing.effortScore;
    if (fields.importanceScore || fields.urgencyScore || fields.effortScore) {
      data.computedScore = computeScore(importance, urgency, effort);
    }

    // Daily highlight handling
    if (fields.isDailyHighlight === true) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      data.highlightDate = today;
    } else if (fields.isDailyHighlight === false) {
      data.highlightDate = null;
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data,
      include: taskInclude,
    });

    // Handle tag updates (replace all)
    if (tagIds !== undefined) {
      await prisma.taskTagAssignment.deleteMany({ where: { taskId: params.id } });
      if (tagIds.length > 0) {
        await prisma.taskTagAssignment.createMany({
          data: tagIds.map((tagId) => ({ taskId: params.id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    if (fields.status === "done") {
      logActivity({
        domain: task.project?.domain ?? "life",
        domainRefId: task.project?.domainRefId ?? undefined,
        module: "tasks",
        activityType: "completed",
        title: `Completed task '${task.title}'`,
        refType: "task",
        refId: task.id,
      });
    }

    // Re-fetch with tags if they changed
    const full = tagIds !== undefined
      ? await prisma.task.findUnique({ where: { id: task.id }, include: taskInclude })
      : task;

    return NextResponse.json({ data: full });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: { title: true, project: { select: { domain: true } } },
    });

    await prisma.task.delete({ where: { id: params.id } });

    logActivity({
      domain: task?.project?.domain ?? "life",
      module: "tasks",
      activityType: "deleted",
      title: `Deleted task '${task?.title || "Unknown"}'`,
      refType: "task",
      refId: params.id,
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
