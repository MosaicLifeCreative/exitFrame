import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
});

const updateMilestoneSchema = z.object({
  id: z.string().uuid(),
  isCompleted: z.boolean().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

// POST: Add a milestone to a goal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createMilestoneSchema.parse(body);

    const milestone = await prisma.goalMilestone.create({
      data: {
        goalId: id,
        title: parsed.title,
        description: parsed.description,
        sortOrder: parsed.sortOrder,
      },
    });

    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Milestone POST error:", error);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}

// PATCH: Update a milestone (toggle completion, edit text)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateMilestoneSchema.parse(body);

    const data: Record<string, unknown> = {};
    if (parsed.title !== undefined) data.title = parsed.title;
    if (parsed.description !== undefined) data.description = parsed.description;
    if (parsed.isCompleted !== undefined) {
      data.isCompleted = parsed.isCompleted;
      data.completedAt = parsed.isCompleted ? new Date() : null;
    }

    const milestone = await prisma.goalMilestone.update({
      where: { id: parsed.id },
      data,
    });

    return NextResponse.json({ data: milestone });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Milestone PATCH error:", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}
