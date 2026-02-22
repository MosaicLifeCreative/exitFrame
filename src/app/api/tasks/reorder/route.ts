import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
      status: z.enum(["todo", "in_progress", "done"]).optional(),
    })
  ),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Batch update all task positions
    await prisma.$transaction(
      parsed.data.tasks.map((task) =>
        prisma.task.update({
          where: { id: task.id },
          data: {
            sortOrder: task.sortOrder,
            ...(task.status ? { status: task.status } : {}),
          },
        })
      )
    );

    return NextResponse.json({ data: { updated: parsed.data.tasks.length } });
  } catch (error) {
    console.error("Failed to reorder tasks:", error);
    return NextResponse.json({ error: "Failed to reorder tasks" }, { status: 500 });
  }
}
