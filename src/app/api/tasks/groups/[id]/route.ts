import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  parentGroupId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const group = await prisma.taskGroup.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ data: group });
  } catch (error) {
    console.error("Failed to update task group:", error);
    return NextResponse.json({ error: "Failed to update task group" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete — deactivate, don't remove
    await prisma.taskGroup.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete task group:", error);
    return NextResponse.json({ error: "Failed to delete task group" }, { status: 500 });
  }
}
