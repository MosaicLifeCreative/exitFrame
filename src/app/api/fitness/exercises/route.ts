import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const exerciseSchema = z.object({
  name: z.string().min(1).max(200),
  muscleGroup: z.string().min(1),
  equipment: z.string().default("none"),
  instructions: z.string().optional(),
});

// GET: List all exercises (optionally filter by muscle group or equipment)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const muscleGroup = searchParams.get("muscleGroup");
    const equipment = searchParams.get("equipment");
    const search = searchParams.get("search");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const where: Record<string, unknown> = {};
    if (activeOnly) where.isActive = true;
    if (muscleGroup) where.muscleGroup = muscleGroup;
    if (equipment) where.equipment = equipment;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: exercises });
  } catch (error) {
    console.error("Exercise GET error:", error);
    return NextResponse.json({ error: "Failed to fetch exercises" }, { status: 500 });
  }
}

// POST: Create a new exercise
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = exerciseSchema.parse(body);

    const exercise = await prisma.exercise.create({
      data: parsed,
    });

    return NextResponse.json({ data: exercise }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Exercise POST error:", error);
    return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 });
  }
}

// PUT: Update an exercise
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body as { id: string } & Record<string, unknown>;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Valid exercise ID required" }, { status: 400 });
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: exercise });
  } catch (error) {
    console.error("Exercise PUT error:", error);
    return NextResponse.json({ error: "Failed to update exercise" }, { status: 500 });
  }
}

// DELETE: Soft-delete an exercise
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Valid exercise ID required" }, { status: 400 });
    }

    await prisma.exercise.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Exercise DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete exercise" }, { status: 500 });
  }
}
