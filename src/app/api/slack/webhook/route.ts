import { NextRequest, NextResponse } from "next/server";
import { validateSlackSignature, sendSlackMessage } from "@/lib/slack";
import { runAyden, saveChannelExchange } from "@/lib/ayden";

export const dynamic = "force-dynamic";

// Vercel function timeout — give ourselves enough time for Claude + tools
export const maxDuration = 60;

/**
 * POST handler for Slack Events API webhook.
 * Handles: url_verification challenge, message events.
 *
 * Slack retries events if it doesn't get a 200 within 3 seconds.
 * We ignore retries (X-Slack-Retry-Num header) and let the original request complete.
 * On Vercel serverless, the function keeps running after sending the response
 * for the remainder of its timeout, so fire-and-forget works reliably.
 */
export async function POST(request: NextRequest) {
  // Slack retries — if this is a retry, we're already processing the original
  const retryNum = request.headers.get("X-Slack-Retry-Num");
  if (retryNum) {
    console.log(`Slack webhook: ignoring retry #${retryNum}`);
    return NextResponse.json({ ok: true });
  }

  const rawBody = await request.text();

  // Validate Slack signature in production
  if (process.env.NODE_ENV === "production") {
    const timestamp = request.headers.get("X-Slack-Request-Timestamp") || "";
    const signature = request.headers.get("X-Slack-Signature") || "";

    if (!validateSlackSignature(timestamp, rawBody, signature)) {
      console.error("Slack webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // URL verification challenge (Slack sends this when setting up Event Subscriptions)
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Event callback — process the event
  if (payload.type === "event_callback") {
    const event = payload.event;

    // Only handle messages (not subtypes like bot messages, edits, etc.)
    if (event.type !== "message" || event.subtype) {
      return NextResponse.json({ ok: true });
    }

    // Ignore bot messages (prevents infinite loop)
    if (event.bot_id || event.bot_profile) {
      return NextResponse.json({ ok: true });
    }

    const text = event.text || "";
    const channel = event.channel;

    // Empty message — ignore
    if (!text.trim()) {
      return NextResponse.json({ ok: true });
    }

    console.log(`Slack from Trey: "${text.substring(0, 50)}..."`);

    // Process and respond. Slack will retry (which we ignore above) if this takes > 3s,
    // but the original request keeps running on Vercel until completion.
    try {
      const response = await runAyden("Slack", text);

      const slackResponse = response.length > 4000
        ? response.substring(0, 3997) + "..."
        : response;

      await saveChannelExchange("Slack", text, slackResponse);
      await sendSlackMessage(channel, slackResponse);
    } catch (error) {
      console.error("Slack Ayden error:", error);
      try {
        await sendSlackMessage(channel, "Something went wrong on my end. Try again in a sec.");
      } catch {
        // Can't send to Slack — just log
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
