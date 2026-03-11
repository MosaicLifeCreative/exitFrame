import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const createGroupSchema = z.object({
  name: z.string().min(1),
  parentGroupId: z.string().uuid().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const groups = await prisma.taskGroup.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { tasks: { where: { status: { notIn: ["done", "cancelled"] } } } } },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Return top-level groups with nested children
    const topLevel = groups.filter((g) => !g.parentGroupId);
    return NextResponse.json({ data: topLevel });
  } catch (error) {
    console.error("Failed to list task groups:", error);
    return NextResponse.json({ error: "Failed to list task groups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const maxGroup = await prisma.taskGroup.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const group = await prisma.taskGroup.create({
      data: {
        name: parsed.data.name,
        parentGroupId: parsed.data.parentGroupId || null,
        color: parsed.data.color || null,
        icon: parsed.data.icon || null,
        sortOrder: (maxGroup?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task group:", error);
    return NextResponse.json({ error: "Failed to create task group" }, { status: 500 });
  }
}
