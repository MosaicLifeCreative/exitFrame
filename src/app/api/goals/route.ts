import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["health", "fitness", "financial", "home", "personal", "business"]),
  goalType: z.enum(["quantitative", "qualitative"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  startValue: z.number().optional(),
  unit: z.string().optional(),
  targetDate: z.string().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .optional(),
});

// GET: List goals with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const goals = await prisma.goal.findMany({
      where,
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
        progress: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: goals });
  } catch (error) {
    console.error("Goals GET error:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

// POST: Create a new goal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createGoalSchema.parse(body);

    const goal = await prisma.goal.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        goalType: parsed.goalType,
        priority: parsed.priority,
        targetValue: parsed.targetValue,
        currentValue: parsed.currentValue ?? parsed.startValue,
        startValue: parsed.startValue,
        unit: parsed.unit,
        targetDate: parsed.targetDate ? new Date(parsed.targetDate + "T00:00:00Z") : undefined,
        milestones: parsed.milestones
          ? { create: parsed.milestones }
          : undefined,
      },
      include: {
        milestones: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Goals POST error:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
