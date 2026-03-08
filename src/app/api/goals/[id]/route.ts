import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(["health", "fitness", "financial", "home", "personal", "business"]).optional(),
  status: z.enum(["active", "completed", "paused", "abandoned"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  targetDate: z.string().nullable().optional(),
});

// GET: Single goal with all milestones and recent progress
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        progress: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ data: goal });
  } catch (error) {
    console.error("Goal GET error:", error);
    return NextResponse.json({ error: "Failed to fetch goal" }, { status: 500 });
  }
}

// PATCH: Update a goal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateGoalSchema.parse(body);

    const data: Record<string, unknown> = {};
    if (parsed.title !== undefined) data.title = parsed.title;
    if (parsed.description !== undefined) data.description = parsed.description;
    if (parsed.category !== undefined) data.category = parsed.category;
    if (parsed.priority !== undefined) data.priority = parsed.priority;
    if (parsed.targetValue !== undefined) data.targetValue = parsed.targetValue;
    if (parsed.currentValue !== undefined) data.currentValue = parsed.currentValue;
    if (parsed.unit !== undefined) data.unit = parsed.unit;
    if (parsed.targetDate !== undefined) {
      data.targetDate = parsed.targetDate ? new Date(parsed.targetDate + "T00:00:00Z") : null;
    }
    if (parsed.status !== undefined) {
      data.status = parsed.status;
      if (parsed.status === "completed") {
        data.completedAt = new Date();
      } else {
        data.completedAt = null;
      }
    }

    const goal = await prisma.goal.update({
      where: { id },
      data,
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        progress: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    return NextResponse.json({ data: goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Goal PATCH error:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

// DELETE: Remove a goal
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.goal.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Goal DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
