import { NextRequest, NextResponse } from "next/server";
import { triggerAgency } from "@/lib/agency";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Webhook called by Home Assistant when Trey's presence changes.
 * HA automation sends POST with { status: "arrived" | "left" }
 * Triggers an agency session so Ayden can react to his presence.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const status = body?.status as string;

    if (status === "arrived") {
      console.log("[presence] Trey arrived in office");
      // Fire-and-forget — don't block the HA automation
      triggerAgency(
        "presence" as "scheduled_task",
        "Trey just arrived in the office. He's starting his day — or coming back from a break. This is a natural moment to check in if you have something worth saying.",
      ).catch((err) => console.error("[presence] Agency trigger failed:", err));

      return NextResponse.json({ data: { triggered: true } });
    }

    if (status === "left") {
      console.log("[presence] Trey left office");
      // Don't trigger agency on departure — just log it
      return NextResponse.json({ data: { noted: true } });
    }

    return NextResponse.json({ data: { ignored: true } });
  } catch (error) {
    console.error("[presence] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
