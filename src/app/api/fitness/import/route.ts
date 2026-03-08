import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Notion exercise data from the Exercises database
interface NotionExercise {
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions?: string;
}

// Notion workout session with lifting entries
interface NotionWorkoutEntry {
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
}

interface NotionWorkoutSession {
  name: string;
  date: string; // ISO date
  durationMinutes?: number;
  notes?: string;
  entries: NotionWorkoutEntry[];
}

// Normalize muscle group names from Notion to our schema
function normalizeMuscleGroup(notionGroup: string): string {
  const map: Record<string, string> = {
    "Stretching/Mobility": "stretching_mobility",
    "Shoulders": "shoulders",
    "Chest": "chest",
    "Core": "core",
    "Legs": "legs",
    "Cardio": "cardio",
    "Arms": "arms",
    "Back": "back",
    "Power/Explosive": "power_explosive",
    "Glutes": "glutes",
    "Biceps": "biceps",
    "Triceps": "triceps",
    "Knee": "legs",
  };
  return map[notionGroup] || notionGroup.toLowerCase().replace(/[^a-z]/g, "_");
}

// Normalize equipment names from Notion to our schema
function normalizeEquipment(notionEquip: string): string {
  const map: Record<string, string> = {
    "None": "none",
    "Mat": "mat",
    "Dumbbell": "dumbbell",
    "Resistance Band": "resistance_band",
    "Barbell": "barbell",
    "Machine": "machine",
    "Bodyweight": "bodyweight",
    "Pull-Up Bar": "pull_up_bar",
    "Bosu Ball": "bosu_ball",
    "Wall": "wall",
    "Cable Machine": "cable_machine",
    "Curl Bar": "curl_bar",
    "Medicine Ball": "medicine_ball",
    "Step-Bench": "step_bench",
    "Landmine": "landmine",
    "Trap Bar": "trap_bar",
  };
  return map[notionEquip] || notionEquip.toLowerCase().replace(/[^a-z]/g, "_");
}

// POST: Import exercises and/or workout sessions from Notion export
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exercises, sessions } = body as {
      exercises?: NotionExercise[];
      sessions?: NotionWorkoutSession[];
    };

    const results = { exercisesImported: 0, exercisesSkipped: 0, sessionsImported: 0 };

    // Import exercises
    if (exercises && exercises.length > 0) {
      for (const ex of exercises) {
        try {
          await prisma.exercise.upsert({
            where: { name: ex.name },
            create: {
              name: ex.name,
              muscleGroup: normalizeMuscleGroup(ex.muscleGroup),
              equipment: normalizeEquipment(ex.equipment),
              instructions: ex.instructions || null,
            },
            update: {
              muscleGroup: normalizeMuscleGroup(ex.muscleGroup),
              equipment: normalizeEquipment(ex.equipment),
              instructions: ex.instructions || undefined,
            },
          });
          results.exercisesImported++;
        } catch {
          results.exercisesSkipped++;
        }
      }
    }

    // Import workout sessions
    if (sessions && sessions.length > 0) {
      for (const sess of sessions) {
        // Look up exercise IDs by name
        const exerciseEntries: Array<{
          exerciseId: string;
          sortOrder: number;
          notes?: string;
          sets: Array<{ setNumber: number; weight?: number; reps: number }>;
        }> = [];

        for (let i = 0; i < sess.entries.length; i++) {
          const entry = sess.entries[i];
          const exercise = await prisma.exercise.findFirst({
            where: { name: { equals: entry.exerciseName, mode: "insensitive" } },
          });

          if (!exercise) continue;

          // Convert Notion's "3 sets x 12 reps" to individual sets
          const sets = [];
          for (let s = 1; s <= entry.sets; s++) {
            sets.push({
              setNumber: s,
              weight: entry.weight > 0 ? entry.weight : undefined,
              reps: entry.reps,
            });
          }

          exerciseEntries.push({
            exerciseId: exercise.id,
            sortOrder: i,
            notes: entry.notes,
            sets,
          });
        }

        if (exerciseEntries.length === 0) continue;

        await prisma.workoutSession.create({
          data: {
            name: sess.name,
            performedAt: new Date(sess.date),
            durationMinutes: sess.durationMinutes,
            notes: sess.notes,
            source: "import",
            exercises: {
              create: exerciseEntries.map((ex) => ({
                exerciseId: ex.exerciseId,
                sortOrder: ex.sortOrder,
                notes: ex.notes,
                sets: {
                  create: ex.sets.map((s) => ({
                    setNumber: s.setNumber,
                    weight: s.weight,
                    reps: s.reps,
                  })),
                },
              })),
            },
          },
        });

        results.sessionsImported++;
      }
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Fitness import error:", error);
    const msg = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
