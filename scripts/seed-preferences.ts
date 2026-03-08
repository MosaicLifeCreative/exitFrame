/**
 * Seed user preferences from Notion Key Health Metrics data.
 * Run: npx tsx scripts/seed-preferences.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PREFERENCES = {
  profile: {
    name: "Trey Kauffman",
    birthday: "1985-08-07",
    heightInches: "71",
    gender: "male",
  },
  health: {
    weightCurrent: "192.6",
    weightGoal: "168",
    bodyFatGoal: "12",
    bloodPressure: "108/71",
    sleepTargetBedtime: "22:30",
    sleepTargetWake: "06:45",
    sleepTargetHours: "7-8",
    dietPattern: "Whole foods, no added sugars. 1-1.5 servings per meal.",
    alcoholStatus: "None since October 19, 2019",
    caffeineIntake: "2 cups/day, black coffee only, high quality beans ground fresh each morning",
    bathingHabit: "Cold showers for close to a decade. 90% cold water, warm at the end.",
    saunaFrequency: "3x/week, 20-25 min in sauna after each swim workout",
  },
  fitness: {
    trainingModes: "Swim, Lift, Bike",
    weeklyFrequency: "2-3x lifting",
    workoutStyle: "Full Body",
    weakPoints: "",
    cardioSwimming: "Primary cardio. Details TBD.",
    cardioRunning: "Occasional",
    cardioBiking: "Road and mountain biking",
    fitnessGoals: "12% body fat at 168 lbs. Maintain strength while cutting.",
  },
  lifestyle: {
    workSchedule: "",
    notes: "",
  },
};

async function seed() {
  // Find or create the user profile
  let profile = await prisma.userProfile.findFirst();

  if (profile) {
    // Merge with existing preferences
    const existing = (profile.preferences as Record<string, unknown>) || {};
    const merged = { ...existing, ...PREFERENCES };

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        displayName: "Trey Kauffman",
        preferences: merged,
      },
    });
    console.log("Updated existing profile with preferences.");
  } else {
    profile = await prisma.userProfile.create({
      data: {
        authUserId: "single-user",
        displayName: "Trey Kauffman",
        preferences: PREFERENCES,
      },
    });
    console.log("Created new profile with preferences.");
  }

  console.log("Done! Profile ID:", profile.id);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
