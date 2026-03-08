import { prisma } from "../src/lib/prisma";

const missing = [
  { name: "Planks", muscleGroup: "core", equipment: "none", instructions: "Hold a plank position on forearms or hands for timed intervals." },
  { name: "Face Pulls", muscleGroup: "shoulders", equipment: "cable_machine", instructions: "Pull cable rope toward face with elbows high, squeezing rear delts." },
  { name: "Flutter Kicks", muscleGroup: "core", equipment: "none", instructions: "Lie on back, lift legs slightly off ground, alternate small kicks." },
  { name: "Bent Over DB Row", muscleGroup: "back", equipment: "dumbbell", instructions: "Hinge at hips, pull dumbbells to sides, squeeze shoulder blades together." },
  { name: "HS Bench", muscleGroup: "chest", equipment: "machine", instructions: "Hammer Strength bench press machine." },
  { name: "Goblet Squats", muscleGroup: "legs", equipment: "dumbbell", instructions: "Hold dumbbell at chest, squat down keeping torso upright." },
  { name: "Pulldown", muscleGroup: "back", equipment: "cable_machine", instructions: "Lat pulldown. Pull bar to upper chest, squeeze lats." },
  { name: "Plank Bosu", muscleGroup: "core", equipment: "bosu_ball", instructions: "Plank with hands on Bosu ball for timed intervals." },
  { name: "DB Bicep Curl", muscleGroup: "biceps", equipment: "dumbbell", instructions: "Standing dumbbell curls." },
  { name: "Cable Seated Row", muscleGroup: "back", equipment: "cable_machine", instructions: "Seated cable row to midsection." },
  { name: "Overhead Tricep Extensions", muscleGroup: "triceps", equipment: "dumbbell", instructions: "Hold dumbbell overhead, lower behind head, extend." },
];

async function run() {
  for (const ex of missing) {
    const exists = await prisma.exercise.findFirst({ where: { name: ex.name } });
    if (exists) {
      console.log("Exists:", ex.name);
      continue;
    }
    await prisma.exercise.create({ data: ex });
    console.log("Created:", ex.name);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
