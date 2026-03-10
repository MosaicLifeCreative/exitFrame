import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { validateSlackSignature, sendSlackMessage } from "@/lib/slack";
import { runAyden, saveChannelExchange } from "@/lib/ayden";
import type { AydenImage } from "@/lib/ayden";

export const dynamic = "force-dynamic";

// waitUntil keeps the function alive after the response is sent.
// Pro plan: up to 300s. Safety timer fires at 170s as a last resort.
export const maxDuration = 180;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB limit for Anthropic API

/** Download a Slack file using bot token auth, return base64-encoded image */
async function downloadSlackFile(
  urlPrivate: string,
  mimetype: string,
  fileSize?: number
): Promise<AydenImage | null> {
  try {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      console.error("Slack image download: SLACK_BOT_TOKEN not set");
      return null;
    }

    // Skip files that are too large (Slack provides size in bytes)
    if (fileSize && fileSize > MAX_IMAGE_BYTES) {
      console.log(`Slack: skipping large image (${(fileSize / 1024 / 1024).toFixed(1)}MB > 5MB limit)`);
      return null;
    }

    const res = await fetch(urlPrivate, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error(`Slack image download failed: ${res.status} ${res.statusText} for ${urlPrivate.substring(0, 80)}`);
      return null;
    }

    // Verify the response is actually an image (not an HTML auth redirect)
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      console.error(`Slack image download: unexpected content-type "${contentType}" (expected image/*) — likely auth/scope issue`);
      return null;
    }

    const buffer = await res.arrayBuffer();

    // Double-check actual size after download
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      console.log(`Slack: downloaded image too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
      return null;
    }

    if (buffer.byteLength === 0) {
      console.error("Slack: downloaded image is empty (0 bytes)");
      return null;
    }

    const base64 = Buffer.from(buffer).toString("base64");
    return { base64, mediaType: mimetype };
  } catch (error) {
    console.error("Slack image download error:", error);
    return null;
  }
}

/**
 * Race Ayden against a safety timer. On Vercel Hobby (60s hard cap),
 * waitUntil background work gets killed silently — no catch block fires.
 * This ensures Trey always gets a response before the function dies.
 */
const SAFETY_TIMEOUT_MS = 170_000; // 170s — leaves 10s buffer before Vercel's 180s maxDuration

function withSafetyTimer<T>(
  work: Promise<T>,
  onTimeout: () => Promise<void>
): Promise<{ result: T; timedOut: false } | { timedOut: true }> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(async () => {
      if (!settled) {
        settled = true;
        await onTimeout();
        resolve({ timedOut: true });
      }
    }, SAFETY_TIMEOUT_MS);

    work
      .then((result) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ result, timedOut: false });
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err); // Propagate to outer catch in processSlackMessage
        }
      });
  });
}

/**
 * Process a Slack message in the background (via waitUntil).
 * Downloads images, runs Ayden, sends the response back to Slack.
 * Includes a safety timer to send a fallback message before Vercel's 60s kill.
 */
async function processSlackMessage(
  text: string,
  channel: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files?: any[]
): Promise<void> {
  try {
    // Download image files if present
    const images: AydenImage[] = [];
    let fileCount = 0;
    if (Array.isArray(files) && files.length > 0) {
      fileCount = files.length;
      const downloadPromises: Promise<void>[] = [];
      for (const file of files) {
        const mimetype = file.mimetype || "";
        if (file.url_private && SUPPORTED_IMAGE_TYPES.has(mimetype)) {
          downloadPromises.push(
            downloadSlackFile(file.url_private, mimetype, file.size).then((result) => {
              if (result) images.push(result);
            })
          );
        } else if (file.url_private) {
          console.log(`Slack: skipping unsupported file type: ${mimetype} (${file.name || "unnamed"})`);
        }
      }
      await Promise.all(downloadPromises);

      if (fileCount > 0 && images.length === 0) {
        console.log(`Slack: ${fileCount} file(s) sent but none were downloadable images`);
      } else if (images.length < fileCount) {
        console.log(`Slack: ${images.length}/${fileCount} images downloaded successfully`);
      }
    }

    // Empty message with no images — nothing to do
    if (!text.trim() && images.length === 0) {
      return;
    }

    // Image-only messages need fallback text for Claude
    const messageText = text.trim()
      ? text
      : "What do you think of this?";

    console.log(`Slack from Trey: "${messageText.substring(0, 50)}..."${images.length > 0 ? ` + ${images.length} image(s)` : ""}`);

    if (images.length > 0) {
      console.log(`Slack: sending ${images.length} image(s) to Ayden — sizes: ${images.map((img) => `${(img.base64.length * 0.75 / 1024).toFixed(0)}KB (${img.mediaType})`).join(", ")}`);
    }

    // Race Ayden against the safety timer
    const race = await withSafetyTimer(
      runAyden("Slack", messageText, images.length > 0 ? images : undefined),
      async () => {
        console.warn("Slack: safety timer fired — sending timeout message before Vercel kills the function");
        try {
          await sendSlackMessage(
            channel,
            "That's taking me longer than usual and I'm about to get cut off. Try again — or if it was a heavy question, break it into smaller pieces."
          );
        } catch (err) {
          console.error("Failed to send safety timeout message:", err);
        }
      }
    );

    if (race.timedOut) {
      return; // Safety message already sent, nothing more we can do
    }

    const response = race.result;

    const slackResponse = response.length > 4000
      ? response.substring(0, 3997) + "..."
      : response;

    const savedUserMsg = images.length > 0
      ? `${text.trim() || "[no caption]"} [${images.length} image${images.length > 1 ? "s" : ""} attached]`
      : text;
    await saveChannelExchange("Slack", savedUserMsg, slackResponse);
    await sendSlackMessage(channel, slackResponse);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error(`Slack Ayden error: ${errMsg}`);
    if (errStack) console.error(`Stack: ${errStack}`);
    if (error && typeof error === "object" && "status" in error) {
      console.error(`API status: ${(error as { status: number }).status}`);
    }

    // Send specific error hint to Slack so Trey knows what happened
    let userErrorMsg = "Something went wrong on my end.";
    if (errMsg.includes("timeout") || errMsg.includes("FUNCTION_INVOCATION_TIMEOUT")) {
      userErrorMsg = "That took too long and timed out. Try a simpler question or try again.";
    } else if (errMsg.includes("429") || errMsg.includes("rate")) {
      userErrorMsg = "I'm being rate-limited right now. Give me a minute and try again.";
    } else if (errMsg.includes("500") || errMsg.includes("529") || errMsg.includes("overloaded")) {
      userErrorMsg = "The AI service is having issues right now. Try again in a bit.";
    }

    try {
      await sendSlackMessage(channel, userErrorMsg);
    } catch (slackErr) {
      console.error("Failed to send error message to Slack:", slackErr);
    }
  }
}

/**
 * POST handler for Slack Events API webhook.
 *
 * Returns 200 immediately and processes the message in the background via waitUntil.
 * This prevents Slack retries and Vercel 504 timeouts for tool-heavy requests.
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

  // Event callback — validate then process in background
  if (payload.type === "event_callback") {
    const event = payload.event;

    // Only handle messages (not subtypes like bot messages, edits, etc.)
    // Allow file_share subtype so we can process image attachments
    if (event.type !== "message" || (event.subtype && event.subtype !== "file_share")) {
      console.log(`Slack webhook: skipping event type="${event.type}" subtype="${event.subtype || "none"}"`);
      return NextResponse.json({ ok: true });
    }

    // Ignore bot messages (prevents infinite loop)
    if (event.bot_id || event.bot_profile) {
      return NextResponse.json({ ok: true });
    }

    const text = event.text || "";
    const channel = event.channel;

    // Skip empty messages with no files
    if (!text.trim() && (!Array.isArray(event.files) || event.files.length === 0)) {
      return NextResponse.json({ ok: true });
    }

    // Respond to Slack immediately, process in the background
    waitUntil(processSlackMessage(text, channel, event.files));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
