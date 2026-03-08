import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const setSchema = z.object({
  setNumber: z.number().int().min(1),
  weight: z.number().optional(),
  reps: z.number().int().min(0),
  rpe: z.number().int().min(1).max(10).optional(),
  setType: z.enum(["warmup", "working", "drop", "failure"]).default("working"),
  isCompleted: z.boolean().default(true),
});

const sessionExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  sortOrder: z.number().int().min(0),
  notes: z.string().optional(),
  sets: z.array(setSchema),
});

const sessionSchema = z.object({
  templateId: z.string().uuid().optional(),
  name: z.string().min(1).max(300),
  performedAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  durationMinutes: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  source: z.enum(["manual", "claude", "oura", "import", "draft"]).default("manual"),
  exercises: z.array(sessionExerciseSchema),
});

// GET: List workout sessions with summary data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const includeDrafts = searchParams.get("includeDrafts") === "true";
    const where: Record<string, unknown> = {};
    if (!includeDrafts) {
      where.source = { not: "draft" };
    }
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.performedAt = dateFilter;
    }

    const [sessions, total] = await Promise.all([
      prisma.workoutSession.findMany({
        where,
        include: {
          template: { select: { id: true, name: true } },
          exercises: {
            include: {
              exercise: { select: { id: true, name: true, muscleGroup: true, equipment: true } },
              sets: { orderBy: { setNumber: "asc" } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { performedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.workoutSession.count({ where }),
    ]);

    return NextResponse.json({ data: { sessions, total } });
  } catch (error) {
    console.error("Session GET error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

// POST: Log a new workout session with exercises and sets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sessionSchema.parse(body);

    const session = await prisma.workoutSession.create({
      data: {
        templateId: parsed.templateId,
        name: parsed.name,
        performedAt: new Date(parsed.performedAt),
        durationMinutes: parsed.durationMinutes,
        notes: parsed.notes,
        source: parsed.source,
        exercises: {
          create: parsed.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            sortOrder: ex.sortOrder,
            notes: ex.notes,
            sets: {
              create: ex.sets.map((s) => ({
                setNumber: s.setNumber,
                weight: s.weight,
                reps: s.reps,
                rpe: s.rpe,
                setType: s.setType,
                isCompleted: s.isCompleted,
              })),
            },
          })),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: { select: { id: true, name: true, muscleGroup: true } },
            sets: { orderBy: { setNumber: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ data: session }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Session POST error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
