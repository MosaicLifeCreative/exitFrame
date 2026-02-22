import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateActionSchema = z.object({
  status: z.enum(["pending", "accepted", "dismissed", "completed"]),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const action = await prisma.noteAction.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
    });

    // Update the note's hasPendingActions flag
    const pendingCount = await prisma.noteAction.count({
      where: { noteId: action.noteId, status: "pending" },
    });

    await prisma.note.update({
      where: { id: action.noteId },
      data: { hasPendingActions: pendingCount > 0 },
    });

    return NextResponse.json({ data: action });
  } catch (error) {
    console.error("Failed to update action:", error);
    return NextResponse.json({ error: "Failed to update action" }, { status: 500 });
  }
}
