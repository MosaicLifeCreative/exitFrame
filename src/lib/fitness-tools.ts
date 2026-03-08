import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const fitnessTools: Anthropic.Tool[] = [
  {
    name: "list_exercises",
    description:
      "Search the exercise library. Use this to find exercise IDs before creating a workout. Returns id, name, muscleGroup, and equipment for each match.",
    input_schema: {
      type: "object" as const,
      properties: {
        muscleGroup: {
          type: "string",
          description:
            "Filter by muscle group (e.g. chest, back, legs, shoulders, arms, core, cardio)",
        },
        search: {
          type: "string",
          description: "Search exercises by name (case-insensitive partial match)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_recent_workouts",
    description:
      "Get the user's recent workout sessions with exercises and sets. Use this to understand their training history, volume, and progression before suggesting a new workout.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of recent sessions to return (default 5, max 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_workout",
    description:
      "Create a workout session in the database. Use this ONLY after the user has approved the workout plan you suggested. Include all exercises with their sets.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Workout name (e.g. 'Push Day', 'Upper Body Strength')",
        },
        notes: {
          type: "string",
          description: "Optional workout notes or focus areas",
        },
        exercises: {
          type: "array",
          description: "Ordered list of exercises with their sets",
          items: {
            type: "object",
            properties: {
              exerciseId: {
                type: "string",
                description: "UUID of the exercise from the exercise library",
              },
              notes: {
                type: "string",
                description: "Optional notes for this exercise (e.g. tempo, rest period)",
              },
              sets: {
                type: "array",
                description: "Sets for this exercise",
                items: {
                  type: "object",
                  properties: {
                    weight: {
                      type: "number",
                      description: "Weight in lbs (null for bodyweight)",
                    },
                    reps: {
                      type: "number",
                      description: "Target rep count",
                    },
                    setType: {
                      type: "string",
                      enum: ["warmup", "working", "drop", "failure"],
                      description: "Type of set (default: working)",
                    },
                  },
                  required: ["reps"],
                },
              },
            },
            required: ["exerciseId", "sets"],
          },
        },
      },
      required: ["name", "exercises"],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

interface ListExercisesInput {
  muscleGroup?: string;
  search?: string;
}

interface GetRecentWorkoutsInput {
  limit?: number;
}

interface CreateWorkoutInput {
  name: string;
  notes?: string;
  exercises: Array<{
    exerciseId: string;
    notes?: string;
    sets: Array<{
      weight?: number;
      reps: number;
      setType?: string;
    }>;
  }>;
}

export async function executeFitnessTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "list_exercises":
      return listExercises(toolInput as unknown as ListExercisesInput);
    case "get_recent_workouts":
      return getRecentWorkouts(toolInput as unknown as GetRecentWorkoutsInput);
    case "create_workout":
      return createWorkout(toolInput as unknown as CreateWorkoutInput);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

async function listExercises(input: ListExercisesInput): Promise<string> {
  const where: Record<string, unknown> = { isActive: true };
  if (input.muscleGroup) where.muscleGroup = input.muscleGroup;
  if (input.search) where.name = { contains: input.search, mode: "insensitive" };

  const exercises = await prisma.exercise.findMany({
    where,
    select: { id: true, name: true, muscleGroup: true, equipment: true },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    take: 50,
  });

  return JSON.stringify({ exercises, count: exercises.length });
}

async function getRecentWorkouts(input: GetRecentWorkoutsInput): Promise<string> {
  const limit = Math.min(input.limit || 5, 20);

  const sessions = await prisma.workoutSession.findMany({
    include: {
      exercises: {
        include: {
          exercise: { select: { name: true, muscleGroup: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { performedAt: "desc" },
    take: limit,
  });

  const summary = sessions.map((s) => ({
    name: s.name,
    date: s.performedAt.toISOString().split("T")[0],
    durationMinutes: s.durationMinutes,
    source: s.source,
    exercises: s.exercises.map((ex) => ({
      name: ex.exercise.name,
      muscleGroup: ex.exercise.muscleGroup,
      sets: ex.sets.map((set) => ({
        weight: set.weight ? Number(set.weight) : null,
        reps: set.reps,
        rpe: set.rpe,
        type: set.setType,
      })),
    })),
  }));

  return JSON.stringify({ sessions: summary, count: summary.length });
}

async function createWorkout(input: CreateWorkoutInput): Promise<string> {
  // Validate all exercise IDs exist
  const exerciseIds = input.exercises.map((e) => e.exerciseId);
  const existingExercises = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds }, isActive: true },
    select: { id: true, name: true },
  });

  const existingIds = new Set(existingExercises.map((e) => e.id));
  const missingIds = exerciseIds.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    return JSON.stringify({
      error: `Exercise IDs not found: ${missingIds.join(", ")}. Use list_exercises to find valid IDs.`,
    });
  }

  const session = await prisma.workoutSession.create({
    data: {
      name: input.name,
      performedAt: new Date(),
      notes: input.notes,
      source: "claude",
      exercises: {
        create: input.exercises.map((ex, idx) => ({
          exerciseId: ex.exerciseId,
          sortOrder: idx,
          notes: ex.notes,
          sets: {
            create: ex.sets.map((s, setIdx) => ({
              setNumber: setIdx + 1,
              weight: s.weight ?? null,
              reps: s.reps,
              setType: s.setType || "working",
              isCompleted: false,
            })),
          },
        })),
      },
    },
    include: {
      exercises: {
        include: {
          exercise: { select: { name: true, muscleGroup: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const summary = {
    id: session.id,
    name: session.name,
    createdAt: session.createdAt.toISOString(),
    exercises: session.exercises.map((ex) => ({
      name: ex.exercise.name,
      sets: ex.sets.length,
    })),
  };

  return JSON.stringify({ success: true, workout: summary });
}
