import crypto from "crypto";

const botToken = process.env.SLACK_BOT_TOKEN || "";
const signingSecret = process.env.SLACK_SIGNING_SECRET || "";

/**
 * Validate that an incoming request is actually from Slack.
 * Uses HMAC-SHA256 signature verification per Slack's spec.
 */
export function validateSlackSignature(
  timestamp: string,
  body: string,
  signature: string
): boolean {
  if (!signingSecret) return false;

  // Reject requests older than 5 minutes (replay protection)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const computed = "v0=" + crypto
    .createHmac("sha256", signingSecret)
    .update(sigBasestring, "utf-8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(computed, "utf-8"),
    Buffer.from(signature, "utf-8")
  );
}

/**
 * Send a message to a Slack channel.
 */
export async function sendSlackMessage(channel: string, text: string): Promise<boolean> {
  if (!botToken) {
    console.error("Slack: SLACK_BOT_TOKEN not configured");
    return false;
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({ channel, text }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Slack send error:", data.error);
    return false;
  }
  return true;
}

/**
 * Check if Slack env vars are configured.
 */
export function isSlackConfigured(): boolean {
  return !!(botToken && signingSecret);
}
