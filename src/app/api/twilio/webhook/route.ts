import { NextRequest, NextResponse } from "next/server";
import { validateTwilioSignature, isAuthorizedSender, sendSms, downloadMmsMedia, isVisionSupported } from "@/lib/twilio";
import { runAyden, saveChannelExchange } from "@/lib/ayden";
import type { AydenImage } from "@/lib/ayden";

export const dynamic = "force-dynamic";

const SMS_MAX_LENGTH = 1500;

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

    console.log(`SMS from Trey: "${body.substring(0, 50)}..."${images.length > 0 ? ` + ${images.length} image(s)` : ""}`);

    // Run through Ayden (shared core)
    const response = await runAyden("SMS", body, images.length > 0 ? images : undefined);

    // Truncate if needed
    const smsResponse = response.length > SMS_MAX_LENGTH
      ? response.substring(0, SMS_MAX_LENGTH - 3) + "..."
      : response;

    // Save the exchange to DB (note image attachments in stored message)
    const savedUserMsg = images.length > 0
      ? `${body}${body ? " " : ""}[${images.length} image${images.length > 1 ? "s" : ""} attached]`
      : body;
    await saveChannelExchange("SMS", savedUserMsg, smsResponse);

    // Send response via API (more reliable than TwiML for long messages)
    await sendSms(smsResponse);

    // Return empty TwiML (we already sent the response via API)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("Twilio webhook error:", error);

    try {
      await sendSms("Something went wrong on my end. Try again in a sec.");
    } catch {
      // Can't even send error SMS — just log
    }

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
