import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: Exercise details with usage stats
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid exercise ID" }, { status: 400 });
  }

  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // Get all session exercises for this exercise with sets and session date
    const sessionExercises = await prisma.sessionExercise.findMany({
      where: {
        exerciseId: id,
        session: { source: { not: "draft" } },
      },
      include: {
        sets: {
          orderBy: { setNumber: "asc" },
        },
        session: {
          select: { performedAt: true, name: true },
        },
      },
      orderBy: { session: { performedAt: "desc" } },
    });

    // Compute stats
    let maxWeight = 0;
    let maxWeightDate: Date | null = null;
    let maxWeightReps = 0;
    const totalSessions = sessionExercises.length;
    let lastPerformed: Date | null = null;
    let lastPerformedSessionName: string | null = null;

    // Last session's sets for "last time" display
    let lastSets: Array<{ setNumber: number; weight: number | null; reps: number; rpe: number | null; setType: string }> = [];

    // History: last 10 sessions with this exercise
    const history: Array<{
      date: string;
      sessionName: string;
      sets: Array<{ setNumber: number; weight: number | null; reps: number; rpe: number | null; setType: string }>;
    }> = [];

    for (const se of sessionExercises) {
      const sessionDate = se.session.performedAt;

      if (!lastPerformed) {
        lastPerformed = sessionDate;
        lastPerformedSessionName = se.session.name;
        lastSets = se.sets.map((s) => ({
          setNumber: s.setNumber,
          weight: s.weight != null ? Number(s.weight) : null,
          reps: s.reps,
          rpe: s.rpe,
          setType: s.setType,
        }));
      }

      if (history.length < 10) {
        history.push({
          date: sessionDate.toISOString(),
          sessionName: se.session.name,
          sets: se.sets.map((s) => ({
            setNumber: s.setNumber,
            weight: s.weight != null ? Number(s.weight) : null,
            reps: s.reps,
            rpe: s.rpe,
            setType: s.setType,
          })),
        });
      }

      for (const set of se.sets) {
        const w = set.weight != null ? Number(set.weight) : 0;
        if (w > maxWeight) {
          maxWeight = w;
          maxWeightDate = sessionDate;
          maxWeightReps = set.reps;
        }
      }
    }

    return NextResponse.json({
      data: {
        ...exercise,
        stats: {
          totalSessions,
          lastPerformed: lastPerformed?.toISOString() || null,
          lastPerformedSessionName,
          lastSets,
          maxWeight: maxWeight > 0 ? maxWeight : null,
          maxWeightDate: maxWeightDate?.toISOString() || null,
          maxWeightReps: maxWeight > 0 ? maxWeightReps : null,
          history,
        },
      },
    });
  } catch (error) {
    console.error("Exercise GET error:", error);
    return NextResponse.json({ error: "Failed to fetch exercise" }, { status: 500 });
  }
}
