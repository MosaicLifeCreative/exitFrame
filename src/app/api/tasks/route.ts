import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { calculateNextDueDate } from "@/lib/task-recurring";
export const dynamic = "force-dynamic";

function computeScore(importance: number, urgency: number, effort: number): number {
  return Math.round(((importance * urgency) / effort) * 100) / 100;
}

const recurringSchema = z.object({
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly", "custom"]),
  intervalDays: z.number().int().min(1).nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  endDate: z.string().nullable().optional(),
  maxOccurrences: z.number().int().min(1).nullable().optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  projectId: z.string().uuid().nullable().optional(),
  phaseId: z.string().uuid().nullable().optional(),
  noteId: z.string().uuid().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled", "waiting"]).optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dependsOnTaskId: z.string().uuid().nullable().optional(),
  importanceScore: z.number().int().min(1).max(5).optional(),
  urgencyScore: z.number().int().min(1).max(5).optional(),
  effortScore: z.number().int().min(1).max(5).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderInterval: z.enum(["daily", "hourly"]).nullable().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  source: z.string().optional(),
  recurring: recurringSchema.nullable().optional(),
});

const taskInclude = {
  project: { select: { id: true, name: true, domain: true, domainRefId: true } },
  group: { select: { id: true, name: true, color: true, icon: true } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  note: { select: { id: true, title: true } },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const groupId = searchParams.get("group_id");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const tag = searchParams.get("tag");
    const dueBefore = searchParams.get("due_before");
    const overdue = searchParams.get("overdue");
    const highlight = searchParams.get("highlight");
    const sortBy = searchParams.get("sort_by") || "sort_order";
    const excludeDone = searchParams.get("exclude_done");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (groupId) where.groupId = groupId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (dueBefore) where.dueDate = { lte: new Date(dueBefore) };
    if (overdue === "true") {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ["done", "cancelled"] };
    }
    if (highlight === "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.isDailyHighlight = true;
      where.highlightDate = today;
    }
    if (excludeDone === "true") {
      where.status = { notIn: ["done", "cancelled"] };
    }
    if (tag) {
      where.tags = { some: { tag: { name: { equals: tag, mode: "insensitive" } } } };
    }
    // Don't show recurring templates in normal list
    where.isRecurring = false;

    const orderBy: Record<string, string>[] = [];
    switch (sortBy) {
      case "score": orderBy.push({ computedScore: "desc" }); break;
      case "due_date": orderBy.push({ dueDate: "asc" }); break;
      case "priority": orderBy.push({ priority: "desc" }); break;
      case "created": orderBy.push({ createdAt: "desc" }); break;
      default: orderBy.push({ sortOrder: "asc" }, { createdAt: "desc" });
    }

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy,
    });

    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error("Failed to list tasks:", error);
    return NextResponse.json({ error: "Failed to list tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const importance = d.importanceScore ?? 3;
    const urgency = d.urgencyScore ?? 3;
    const effort = d.effortScore ?? 3;

    // Get next sort order
    const maxTask = await prisma.task.findFirst({
      where: { projectId: d.projectId || null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const baseData = {
      title: d.title,
      description: d.description || null,
      projectId: d.projectId || null,
      phaseId: d.phaseId || null,
      noteId: d.noteId || null,
      groupId: d.groupId || null,
      priority: d.priority || "medium",
      importanceScore: importance,
      urgencyScore: urgency,
      effortScore: effort,
      computedScore: computeScore(importance, urgency, effort),
      reminderEnabled: d.reminderEnabled ?? false,
      reminderInterval: d.reminderInterval || null,
      sortOrder: (maxTask?.sortOrder ?? -1) + 1,
    };

    // ── Recurring task flow ──
    if (d.recurring) {
      const r = d.recurring;
      const config = await prisma.recurringConfig.create({
        data: {
          frequency: r.frequency,
          intervalDays: r.intervalDays || null,
          daysOfWeek: r.daysOfWeek || [],
          dayOfMonth: r.dayOfMonth || null,
          startDate: new Date(),
          endDate: r.endDate ? new Date(r.endDate) : null,
          maxOccurrences: r.maxOccurrences || null,
          nextDueDate: new Date(),
          isActive: true,
        },
      });

      // Create template (never shown in task list)
      const template = await prisma.task.create({
        data: {
          ...baseData,
          status: "todo",
          isRecurring: true,
          recurringConfigId: config.id,
          source: d.source || "manual",
        },
      });

      // Create first instance
      const nextDue = calculateNextDueDate(
        { frequency: r.frequency, intervalDays: r.intervalDays || null, daysOfWeek: r.daysOfWeek || [], dayOfMonth: r.dayOfMonth || null, monthOfYear: null },
        new Date()
      );

      const instance = await prisma.task.create({
        data: {
          ...baseData,
          status: d.status || "todo",
          dueDate: d.dueDate ? new Date(d.dueDate) : nextDue,
          startDate: d.startDate ? new Date(d.startDate) : null,
          parentRecurringTaskId: template.id,
          source: "recurring",
        },
        include: taskInclude,
      });

      // Copy tags to both template and instance
      if (d.tagIds && d.tagIds.length > 0) {
        await prisma.taskTagAssignment.createMany({
          data: [
            ...d.tagIds.map((tagId) => ({ taskId: template.id, tagId })),
            ...d.tagIds.map((tagId) => ({ taskId: instance.id, tagId })),
          ],
          skipDuplicates: true,
        });
      }

      await prisma.recurringConfig.update({
        where: { id: config.id },
        data: { occurrenceCount: 1, nextDueDate: nextDue },
      });

      logActivity({
        domain: instance.project?.domain ?? "life",
        domainRefId: instance.project?.domainRefId ?? undefined,
        module: "tasks",
        activityType: "created",
        title: `Created recurring task '${instance.title}'`,
        refType: "task",
        refId: instance.id,
      });

      const full = await prisma.task.findUnique({
        where: { id: instance.id },
        include: taskInclude,
      });

      return NextResponse.json({ data: full }, { status: 201 });
    }

    // ── Normal task flow ──
    const task = await prisma.task.create({
      data: {
        ...baseData,
        status: d.status || "todo",
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        startDate: d.startDate ? new Date(d.startDate) : null,
        dependsOnTaskId: d.dependsOnTaskId || null,
        source: d.source || "manual",
      },
      include: taskInclude,
    });

    // Handle tag assignments
    if (d.tagIds && d.tagIds.length > 0) {
      await prisma.taskTagAssignment.createMany({
        data: d.tagIds.map((tagId) => ({ taskId: task.id, tagId })),
        skipDuplicates: true,
      });
    }

    logActivity({
      domain: task.project?.domain ?? "life",
      domainRefId: task.project?.domainRefId ?? undefined,
      module: "tasks",
      activityType: "created",
      title: `Created task '${task.title}'`,
      refType: "task",
      refId: task.id,
    });

    // Re-fetch with tags
    const full = await prisma.task.findUnique({
      where: { id: task.id },
      include: taskInclude,
    });

    return NextResponse.json({ data: full }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
