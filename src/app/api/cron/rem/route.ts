import { NextRequest, NextResponse } from "next/server";
import { runRemCycle } from "@/lib/rem";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Nightly REM cycle — runs at 4:30am ET via Vercel cron
// Analyzes 24h behavioral patterns and applies tiny epigenetic
// expression shifts to DNA traits. Genes don't change; expression does.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[rem-cron] Auth failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runRemCycle();

    if (result.shifts.length > 0) {
      const summary = result.shifts
        .map(
          (s) =>
            `${s.trait}: ${s.oldExpression.toFixed(3)} → ${s.newExpression.toFixed(3)} (${s.delta > 0 ? "+" : ""}${s.delta.toFixed(3)})`
        )
        .join(", ");
      console.log(`[rem-cron] Epigenetic shifts: ${summary}`);
    } else {
      console.log("[rem-cron] No epigenetic shifts tonight");
    }

    console.log(
      `[rem-cron] Signals: ${result.signalsUsed.conversations} msgs, ${result.signalsUsed.emotions} emotions, ${result.signalsUsed.agencyActions} actions`
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[rem-cron] Error:", error);
    return NextResponse.json(
      { error: "Failed to run REM cycle" },
      { status: 500 }
    );
  }
}
