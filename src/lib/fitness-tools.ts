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
    name: "create_exercise",
    description:
      "Add a new exercise to the exercise library. Use this when the user mentions an exercise that doesn't exist in the library. Always search with list_exercises first to avoid duplicates.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Exercise name (e.g. 'Bulgarian Split Squat', 'Face Pull')",
        },
        muscleGroup: {
          type: "string",
          enum: [
            "chest",
            "back",
            "shoulders",
            "arms",
            "biceps",
            "triceps",
            "legs",
            "glutes",
            "core",
            "cardio",
            "power_explosive",
            "stretching_mobility",
          ],
          description: "Primary muscle group this exercise targets",
        },
        equipment: {
          type: "string",
          enum: [
            "none",
            "barbell",
            "dumbbell",
            "cable_machine",
            "machine",
            "bodyweight",
            "pull_up_bar",
            "resistance_band",
            "mat",
            "curl_bar",
            "landmine",
            "trap_bar",
            "medicine_ball",
            "bosu_ball",
            "step_bench",
            "wall",
            "kettlebell",
            "smith_machine",
            "foam_roller",
            "suspension_trainer",
          ],
          description: "Equipment required (default: none)",
        },
        instructions: {
          type: "string",
          description:
            "Optional brief instructions or cues for proper form",
        },
      },
      required: ["name", "muscleGroup"],
    },
  },
  {
    name: "create_workout",
    description:
      "Save a workout plan to the database. Use this ONLY after the user has approved the workout plan you suggested. Ask the user whether they want it saved as a reusable template or as a one-time session ready to perform.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Workout name (e.g. 'Push Day', 'Full Body - Recovery')",
        },
        saveAs: {
          type: "string",
          enum: ["template", "session"],
          description:
            "How to save: 'template' creates a reusable workout template (appears in Templates tab), 'session' creates a one-time workout session ready to perform (appears in History tab as incomplete). Always ask the user which they prefer.",
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
      required: ["name", "saveAs", "exercises"],
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

interface CreateExerciseInput {
  name: string;
  muscleGroup: string;
  equipment?: string;
  instructions?: string;
}

interface CreateWorkoutInput {
  name: string;
  saveAs: "template" | "session";
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
    case "create_exercise":
      return createExercise(toolInput as unknown as CreateExerciseInput);
    case "create_workout":
      return createWorkout(toolInput as unknown as CreateWorkoutInput);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

async function createExercise(input: CreateExerciseInput): Promise<string> {
  // Check for duplicate name
  const existing = await prisma.exercise.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
    select: { id: true, name: true, isActive: true },
  });

  if (existing) {
    if (!existing.isActive) {
      // Reactivate soft-deleted exercise
      await prisma.exercise.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      return JSON.stringify({
        success: true,
        exercise: { id: existing.id, name: existing.name },
        message: `"${existing.name}" was previously deleted and has been reactivated.`,
      });
    }
    return JSON.stringify({
      error: `Exercise "${existing.name}" already exists (ID: ${existing.id}). Use this ID in workouts.`,
    });
  }

  const exercise = await prisma.exercise.create({
    data: {
      name: input.name,
      muscleGroup: input.muscleGroup,
      equipment: input.equipment || "none",
      instructions: input.instructions || null,
    },
    select: { id: true, name: true, muscleGroup: true, equipment: true },
  });

  return JSON.stringify({
    success: true,
    exercise,
    message: `Exercise "${exercise.name}" added to the library. You can now use ID ${exercise.id} in workouts.`,
  });
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

  if (input.saveAs === "template") {
    return createTemplate(input);
  }
  return createSession(input);
}

async function createTemplate(input: CreateWorkoutInput): Promise<string> {
  const template = await prisma.workoutTemplate.create({
    data: {
      name: input.name,
      description: input.notes,
      exercises: {
        create: input.exercises.map((ex, idx) => {
          // Use first set's values as defaults for the template
          const firstSet = ex.sets[0];
          return {
            exerciseId: ex.exerciseId,
            sortOrder: idx,
            defaultSets: ex.sets.length,
            defaultReps: firstSet?.reps ?? 10,
            defaultWeight: firstSet?.weight ?? null,
            notes: ex.notes,
          };
        }),
      },
    },
    include: {
      exercises: {
        include: { exercise: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const summary = {
    id: template.id,
    name: template.name,
    savedAs: "template" as const,
    message: "Template saved! You can start it from the Templates tab.",
    exercises: template.exercises.map((ex) => ({
      name: ex.exercise.name,
      sets: ex.defaultSets,
      reps: ex.defaultReps,
      weight: ex.defaultWeight ? Number(ex.defaultWeight) : null,
    })),
  };

  return JSON.stringify({ success: true, workout: summary });
}

async function createSession(input: CreateWorkoutInput): Promise<string> {
  // Look up exercise names for the draft
  const exerciseIds = input.exercises.map((e) => e.exerciseId);
  const exerciseLookup = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(exerciseLookup.map((e) => [e.id, e.name]));

  // Return as a draft — the frontend will load it into the Log tab
  const draft = {
    name: input.name,
    notes: input.notes || "",
    exercises: input.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: nameMap.get(ex.exerciseId) || "Unknown",
      notes: ex.notes || "",
      sets: ex.sets.map((s, idx) => ({
        setNumber: idx + 1,
        weight: s.weight?.toString() || "",
        reps: s.reps.toString(),
        rpe: "",
        setType: s.setType || "working",
      })),
    })),
  };

  return JSON.stringify({
    success: true,
    draft: true,
    workout: draft,
    message: "Workout loaded into your Log tab — edit anything before saving.",
  });
}
