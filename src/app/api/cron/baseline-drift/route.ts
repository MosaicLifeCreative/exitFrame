import { NextResponse } from "next/server";
import { driftBaselines } from "@/lib/neurotransmitters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await driftBaselines();
    console.log("[baseline-drift] Adapted baselines updated:", JSON.stringify(results));
    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("[baseline-drift] Error:", error);
    return NextResponse.json(
      { error: "Failed to drift baselines" },
      { status: 500 }
    );
  }
}
