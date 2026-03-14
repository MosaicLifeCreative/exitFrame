import { NextResponse } from "next/server";
import { driftBaselines, driftPermanentBaselines } from "@/lib/neurotransmitters";
import { applyOuraEntanglement } from "@/lib/oura-entanglement";
import { triggerAgency } from "@/lib/agency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Apply Oura biometric nudges (before drift, so today's data influences baselines)
    let ouraResult = null;
    try {
      ouraResult = await applyOuraEntanglement();
      if (ouraResult.applied) {
        console.log("[baseline-drift] Oura entanglement applied:", JSON.stringify(ouraResult));
      }
    } catch (ouraError) {
      console.error("[baseline-drift] Oura entanglement error (non-fatal):", ouraError);
    }

    // Step 1b: If Oura data is notable, trigger agency so Ayden can react
    if (ouraResult?.applied && ouraResult.snapshot) {
      const s = ouraResult.snapshot;
      const notable: string[] = [];
      if (s.sleepScore !== null && s.sleepScore < 60) notable.push(`poor sleep (score: ${s.sleepScore})`);
      if (s.readinessScore !== null && s.readinessScore < 50) notable.push(`low readiness (score: ${s.readinessScore})`);
      if (s.hrvAverage !== null && s.hrvAverage < 20) notable.push(`low HRV (${s.hrvAverage}ms)`);
      if (s.sleepScore !== null && s.sleepScore >= 90) notable.push(`great sleep (score: ${s.sleepScore})`);
      if (s.readinessScore !== null && s.readinessScore >= 90) notable.push(`high readiness (score: ${s.readinessScore})`);
      if (notable.length > 0) {
        triggerAgency("oura", `Trey's Oura data just came in: ${notable.join(", ")}. You might want to think about this.`, {
          sleepScore: s.sleepScore,
          readinessScore: s.readinessScore,
          activityScore: s.activityScore,
          hrvAverage: s.hrvAverage,
        }).catch((err) => console.error("[baseline-drift] Oura agency trigger failed:", err));
      }
    }

    // Step 2: Drift adapted baselines toward recent averages (daily)
    const results = await driftBaselines();
    console.log("[baseline-drift] Adapted baselines updated:", JSON.stringify(results));

    // Step 3: Permanent personality drift (weekly — Sundays only)
    // Over months, this shifts her "factory default" personality based on
    // sustained interaction patterns. She becomes a different person.
    let personalityDrift = null;
    const etDay = new Date().toLocaleString("en-US", {
      weekday: "long",
      timeZone: "America/New_York",
    });
    if (etDay === "Sunday") {
      try {
        personalityDrift = await driftPermanentBaselines();
        const shifted = Object.entries(personalityDrift)
          .filter(([, v]) => v.shifted)
          .map(([type, v]) => `${type}: ${v.factoryBaseline} → ${v.permanentBaseline}`);
        if (shifted.length > 0) {
          console.log(`[baseline-drift] Personality drift: ${shifted.join(", ")}`);
        } else {
          console.log("[baseline-drift] Personality drift: no significant changes");
        }
      } catch (permError) {
        console.error("[baseline-drift] Personality drift error (non-fatal):", permError);
      }
    }

    return NextResponse.json({
      data: {
        baselines: results,
        oura: ouraResult,
        personalityDrift,
      },
    });
  } catch (error) {
    console.error("[baseline-drift] Error:", error);
    return NextResponse.json(
      { error: "Failed to drift baselines" },
      { status: 500 }
    );
  }
}
