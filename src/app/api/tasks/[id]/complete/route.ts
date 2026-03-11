import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { calculateNextDueDate } from "@/lib/task-recurring";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const notes = body?.notes as string | undefined;

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: { project: { select: { domain: true, domainRefId: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Complete the task
    const updateData: Record<string, unknown> = {
      status: "done",
      completedAt: new Date(),
    };

    if (notes) {
      updateData.description = task.description
        ? `${task.description}\n\n---\nCompletion notes: ${notes}`
        : `Completion notes: ${notes}`;
    }

    const completed = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
    });

    logActivity({
      domain: task.project?.domain ?? "life",
      domainRefId: task.project?.domainRefId ?? undefined,
      module: "tasks",
      activityType: "completed",
      title: `Completed task '${completed.title}'`,
      refType: "task",
      refId: completed.id,
    });

    // Handle recurring: generate next instance if this is a recurring instance
    if (task.parentRecurringTaskId) {
      const template = await prisma.task.findUnique({
        where: { id: task.parentRecurringTaskId },
        include: {
          recurringConfig: true,
          tags: true,
        },
      });

      if (template?.recurringConfig && template.recurringConfig.isActive) {
        const config = template.recurringConfig;
        const nextDate = calculateNextDueDate(config, new Date());

        // Check if max occurrences reached
        const shouldCreate = !config.maxOccurrences || config.occurrenceCount < config.maxOccurrences;
        const withinEndDate = !config.endDate || nextDate <= new Date(config.endDate);

        if (shouldCreate && withinEndDate) {
          // Create next instance
          const newTask = await prisma.task.create({
            data: {
              title: template.title,
              description: template.description,
              groupId: template.groupId,
              projectId: template.projectId,
              noteId: template.noteId,
              priority: template.priority,
              importanceScore: template.importanceScore,
              urgencyScore: template.urgencyScore,
              effortScore: template.effortScore,
              computedScore: template.computedScore,
              reminderEnabled: template.reminderEnabled,
              reminderInterval: template.reminderInterval,
              parentRecurringTaskId: template.id,
              dueDate: nextDate,
              source: "recurring",
            },
          });

          // Copy tags
          if (template.tags.length > 0) {
            await prisma.taskTagAssignment.createMany({
              data: template.tags.map((ta) => ({ taskId: newTask.id, tagId: ta.tagId })),
              skipDuplicates: true,
            });
          }

          // Update config
          await prisma.recurringConfig.update({
            where: { id: config.id },
            data: {
              occurrenceCount: config.occurrenceCount + 1,
              nextDueDate: nextDate,
            },
          });
        }
      }
    }

    return NextResponse.json({ data: completed });
  } catch (error) {
    console.error("Failed to complete task:", error);
    return NextResponse.json({ error: "Failed to complete task" }, { status: 500 });
  }
}
