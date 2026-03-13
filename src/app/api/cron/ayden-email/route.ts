import { NextRequest, NextResponse } from "next/server";
import { checkAydenInbox } from "@/lib/ayden-email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron: Check Ayden's inbox for new emails.
 * Runs every 15 minutes via Vercel cron.
 * Haiku triage → Sonnet auto-respond (known contacts) or push notify (unknown).
 */
export async function GET(request: NextRequest) {
  // Verify cron auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAydenInbox();
    console.log(
      `[ayden-email-cron] checked=${result.checked} responded=${result.responded} escalated=${result.escalated} ignored=${result.ignored}`
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[ayden-email-cron] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Ayden email cron failed: ${msg}` }, { status: 500 });
  }
}
