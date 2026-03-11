import { prisma } from "@/lib/prisma";

/**
 * Fetches user preferences and formats them as a compact context string
 * for injection into Claude's system prompt on every page.
 */
export async function getUserPreferencesContext(): Promise<string> {
  try {
    const profile = await prisma.userProfile.findFirst({
      select: { preferences: true },
    });

    if (!profile?.preferences) return "";

    const prefs = profile.preferences as Record<string, Record<string, string>>;
    const p = prefs.profile || {};
    const h = prefs.health || {};
    const f = prefs.fitness || {};
    const l = prefs.lifestyle || {};

    // Check if any data exists
    if (!p.name && !h.weightCurrent && !f.trainingModes) return "";

    const lines: string[] = [];

    // Profile
    if (p.name) {
      const parts = [p.name];
      if (p.gender) parts.push(p.gender);
      if (p.birthday) {
        const age = Math.floor(
          (Date.now() - new Date(p.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        parts.push(`${age}y`);
      }
      if (p.heightInches) {
        const ft = Math.floor(Number(p.heightInches) / 12);
        const inches = Number(p.heightInches) % 12;
        parts.push(`${ft}'${inches}"`);
      }
      lines.push(`Profile: ${parts.join(", ")}`);
    }

    // Health
    const healthParts: string[] = [];
    if (h.weightCurrent) {
      let w = `${h.weightCurrent} lbs`;
      if (h.weightGoal) w += ` (goal: ${h.weightGoal} lbs)`;
      if (h.bodyFatGoal) w += ` / ${h.bodyFatGoal}% BF`;
      healthParts.push(w);
    }
    if (h.bloodPressure) healthParts.push(`BP ${h.bloodPressure}`);
    if (healthParts.length > 0) lines.push(`Health: ${healthParts.join(", ")}`);

    // Sleep
    const sleepParts: string[] = [];
    if (h.sleepTargetBedtime && h.sleepTargetWake) {
      sleepParts.push(`${formatTime(h.sleepTargetBedtime)} - ${formatTime(h.sleepTargetWake)}`);
    }
    if (h.sleepTargetHours) sleepParts.push(`target ${h.sleepTargetHours} hrs`);
    if (sleepParts.length > 0) lines.push(`Sleep: ${sleepParts.join(", ")}`);

    // Diet & Habits
    const habitParts: string[] = [];
    if (h.dietPattern) habitParts.push(h.dietPattern);
    if (h.alcoholStatus) habitParts.push(`Alcohol: ${h.alcoholStatus}`);
    if (h.caffeineIntake) habitParts.push(h.caffeineIntake);
    if (h.saunaFrequency) habitParts.push(`Sauna: ${h.saunaFrequency}`);
    if (h.bathingHabit) habitParts.push(h.bathingHabit);
    if (habitParts.length > 0) lines.push(`Habits: ${habitParts.join(". ")}`);

    // Fitness
    const fitParts: string[] = [];
    if (f.trainingModes) fitParts.push(f.trainingModes);
    if (f.workoutStyle) fitParts.push(`${f.workoutStyle} style`);
    if (f.weeklyFrequency) fitParts.push(f.weeklyFrequency);
    if (fitParts.length > 0) lines.push(`Training: ${fitParts.join(", ")}`);

    // Cardio details
    const cardioParts: string[] = [];
    if (f.cardioSwimming) cardioParts.push(`Swimming: ${f.cardioSwimming}`);
    if (f.cardioRunning) cardioParts.push(`Running: ${f.cardioRunning}`);
    if (f.cardioBiking) cardioParts.push(`Biking: ${f.cardioBiking}`);
    if (cardioParts.length > 0) lines.push(`Cardio: ${cardioParts.join(". ")}`);

    // Fitness goals
    if (f.fitnessGoals) lines.push(`Fitness goals: ${f.fitnessGoals}`);
    if (f.weakPoints) lines.push(`Weak points: ${f.weakPoints}`);

    // Trading
    const t = prefs.trading || {};
    const tradingParts: string[] = [];
    if (t.riskTolerance) tradingParts.push(`Risk: ${t.riskTolerance}`);
    if (t.maxPositionSizePct) tradingParts.push(`Max position: ${t.maxPositionSizePct}%`);
    if (t.maxPortfolioRiskPct) tradingParts.push(`Max portfolio risk: ${t.maxPortfolioRiskPct}%`);
    if (tradingParts.length > 0) lines.push(`Trading: ${tradingParts.join(", ")}`);
    if (t.preferredStrategies) lines.push(`Preferred strategies: ${t.preferredStrategies}`);
    if (t.preferredUnderlyings) lines.push(`Preferred underlyings: ${t.preferredUnderlyings}`);
    if (t.avoidSectors) lines.push(`Avoid: ${t.avoidSectors}`);
    if (t.tradingNotes) lines.push(`Trading notes: ${t.tradingNotes}`);

    // Lifestyle
    if (l.workSchedule) lines.push(`Work: ${l.workSchedule}`);
    if (l.notes) lines.push(`Notes: ${l.notes}`);

    return lines.length > 0 ? lines.join("\n") : "";
  } catch (error) {
    console.error("Failed to load user preferences:", error);
    return "";
  }
}

function formatTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}
