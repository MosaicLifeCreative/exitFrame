import twilio from "twilio";
import crypto from "crypto";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER!;
const myNumber = process.env.TWILIO_MY_NUMBER!;

/**
 * Get a Twilio client instance.
 */
function getClient() {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(accountSid, authToken);
}

/**
 * Send an SMS to Trey's phone number.
 */
export async function sendSms(body: string, to?: string): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({
    body,
    from: twilioNumber,
    to: to || myNumber,
  });
  return message.sid;
}

/**
 * Validate that an incoming webhook request is actually from Twilio.
 * Uses HMAC-SHA1 signature validation per Twilio's spec.
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  if (!authToken) return false;

  // Build the data string: URL + sorted params concatenated as key+value
  let data = url;
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const computed = crypto
    .createHmac("sha1", authToken)
    .update(data, "utf-8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(computed, "utf-8"),
    Buffer.from(signature, "utf-8")
  );
}

/**
 * Check if a phone number is Trey's authorized number.
 */
export function isAuthorizedSender(from: string): boolean {
  if (!myNumber) return false;
  // Normalize: strip spaces, dashes
  const normalize = (n: string) => n.replace(/[\s-]/g, "");
  return normalize(from) === normalize(myNumber);
}

/**
 * Check if Twilio env vars are configured.
 */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && twilioNumber && myNumber);
}

/**
 * Download MMS media from Twilio's CDN.
 * Twilio media URLs require HTTP Basic Auth (accountSid:authToken).
 * Returns base64-encoded image data and the media type.
 */
export async function downloadMmsMedia(
  mediaUrl: string
): Promise<{ base64: string; mediaType: string } | null> {
  if (!accountSid || !authToken) return null;

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${auth}` },
      redirect: "follow",
    });

    if (!res.ok) {
      console.error(`MMS download failed: HTTP ${res.status} for ${mediaUrl}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString("base64");

    return { base64, mediaType: contentType };
  } catch (err) {
    console.error("MMS download error:", err);
    return null;
  }
}

/** Supported image types for Claude vision */
const VISION_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function isVisionSupported(mediaType: string): boolean {
  return VISION_MEDIA_TYPES.has(mediaType);
}

/**
 * Send an MMS (image + optional text) to Trey's phone number.
 */
export async function sendMms(
  body: string,
  mediaUrls: string[],
  to?: string
): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({
    body: body || "",
    from: twilioNumber,
    to: to || myNumber,
    mediaUrl: mediaUrls,
  });
  return message.sid;
}
