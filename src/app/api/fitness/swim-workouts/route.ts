import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSwimWorkoutSchema = z.object({
  name: z.string().min(1),
  focus: z.string().optional(),
  totalYards: z.number().optional(),
  content: z.string().min(1),
  source: z.enum(["claude", "manual"]).default("claude"),
  isTemplate: z.boolean().default(false),
});

// GET: List swim workouts (most recent first)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const templatesOnly = searchParams.get("templates") === "true";

    const where: Record<string, unknown> = {};
    if (templatesOnly) where.isTemplate = true;

    const workouts = await prisma.swimWorkout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ data: workouts });
  } catch (error) {
    console.error("SwimWorkout GET error:", error);
    return NextResponse.json({ error: "Failed to fetch swim workouts" }, { status: 500 });
  }
}

// POST: Create a swim workout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSwimWorkoutSchema.parse(body);

    const workout = await prisma.swimWorkout.create({
      data: {
        name: parsed.name,
        focus: parsed.focus,
        totalYards: parsed.totalYards,
        content: parsed.content,
        source: parsed.source,
        isTemplate: parsed.isTemplate,
      },
    });

    return NextResponse.json({ data: workout }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("SwimWorkout POST error:", error);
    return NextResponse.json({ error: "Failed to create swim workout" }, { status: 500 });
  }
}
