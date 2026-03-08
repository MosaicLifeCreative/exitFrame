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
