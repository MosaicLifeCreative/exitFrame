import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const tags = await prisma.taskTag.findMany({
      include: {
        _count: { select: { assignments: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: tags });
  } catch (error) {
    console.error("Failed to list task tags:", error);
    return NextResponse.json({ error: "Failed to list task tags" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Find or create
    const existing = await prisma.taskTag.findFirst({
      where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ data: existing });
    }

    const tag = await prisma.taskTag.create({
      data: {
        name: parsed.data.name,
        color: parsed.data.color || null,
      },
    });

    return NextResponse.json({ data: tag }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task tag:", error);
    return NextResponse.json({ error: "Failed to create task tag" }, { status: 500 });
  }
}
