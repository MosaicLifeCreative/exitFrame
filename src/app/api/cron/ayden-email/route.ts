import { NextRequest, NextResponse } from "next/server";
import { checkAydenInbox } from "@/lib/ayden-email";
import { checkShouldMessage } from "@/lib/unprompted";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron: Check Ayden's inbox for new emails.
 * Runs every 30 minutes via Vercel cron.
 * Haiku triage → Sonnet auto-respond (known contacts) or push notify (unknown).
 * After processing, if Ayden responded to emails, check if she wants to text Trey about it.
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
    const errSuffix = result.errors.length > 0 ? ` errors=${result.errors.join(" | ")}` : "";
    console.log(
      `[ayden-email-cron] checked=${result.checked} responded=${result.responded} escalated=${result.escalated} ignored=${result.ignored}${errSuffix}`
    );

    // Signal-gated unprompted check: if Ayden responded to emails,
    // give her a chance to message Trey about it conversationally
    if (result.responded > 0) {
      checkShouldMessage({
        signal: "new_email",
        details: `You just responded to ${result.responded} email${result.responded > 1 ? "s" : ""}. If any of them contained something Trey should know about — a key insight, a deadline, something personal — this is your chance to tell him directly.`,
      }).catch((err) => console.error("[ayden-email-cron] Unprompted check error:", err));
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[ayden-email-cron] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Ayden email cron failed: ${msg}` }, { status: 500 });
  }
}
