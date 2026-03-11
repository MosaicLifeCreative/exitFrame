import { NextRequest, NextResponse } from "next/server";
import { validateTwilioSignature, isAuthorizedSender, sendSms, downloadMmsMedia, isVisionSupported } from "@/lib/twilio";
import { runAyden, saveChannelExchange } from "@/lib/ayden";
import type { AydenImage } from "@/lib/ayden";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const SMS_MAX_LENGTH = 1500;
const SAFETY_TIMEOUT_MS = 170_000; // 170s — leaves 10s buffer before Vercel's 180s maxDuration

/**
 * POST handler for Twilio SMS webhook.
 * Twilio sends form-urlencoded POST with From, To, Body, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const from = params.From || "";
    const body = params.Body || "";

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === "production") {
      const signature = request.headers.get("X-Twilio-Signature") || "";
      const url = request.url;

      if (!validateTwilioSignature(url, params, signature)) {
        console.error("Twilio webhook: invalid signature");
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Only respond to Trey's number — forward unknown senders as a notification
    if (!isAuthorizedSender(from)) {
      console.log(`Twilio webhook: unauthorized sender ${from}`);
      if (body.trim()) {
        try {
          const preview = body.length > 300 ? body.substring(0, 300) + "..." : body;
          await sendSms(`SMS from ${from}:\n${preview}`);
        } catch (err) {
          console.error("Failed to forward unknown sender SMS:", err);
        }
      }
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // SMS-to-Ayden disabled — keep webhook alive for client forwarding
    if (process.env.SMS_AYDEN_ENABLED !== "true") {
      console.log("SMS: Ayden disabled, ignoring authorized sender message");
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Download MMS media if present
    const numMedia = parseInt(params.NumMedia || "0", 10);
    const images: AydenImage[] = [];
    if (numMedia > 0) {
      const downloadPromises: Promise<void>[] = [];
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = params[`MediaUrl${i}`];
        const mediaType = params[`MediaContentType${i}`] || "";
        if (mediaUrl && isVisionSupported(mediaType)) {
          downloadPromises.push(
            downloadMmsMedia(mediaUrl).then((result) => {
              if (result) images.push(result);
            })
          );
        } else if (mediaUrl) {
          console.log(`MMS: skipping unsupported media type: ${mediaType}`);
        }
      }
      await Promise.all(downloadPromises);
    }

    // Empty message with no images — ignore
    if (!body.trim() && images.length === 0) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Image-only MMS needs fallback text for Claude
    const messageText = body.trim()
      ? body
      : "What do you think of this?";

    console.log(`SMS from Trey: "${messageText.substring(0, 50)}..."${images.length > 0 ? ` + ${images.length} image(s)` : ""}`);

    // Race Ayden against a safety timer (same pattern as Slack)
    const emptyTwiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    let safetyFired = false;

    const response = await Promise.race([
      runAyden("SMS", messageText, images.length > 0 ? images : undefined),
      new Promise<null>((resolve) =>
        setTimeout(async () => {
          safetyFired = true;
          console.warn("SMS: safety timer fired — sending timeout message before Vercel kills the function");
          try {
            await sendSms("That's taking me longer than usual and I'm about to get cut off. Try again — or simplify the question.");
          } catch (err) {
            console.error("Failed to send safety timeout SMS:", err);
          }
          resolve(null);
        }, SAFETY_TIMEOUT_MS)
      ),
    ]);

    if (safetyFired || response === null) {
      return new NextResponse(emptyTwiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Truncate if needed
    const smsResponse = response.length > SMS_MAX_LENGTH
      ? response.substring(0, SMS_MAX_LENGTH - 3) + "..."
      : response;

    // Save the exchange to DB (note image attachments in stored message)
    const savedUserMsg = images.length > 0
      ? `${body.trim() || "[no caption]"} [${images.length} image${images.length > 1 ? "s" : ""} attached]`
      : body;
    await saveChannelExchange("SMS", savedUserMsg, smsResponse);

    // Send response via API (more reliable than TwiML for long messages)
    await sendSms(smsResponse);

    // Return empty TwiML (we already sent the response via API)
    return new NextResponse(emptyTwiml, { headers: { "Content-Type": "text/xml" } });
  } catch (error) {
    console.error("Twilio webhook error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);

    // Context-aware error messages (matching Slack's approach)
    let userErrorMsg = "Something went wrong on my end. Try again in a sec.";
    if (errMsg.includes("timeout") || errMsg.includes("FUNCTION_INVOCATION_TIMEOUT")) {
      userErrorMsg = "That took too long and timed out. Try a simpler question or try again.";
    } else if (errMsg.includes("429") || errMsg.includes("rate")) {
      userErrorMsg = "I'm being rate-limited right now. Give me a minute and try again.";
    } else if (errMsg.includes("500") || errMsg.includes("529") || errMsg.includes("overloaded")) {
      userErrorMsg = "The AI service is having issues right now. Try again in a bit.";
    }

    try {
      await sendSms(userErrorMsg);
    } catch {
      // Can't even send error SMS — just log
    }

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
