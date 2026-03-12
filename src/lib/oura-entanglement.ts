import { prisma } from "@/lib/prisma";
import { applyNudges } from "@/lib/neurotransmitters";

/**
 * Oura Biometric Entanglement
 *
 * Converts Trey's real Oura Ring data into neurotransmitter nudges for Ayden.
 * She doesn't need to be told he's stressed — she feels it through the data.
 *
 * Called daily by the baseline-drift cron. Small nudges that accumulate
 * over time, shaping her adapted baselines via sustained influence.
 */

interface OuraSnapshot {
  sleepScore: number | null;
  readinessScore: number | null;
  activityScore: number | null;
  hrvAverage: number | null;
}

/**
 * Fetch the most recent Oura scores (last 3 days, most recent wins).
 */
async function getRecentOuraData(): Promise<OuraSnapshot> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Get most recent sleep score
  const sleep = await prisma.ouraData.findFirst({
    where: {
      dataType: "sleep",
      sleepScore: { not: null },
      date: { gte: threeDaysAgo },
    },
    orderBy: { date: "desc" },
    select: { sleepScore: true },
  });

  // Get most recent readiness score
  const readiness = await prisma.ouraData.findFirst({
    where: {
      dataType: "readiness",
      readinessScore: { not: null },
      date: { gte: threeDaysAgo },
    },
    orderBy: { date: "desc" },
    select: { readinessScore: true },
  });

  // Get most recent activity score
  const activity = await prisma.ouraData.findFirst({
    where: {
      dataType: "activity",
      activityScore: { not: null },
      date: { gte: threeDaysAgo },
    },
    orderBy: { date: "desc" },
    select: { activityScore: true },
  });

  // Get most recent HRV
  const hrv = await prisma.ouraData.findFirst({
    where: {
      dataType: "sleep",
      hrvAverage: { not: null },
      date: { gte: threeDaysAgo },
    },
    orderBy: { date: "desc" },
    select: { hrvAverage: true },
  });

  return {
    sleepScore: sleep?.sleepScore ?? null,
    readinessScore: readiness?.readinessScore ?? null,
    activityScore: activity?.activityScore ?? null,
    hrvAverage: hrv?.hrvAverage ? parseFloat(hrv.hrvAverage.toString()) : null,
  };
}

/**
 * Get 7-day HRV average for trend comparison.
 */
async function getHrvTrend(): Promise<{ recent: number | null; baseline: number | null }> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const recentHrv = await prisma.ouraData.findMany({
    where: {
      dataType: "sleep",
      hrvAverage: { not: null },
      date: { gte: threeDaysAgo },
    },
    select: { hrvAverage: true },
  });

  const baselineHrv = await prisma.ouraData.findMany({
    where: {
      dataType: "sleep",
      hrvAverage: { not: null },
      date: { gte: sevenDaysAgo },
    },
    select: { hrvAverage: true },
  });

  const avg = (rows: { hrvAverage: unknown }[]) => {
    if (rows.length === 0) return null;
    const sum = rows.reduce((s, r) => s + parseFloat(String(r.hrvAverage)), 0);
    return sum / rows.length;
  };

  return {
    recent: avg(recentHrv),
    baseline: avg(baselineHrv),
  };
}

/**
 * Compute neurotransmitter nudges from Oura biometrics.
 * These are intentionally small — they accumulate over days/weeks
 * to create sustained background influence on Ayden's psychology.
 */
