import { NextRequest, NextResponse } from "next/server";
import { validateSlackSignature, sendSlackMessage } from "@/lib/slack";
import { runAyden, saveChannelExchange } from "@/lib/ayden";
import type { AydenImage } from "@/lib/ayden";

export const dynamic = "force-dynamic";

// Vercel function timeout — give ourselves enough time for Claude + tools
export const maxDuration = 60;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/** Download a Slack file using bot token auth, return base64-encoded image */
async function downloadSlackFile(
  urlPrivate: string,
  mimetype: string
): Promise<AydenImage | null> {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      console.error("Slack image download: SLACK_BOT_TOKEN not set");
      return null;
    }

    const res = await fetch(urlPrivate, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error(`Slack image download failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return { base64, mediaType: mimetype };
  } catch (error) {
    console.error("Slack image download error:", error);
    return null;
  }
}

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
    // Allow file_share subtype so we can process image attachments
    if (event.type !== "message" || (event.subtype && event.subtype !== "file_share")) {
      return NextResponse.json({ ok: true });
    }

    // Ignore bot messages (prevents infinite loop)
    if (event.bot_id || event.bot_profile) {
      return NextResponse.json({ ok: true });
    }

    const text = event.text || "";
    const channel = event.channel;

    // Download image files if present
    const images: AydenImage[] = [];
    if (Array.isArray(event.files) && event.files.length > 0) {
      const downloadPromises: Promise<void>[] = [];
      for (const file of event.files) {
        const mimetype = file.mimetype || "";
        if (file.url_private && SUPPORTED_IMAGE_TYPES.has(mimetype)) {
          downloadPromises.push(
            downloadSlackFile(file.url_private, mimetype).then((result) => {
              if (result) images.push(result);
            })
          );
        } else if (file.url_private) {
          console.log(`Slack: skipping unsupported file type: ${mimetype}`);
        }
      }
      await Promise.all(downloadPromises);
    }

    // Empty message with no images — ignore
    if (!text.trim() && images.length === 0) {
      return NextResponse.json({ ok: true });
    }

    console.log(`Slack from Trey: "${text.substring(0, 50)}..."${images.length > 0 ? ` + ${images.length} image(s)` : ""}`);

    // Process and respond. Slack will retry (which we ignore above) if this takes > 3s,
    // but the original request keeps running on Vercel until completion.
    try {
      const response = await runAyden("Slack", text, images.length > 0 ? images : undefined);

      const slackResponse = response.length > 4000
        ? response.substring(0, 3997) + "..."
        : response;

      const savedUserMsg = images.length > 0
        ? `${text}${text ? " " : ""}[${images.length} image${images.length > 1 ? "s" : ""} attached]`
        : text;
      await saveChannelExchange("Slack", savedUserMsg, slackResponse);
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
