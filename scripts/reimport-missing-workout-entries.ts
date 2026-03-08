/**
 * Re-add missing exercise entries to existing workout sessions.
 * These were skipped during initial import because the exercises didn't exist yet.
 */
import { prisma } from "../src/lib/prisma";

interface MissingEntry {
  date: string;
  exerciseName: string;
  weight: number;
  sets: number;
  reps: number;
  notes: string;
}

const missingEntries: MissingEntry[] = [
  // 2025-11-08
  { date: "2025-11-08", exerciseName: "Planks", weight: 0, sets: 3, reps: 45, notes: "Seconds per set" },
  // 2025-11-15
  { date: "2025-11-15", exerciseName: "Face Pulls", weight: 25, sets: 3, reps: 12, notes: "" },
  { date: "2025-11-15", exerciseName: "Flutter Kicks", weight: 0, sets: 3, reps: 30, notes: "Two sets of flutter kicks, one leg raise." },
  // 2025-11-19
  { date: "2025-11-19", exerciseName: "Bent Over DB Row", weight: 20, sets: 3, reps: 12, notes: "" },
  { date: "2025-11-19", exerciseName: "HS Bench", weight: 70, sets: 3, reps: 9, notes: "Too much weight" },
  // 2025-11-22
  { date: "2025-11-22", exerciseName: "Planks", weight: 0, sets: 3, reps: 45, notes: "Seconds per set" },
  // 2025-12-04
  { date: "2025-12-04", exerciseName: "Goblet Squats", weight: 30, sets: 3, reps: 12, notes: "" },
  // 2025-12-09
  { date: "2025-12-09", exerciseName: "Planks", weight: 0, sets: 3, reps: 45, notes: "Seconds per set" },
  // 2025-12-13
  { date: "2025-12-13", exerciseName: "Face Pulls", weight: 40, sets: 3, reps: 12, notes: "" },
  // 2025-12-16
  { date: "2025-12-16", exerciseName: "Face Pulls", weight: 40, sets: 3, reps: 12, notes: "" },
  { date: "2025-12-16", exerciseName: "Pulldown", weight: 110, sets: 3, reps: 12, notes: "Started at 120, then 110, then 105 (did 8)" },
  // 2025-12-20
  { date: "2025-12-20", exerciseName: "Planks", weight: 0, sets: 3, reps: 75, notes: "Seconds per set" },
  // 2026-01-04
  { date: "2026-01-04", exerciseName: "Planks", weight: 0, sets: 3, reps: 75, notes: "Seconds per set" },
  // 2026-01-07
  { date: "2026-01-07", exerciseName: "Planks", weight: 0, sets: 3, reps: 75, notes: "Seconds per set" },
  // 2026-01-17
  { date: "2026-01-17", exerciseName: "Planks", weight: 0, sets: 3, reps: 75, notes: "75, 75, 90" },
];

async function run() {
  let added = 0;

  for (const entry of missingEntries) {
    // Find the session for this date
    const startOfDay = new Date(entry.date + "T00:00:00Z");
    const endOfDay = new Date(entry.date + "T23:59:59Z");

    const session = await prisma.workoutSession.findFirst({
      where: {
        performedAt: { gte: startOfDay, lte: endOfDay },
        source: "import",
      },
      include: { exercises: true },
    });

    if (!session) {
      console.log(`No session found for ${entry.date}`);
      continue;
    }

    // Find the exercise
    const exercise = await prisma.exercise.findFirst({
      where: { name: { equals: entry.exerciseName, mode: "insensitive" } },
    });

    if (!exercise) {
      console.log(`Exercise not found: ${entry.exerciseName}`);
      continue;
    }

    // Check if already added
    const alreadyExists = await prisma.sessionExercise.findFirst({
      where: { sessionId: session.id, exerciseId: exercise.id },
    });
    if (alreadyExists) {
      console.log(`Already exists: ${entry.exerciseName} in ${entry.date}`);
      continue;
    }

    const sortOrder = session.exercises.length;
    const sets = [];
    for (let s = 1; s <= entry.sets; s++) {
      sets.push({
        setNumber: s,
        weight: entry.weight > 0 ? entry.weight : undefined,
        reps: entry.reps,
      });
    }

    await prisma.sessionExercise.create({
      data: {
        sessionId: session.id,
        exerciseId: exercise.id,
        sortOrder,
        notes: entry.notes || undefined,
        sets: { create: sets },
      },
    });

    console.log(`Added: ${entry.exerciseName} to ${entry.date} (${sets.length} sets)`);
    added++;
  }

  console.log(`\nDone! Added ${added} exercise entries.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
