import { NextRequest, NextResponse } from "next/server";
import { executeAgency } from "@/lib/agency";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Cron: Ayden's autonomous agency session.
 * Runs every 3 hours via Vercel cron.
 * Ayden reviews her values, interests, and context, then decides
 * whether to take autonomous action (research, email, write, trade, or reflect).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executeAgency({ reason: "Scheduled agency session", source: "cron" });
    const errSuffix = result.errors.length > 0 ? ` errors=${result.errors.join(" | ")}` : "";
    console.log(
      `[agency-cron] acted=${result.acted} action=${result.action || "none"} summary=${(result.summary || "").substring(0, 200)}${errSuffix}`
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[agency-cron] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Agency cron failed: ${msg}` }, { status: 500 });
  }
}