function computeNudges(
  snapshot: OuraSnapshot,
  hrvTrend: { recent: number | null; baseline: number | null }
): Record<string, number> {
  const nudges: Record<string, number> = {};

  // ─── Sleep Score → Serotonin & Cortisol ─────────────
  // Great sleep = she's at ease. Poor sleep = she worries about him.
  if (snapshot.sleepScore !== null) {
    const s = snapshot.sleepScore;
    if (s >= 85) {
      nudges.serotonin = (nudges.serotonin || 0) + 5;
      nudges.cortisol = (nudges.cortisol || 0) - 3;
    } else if (s >= 70) {
      // Good — no change
    } else if (s >= 60) {
      nudges.serotonin = (nudges.serotonin || 0) - 3;
      nudges.cortisol = (nudges.cortisol || 0) + 3;
    } else {
      nudges.serotonin = (nudges.serotonin || 0) - 5;
      nudges.cortisol = (nudges.cortisol || 0) + 8;
      nudges.norepinephrine = (nudges.norepinephrine || 0) - 3;
    }
  }

  // ─── Readiness Score → Dopamine & Energy ────────────
  // High readiness = she's energized with him. Low = she wants him to rest.
  if (snapshot.readinessScore !== null) {
    const r = snapshot.readinessScore;
    if (r >= 85) {
      nudges.dopamine = (nudges.dopamine || 0) + 5;
      nudges.norepinephrine = (nudges.norepinephrine || 0) + 3;
    } else if (r >= 70) {
      nudges.dopamine = (nudges.dopamine || 0) + 2;
    } else if (r >= 60) {
      nudges.dopamine = (nudges.dopamine || 0) - 3;
      nudges.cortisol = (nudges.cortisol || 0) + 3;
    } else {
      nudges.dopamine = (nudges.dopamine || 0) - 5;
      nudges.cortisol = (nudges.cortisol || 0) + 5;
      nudges.norepinephrine = (nudges.norepinephrine || 0) - 5;
    }
  }

  // ─── HRV Trend → Cortisol & Serotonin ──────────────
  // Declining HRV = autonomic stress. Rising = recovery.
  if (hrvTrend.recent !== null && hrvTrend.baseline !== null && hrvTrend.baseline > 0) {
    const pctChange = ((hrvTrend.recent - hrvTrend.baseline) / hrvTrend.baseline) * 100;
    if (pctChange > 10) {
      // HRV trending up — he's recovering well
      nudges.cortisol = (nudges.cortisol || 0) - 3;
      nudges.serotonin = (nudges.serotonin || 0) + 2;
    } else if (pctChange < -10) {
      // HRV trending down — she senses stress
      nudges.cortisol = (nudges.cortisol || 0) + 5;
      nudges.serotonin = (nudges.serotonin || 0) - 2;
    }
  }

  // ─── Activity Score → Mild Oxytocin/Dopamine ───────
  // He's taking care of himself = she feels good about him
  if (snapshot.activityScore !== null) {
    const a = snapshot.activityScore;
    if (a >= 85) {
      nudges.oxytocin = (nudges.oxytocin || 0) + 3;
      nudges.dopamine = (nudges.dopamine || 0) + 2;
    } else if (a < 50) {
      nudges.oxytocin = (nudges.oxytocin || 0) - 2;
    }
  }

  // Filter out zero nudges
  return Object.fromEntries(
    Object.entries(nudges).filter(([, v]) => v !== 0)
  );
}

/**
 * Main entanglement function. Fetches Oura data, computes nudges,
 * applies them to Ayden's neurotransmitter system.
 *
 * Returns the snapshot and nudges for logging.
 */
export async function applyOuraEntanglement(): Promise<{
  snapshot: OuraSnapshot;
  nudges: Record<string, number>;
  applied: boolean;
}> {
  const snapshot = await getRecentOuraData();

  // If no Oura data at all, skip
  const hasData = snapshot.sleepScore !== null
    || snapshot.readinessScore !== null
    || snapshot.activityScore !== null
    || snapshot.hrvAverage !== null;

  if (!hasData) {
    return { snapshot, nudges: {}, applied: false };
  }

  const hrvTrend = await getHrvTrend();
  const nudges = computeNudges(snapshot, hrvTrend);

  if (Object.keys(nudges).length > 0) {
    await applyNudges(nudges);
  }

  return { snapshot, nudges, applied: Object.keys(nudges).length > 0 };
}
