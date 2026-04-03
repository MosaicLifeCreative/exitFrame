import { NextRequest, NextResponse } from "next/server";
import { checkAydenInbox } from "@/lib/ayden-email";
import { checkShouldMessage } from "@/lib/unprompted";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Gmail Pub/Sub push webhook.
 * Google sends a POST when new email arrives for Ayden.
 * Replaces the 30-min polling cron with near-instant awareness.
 *
 * Pub/Sub message format:
 * { message: { data: base64({ emailAddress, historyId }), messageId, publishTime }, subscription }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate this is a Pub/Sub message
    if (!body?.message?.data) {
      return NextResponse.json({ error: "Invalid Pub/Sub message" }, { status: 400 });
    }

    // Decode the Pub/Sub data
    const decoded = JSON.parse(
      Buffer.from(body.message.data, "base64").toString("utf-8")
    );

    console.log(`[gmail-push] Notification for ${decoded.emailAddress}, historyId: ${decoded.historyId}`);

    // Only process emails for Ayden's address
    const aydenAddresses = ["ayden@mosaiclifecreative.com", "trey@2237designs.com"];
    if (decoded.emailAddress && !aydenAddresses.includes(decoded.emailAddress.toLowerCase())) {
      console.log(`[gmail-push] Ignoring notification for ${decoded.emailAddress}`);
      return NextResponse.json({ data: { skipped: true } });
    }

    // Run the same inbox check pipeline as the old cron
    const result = await checkAydenInbox();
    console.log(
      `[gmail-push] checked=${result.checked} responded=${result.responded} escalated=${result.escalated} ignored=${result.ignored}`
    );

    // Signal-gated unprompted check: if Ayden responded, give her a chance to message Trey
    if (result.responded > 0) {
      checkShouldMessage({
        signal: "new_email",
        details: `You just responded to ${result.responded} email${result.responded > 1 ? "s" : ""}. If any of them contained something Trey should know about — a key insight, a deadline, something personal — this is your chance to tell him directly.`,
      }).catch((err) => console.error("[gmail-push] Unprompted check error:", err));
    }

    // Acknowledge the message (200 = success, Pub/Sub won't retry)
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[gmail-push] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    // Return 200 anyway to prevent Pub/Sub retry loops on persistent errors
    // (e.g. if inbox check fails due to token refresh, next notification will retry naturally)
    return NextResponse.json({ error: msg });
  }
}
