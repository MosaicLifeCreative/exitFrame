import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
export const dynamic = "force-dynamic";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  projectId: z.string().uuid().nullable().optional(),
  phaseId: z.string().uuid().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  dependsOnTaskId: z.string().uuid().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const dueBefore = searchParams.get("due_before");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (dueBefore) {
      where.dueDate = { lte: new Date(dueBefore) };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, domain: true, domainRefId: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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

    // Get next sort order for the project (or global)
    const maxTask = await prisma.task.findFirst({
      where: { projectId: parsed.data.projectId || null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        projectId: parsed.data.projectId || null,
        phaseId: parsed.data.phaseId || null,
        status: parsed.data.status || "todo",
        priority: parsed.data.priority || "medium",
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        dependsOnTaskId: parsed.data.dependsOnTaskId || null,
        sortOrder: (maxTask?.sortOrder ?? -1) + 1,
      },
      include: {
        project: { select: { id: true, name: true, domain: true, domainRefId: true } },
      },
    });

    logActivity({
      domain: task.project?.domain ?? "life",
      domainRefId: task.project?.domainRefId ?? undefined,
      module: "tasks",
      activityType: "created",
      title: `Created task '${task.title}'`,
      refType: "task",
      refId: task.id,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
