import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const action = await prisma.noteAction.findUnique({
      where: { id: params.id },
      include: { note: true },
    });

    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    if (action.status !== "accepted") {
      return NextResponse.json(
        { error: "Action must be accepted before executing" },
        { status: 400 }
      );
    }

    const actionData = action.suggestedActionData as Record<string, unknown> | null;

    switch (action.suggestedActionType) {
      case "create_task": {
        const task = await prisma.task.create({
          data: {
            title: (actionData?.title as string) || action.detectedText.slice(0, 100),
            description: action.detectedText,
            priority: (actionData?.priority as string) || "medium",
            dueDate: actionData?.due_date ? new Date(actionData.due_date as string) : null,
          },
        });

        await prisma.noteAction.update({
          where: { id: action.id },
          data: {
            status: "completed",
            executedRefType: "task",
            executedRefId: task.id,
          },
        });

        return NextResponse.json({ data: { type: "task", id: task.id } });
      }

      default: {
        // For unsupported types, create a task as a to-do
        const task = await prisma.task.create({
          data: {
            title: `[${action.suggestedActionType}] ${(actionData?.title as string) || action.detectedText.slice(0, 80)}`,
            description: `From meeting notes: ${action.note.title}\n\n${action.detectedText}`,
            priority: "medium",
          },
        });

        await prisma.noteAction.update({
          where: { id: action.id },
          data: {
            status: "completed",
            executedRefType: "task",
            executedRefId: task.id,
          },
        });

        return NextResponse.json({ data: { type: "task", id: task.id } });
      }
    }
  } catch (error) {
    console.error("Failed to execute action:", error);
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 });
  }
}
