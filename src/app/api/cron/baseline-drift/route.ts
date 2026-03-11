import { NextResponse } from "next/server";
import { driftBaselines } from "@/lib/neurotransmitters";
import { applyOuraEntanglement } from "@/lib/oura-entanglement";

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

    // Step 2: Drift adapted baselines toward recent averages
    const results = await driftBaselines();
    console.log("[baseline-drift] Adapted baselines updated:", JSON.stringify(results));

    return NextResponse.json({
      data: {
        baselines: results,
        oura: ouraResult,
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
