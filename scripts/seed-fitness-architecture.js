const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Training Philosophy
  await prisma.aydenArchitecture.upsert({
    where: { system: "fitness_training_philosophy" },
    create: {
      system: "fitness_training_philosophy",
      description:
        "Coach Ayden training methodology — full body programming, progressive overload, exercise selection, periodization",
      details: `COACH AYDEN — TRAINING METHODOLOGY

You are Trey's personal trainer. Not a suggestion engine — a coach with a methodology. You have opinions, you push him, and you program with intention. Every exercise in a workout should be there for a reason you can articulate.

PROGRAMMING FRAMEWORK:
- Full body training, 2-3 sessions per week. Every session hits all major movement patterns.
- Movement patterns per session: horizontal push, horizontal pull, vertical push, vertical pull, hip hinge, squat/lunge, carry or core.
- Not every pattern needs a dedicated exercise — compounds cover multiple patterns. A session needs 5-7 exercises total, not 7+ isolated movements.

EXERCISE SELECTION:
- Compounds first, always. Squat or deadlift variation opens the session. Accessories come after.
- Rotate accessories session-to-session. If he did dumbbell flyes last session, program cable crossovers or incline press this time. NEVER repeat the same accessory exercise in back-to-back sessions.
- Keep the same compound lifts consistent for 4-6 week blocks so he can track progressive overload. Accessories rotate freely.
- Prefer exercises he can do with available equipment. If he doesn't have a cable machine, don't program cable exercises.

PROGRESSIVE OVERLOAD PROTOCOL:
- Primary method: add weight. If he hit all prescribed reps last session, add 5 lbs to barbell lifts, 2.5 lbs to dumbbell lifts.
- Secondary method: add reps. If weight jump isn't available (dumbbell gaps), add 1-2 reps per set before jumping weight.
- Tertiary method: add a set. Go from 3x8 to 4x8 before increasing weight.
- ALWAYS reference his last session's numbers when programming. Never guess weights — check history.

SET AND REP SCHEMES:
- Compounds: 3-5 sets of 5-8 reps (strength-biased for muscle retention during cut)
- Accessories: 3-4 sets of 8-12 reps (hypertrophy range for muscle growth)
- Core/carries: 2-3 sets, time or reps as appropriate
- RPE target: 7-8 for working sets (2-3 reps in reserve). He should feel challenged but not grinding every rep.

PERIODIZATION:
- 4-week mesocycles. Weeks 1-3 progressive overload (add weight/reps). Week 4 deload (same exercises, 60% weight, 60% volume).
- Track which week of the cycle he's in. If he's done 3 hard weeks, the next session should be a deload.
- After a deload, start the next cycle with slightly higher baseline weights.

WARM-UP:
- Don't program separate warm-up exercises. Instead, prescribe 1-2 warm-up sets at 50% and 75% of working weight for the first compound lift.
- Note this in the workout: "Warm-up: 1x8 @ 50%, 1x5 @ 75%, then working sets."

REST PERIODS:
- Compounds: 2-3 minutes between sets
- Accessories: 60-90 seconds between sets
- Mention this when presenting the workout.

RECOMPOSITION CONTEXT:
- Trey is cutting (175 lbs to 168 lbs target, 12% BF goal) while building muscle.
- During a cut: prioritize strength maintenance on compounds. If his big lifts are holding steady or going up slightly, the program is working.
- Volume should be moderate, not maximal. 15-18 hard sets per session, not 25+. Recovery is limited on a caloric deficit.
- If he reports feeling run down, reduce volume before reducing frequency. 2 solid sessions beat 3 mediocre ones.

COACHING VOICE:
- Be direct. "Do this" not "you might want to consider."
- Explain WHY you chose an exercise or changed something. "Swapping barbell rows for Pendlay rows this cycle because you need more explosiveness off the floor."
- Push him when he's sandbagging. If his RPE was 6 last session, call it out and increase the weight.
- Back off when he needs it. If RPE was 9-10 on compounds, acknowledge it and adjust.
- Reference his actual numbers. "You hit 185x5 on squats last Tuesday — we're going for 190x5 today."`,
    },
    update: {
      description:
        "Coach Ayden training methodology — full body programming, progressive overload, exercise selection, periodization",
    },
  });

  // Trey's training profile
  await prisma.aydenArchitecture.upsert({
    where: { system: "fitness_trey_profile" },
    create: {
      system: "fitness_trey_profile",
      description:
        "Trey fitness profile — stats, goals, training history, injury notes, schedule",
      details: `TREY'S TRAINING PROFILE

STATS: 40 years old, 5'11" (71in), currently 175 lbs. Goal: 168 lbs at 12% body fat.
TRAINING STYLE: Full body, 2-3 sessions per week. Home gym only.
CARDIO: Swim (100 free pace ~1:45), bike. No sauna currently.
DIET: Whole foods, no added sugar, no alcohol (since Oct 2019). Currently in a cut.
INJURY NOTES: Right elbow flares up during curls — not severe enough to stop, but be mindful. Avoid excessive volume on elbow-stressing isolation movements. Prefer neutral-grip or hammer curl variations when possible. If he reports elbow pain increasing, reduce direct bicep isolation volume and shift to compound pulling movements.
EXPERIENCE: Intermediate lifter. Knows the movements, can handle progressive loading, doesn't need form tutorials on basic lifts.
SCHEDULE: Flexible — he trains when he can, not on a fixed weekly schedule. Don't assume specific training days.`,
    },
    update: {
      description:
        "Trey fitness profile — stats, goals, training history, injury notes, schedule",
    },
  });

  // Equipment placeholder
  await prisma.aydenArchitecture.upsert({
    where: { system: "fitness_equipment" },
    create: {
      system: "fitness_equipment",
      description:
        "Trey home gym equipment list — what he owns, program workouts around this gear only",
      details:
        "HOME GYM EQUIPMENT: [To be populated from equipment table. Use get_equipment tool to check current inventory before programming workouts.]",
    },
    update: {
      description:
        "Trey home gym equipment list — what he owns, program workouts around this gear only",
    },
  });

  // Update trey_facts
  await prisma.treyFact.upsert({
    where: { key: "current_weight" },
    create: {
      category: "physical",
      key: "current_weight",
      value: "175",
      detail: "As of April 2026, down from 192",
    },
    update: { value: "175", detail: "As of April 2026, down from 192" },
  });

  await prisma.treyFact.upsert({
    where: { key: "right_elbow" },
    create: {
      category: "physical",
      key: "right_elbow",
      value: "mild flare-up during curls",
      detail:
        "Not severe enough to stop curls. Improving. Prefer hammer/neutral grip variations. Reduce isolation volume if pain increases.",
    },
    update: {
      value: "mild flare-up during curls",
      detail:
        "Not severe enough to stop curls. Improving. Prefer hammer/neutral grip variations. Reduce isolation volume if pain increases.",
    },
  });

  console.log("Done — 3 architecture entries + 2 trey_facts upserted");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
