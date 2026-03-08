import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const templateExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  sortOrder: z.number().int().min(0),
  defaultSets: z.number().int().min(1).default(3),
  defaultReps: z.number().int().min(1).default(10),
  defaultWeight: z.number().optional(),
  notes: z.string().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  exercises: z.array(templateExerciseSchema).optional(),
});

// GET: List all templates with their exercises
export async function GET() {
  try {
    const templates = await prisma.workoutTemplate.findMany({
      where: { isActive: true },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { sessions: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Template GET error:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST: Create a template with exercises
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = templateSchema.parse(body);

    const template = await prisma.workoutTemplate.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        exercises: parsed.exercises
          ? {
              create: parsed.exercises.map((e) => ({
                exerciseId: e.exerciseId,
                sortOrder: e.sortOrder,
                defaultSets: e.defaultSets,
                defaultReps: e.defaultReps,
                defaultWeight: e.defaultWeight,
                notes: e.notes,
              })),
            }
          : undefined,
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Template POST error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

// PUT: Update a template (name, description, and replace exercises)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, exercises, ...data } = body as {
      id: string;
      exercises?: z.infer<typeof templateExerciseSchema>[];
    } & Record<string, unknown>;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Valid template ID required" }, { status: 400 });
    }

    // If exercises provided, replace all template exercises
    if (exercises) {
      await prisma.templateExercise.deleteMany({ where: { templateId: id } });
    }

    const template = await prisma.workoutTemplate.update({
      where: { id },
      data: {
        ...data,
        exercises: exercises
          ? {
              create: exercises.map((e) => ({
                exerciseId: e.exerciseId,
                sortOrder: e.sortOrder,
                defaultSets: e.defaultSets ?? 3,
                defaultReps: e.defaultReps ?? 10,
                defaultWeight: e.defaultWeight,
                notes: e.notes,
              })),
            }
          : undefined,
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("Template PUT error:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

// DELETE: Soft-delete a template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Valid template ID required" }, { status: 400 });
    }

    await prisma.workoutTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Template DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
