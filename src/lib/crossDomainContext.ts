import { prisma } from "@/lib/prisma";

/**
 * Builds a compact cross-domain context string for Claude.
 * Queries key metrics from all domains concurrently.
 * ~200-400 tokens — small enough to include in every system prompt.
 *
 * The `currentPage` parameter lets us skip the domain the user is already
 * viewing (since page-specific data is injected separately with more detail).
 */
export async function getCrossDomainContext(currentPage?: string): Promise<string> {
  const sections: string[] = [];

  const [
    sleepData,
    activeSymptoms,
    supplementCount,
    lastWorkout,
    workoutsThisWeek,
    lastCardio,
    latestBloodwork,
    activeGoals,
    portfolioValue,
  ] = await Promise.all([
    // Sleep / Oura — last night's scores
    currentPage === "Sleep"
      ? Promise.resolve(null)
      : prisma.ouraData.findMany({
          where: {
            dataType: { in: ["sleep", "readiness", "activity"] },
          },
          orderBy: { date: "desc" },
          take: 3, // One per type, most recent date
          select: {
            dataType: true,
            sleepScore: true,
            readinessScore: true,
            activityScore: true,
            hrvAverage: true,
            date: true,
          },
        }),

    // Active (unresolved) symptoms
    currentPage === "Health"
      ? Promise.resolve([])
      : prisma.symptomLog.findMany({
          where: { resolved: false },
          orderBy: { date: "desc" },
          take: 3,
          select: { symptoms: true, severity: true, date: true },
        }),

    // Active supplement count
    currentPage === "Supplements"
      ? Promise.resolve(0)
      : prisma.supplement.count({ where: { isActive: true } }),

    // Last lifting workout
    currentPage === "Fitness"
      ? Promise.resolve(null)
      : prisma.workoutSession.findFirst({
          where: { source: { not: "draft" } },
          orderBy: { performedAt: "desc" },
          select: { name: true, performedAt: true },
        }),

    // Workouts this week
    currentPage === "Fitness"
      ? Promise.resolve(0)
      : prisma.workoutSession.count({
          where: {
            source: { not: "draft" },
            performedAt: { gte: getStartOfWeek() },
          },
        }),

    // Last cardio session
    currentPage === "Fitness"
      ? Promise.resolve(null)
      : prisma.cardioSession.findFirst({
          orderBy: { performedAt: "desc" },
          select: { activityType: true, performedAt: true, durationMinutes: true },
        }),

    // Latest bloodwork panel + flagged count
    currentPage === "Bloodwork"
      ? Promise.resolve(null)
      : prisma.bloodworkPanel.findFirst({
          orderBy: { date: "desc" },
          select: {
            name: true,
            date: true,
            markers: {
              where: { isFlagged: true },
              select: { id: true },
            },
          },
        }),

    // Active goals summary
    currentPage === "Goals"
      ? Promise.resolve([])
      : prisma.goal.findMany({
          where: { status: "active" },
          select: {
            title: true,
            category: true,
            goalType: true,
            currentValue: true,
            targetValue: true,
            unit: true,
            targetDate: true,
          },
        }),

    // Portfolio holdings count
    currentPage === "Investing"
      ? Promise.resolve(0)
      : prisma.portfolioHolding.count({ where: { isActive: true } }),
  ]);

  // --- Format sections ---

  // Sleep / Recovery
  if (sleepData && sleepData.length > 0) {
    const sleep = sleepData.find((d) => d.dataType === "sleep");
    const readiness = sleepData.find((d) => d.dataType === "readiness");
    const activity = sleepData.find((d) => d.dataType === "activity");
    const parts: string[] = [];
    if (sleep?.sleepScore) parts.push(`Sleep: ${sleep.sleepScore}`);
    if (readiness?.readinessScore) parts.push(`Readiness: ${readiness.readinessScore}`);
    if (activity?.activityScore) parts.push(`Activity: ${activity.activityScore}`);
    if (sleep?.hrvAverage) parts.push(`HRV: ${parseFloat(String(sleep.hrvAverage))}ms`);
    if (parts.length > 0) {
      const date = sleep?.date || readiness?.date;
      const dateStr = date ? ` (${formatDate(date)})` : "";
      sections.push(`Sleep/Recovery${dateStr}: ${parts.join(", ")}`);
    }
  }

  // Active symptoms
  if (activeSymptoms.length > 0) {
    const symptomList = activeSymptoms
      .map((s) => `${s.symptoms.join(", ")} (severity ${s.severity}, ${formatDate(s.date)})`)
      .join("; ");
    sections.push(`Active symptoms: ${symptomList}`);
  }

  // Supplements
  if (typeof supplementCount === "number" && supplementCount > 0) {
    sections.push(`Supplements: ${supplementCount} active`);
  }

  // Fitness
  if (lastWorkout || lastCardio || workoutsThisWeek) {
    const fitParts: string[] = [];
    if (typeof workoutsThisWeek === "number") fitParts.push(`${workoutsThisWeek} lifting sessions this week`);
    if (lastWorkout) fitParts.push(`Last: ${lastWorkout.name} (${formatDate(lastWorkout.performedAt)})`);
    if (lastCardio) fitParts.push(`Last cardio: ${lastCardio.activityType} (${formatDate(lastCardio.performedAt)})`);
    if (fitParts.length > 0) sections.push(`Fitness: ${fitParts.join(". ")}`);
  }

  // Bloodwork
  if (latestBloodwork) {
    const flaggedCount = latestBloodwork.markers?.length || 0;
    const flagStr = flaggedCount > 0 ? `, ${flaggedCount} flagged markers` : "";
    sections.push(`Latest bloodwork: ${latestBloodwork.name} (${formatDate(latestBloodwork.date)})${flagStr}`);
  }

  // Goals
  if (activeGoals.length > 0) {
    const goalLines = activeGoals.map((g) => {
      let progress = "";
      if (g.goalType === "quantitative" && g.currentValue != null && g.targetValue != null) {
        progress = ` — ${parseFloat(String(g.currentValue))}/${parseFloat(String(g.targetValue))} ${g.unit || ""}`.trim();
      }
      const deadline = g.targetDate ? ` by ${formatDate(g.targetDate)}` : "";
      return `${g.title} [${g.category}]${progress}${deadline}`;
    });
    sections.push(`Active goals (${activeGoals.length}): ${goalLines.join("; ")}`);
  }

  // Investing
  if (typeof portfolioValue === "number" && portfolioValue > 0) {
    sections.push(`Portfolio: ${portfolioValue} active holdings`);
  }

  if (sections.length === 0) return "";

  return `Cross-domain snapshot (other modules):\n${sections.map((s) => `- ${s}`).join("\n")}`;
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
