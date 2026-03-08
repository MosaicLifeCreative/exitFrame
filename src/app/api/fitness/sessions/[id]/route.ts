import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Get a single session with full detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    const session = await prisma.workoutSession.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true } },
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ data: session });
  } catch (error) {
    console.error("Session GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

// PATCH: Update a workout session (replace exercises and sets)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, durationMinutes, notes, exercises, source, performedAt } = body;

    // Update session fields
    await prisma.workoutSession.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(durationMinutes !== undefined && { durationMinutes }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(source !== undefined && { source }),
        ...(performedAt !== undefined && { performedAt: new Date(performedAt) }),
      },
    });

    // If exercises provided, replace them entirely
    if (exercises && Array.isArray(exercises)) {
      // Delete existing exercises (cascades to sets)
      await prisma.sessionExercise.deleteMany({ where: { sessionId: id } });

      // Create new exercises with sets
      for (const ex of exercises) {
        await prisma.sessionExercise.create({
          data: {
            sessionId: id,
            exerciseId: ex.exerciseId,
            sortOrder: ex.sortOrder,
            notes: ex.notes || null,
            sets: {
              create: ex.sets.map((s: { setNumber: number; weight?: number; reps: number; rpe?: number; setType: string }) => ({
                setNumber: s.setNumber,
                weight: s.weight ?? null,
                reps: s.reps,
                rpe: s.rpe ?? null,
                setType: s.setType || "working",
                isCompleted: true,
              })),
            },
          },
        });
      }
    }

    // Return updated session
    const updated = await prisma.workoutSession.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true } },
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Session PATCH error:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

// DELETE: Delete a workout session and all its data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    await prisma.workoutSession.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Session DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
