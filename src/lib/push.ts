import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:trey@mosaiclifecreative.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title?: string;
  body: string;
  tag?: string;
  url?: string;
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID keys not configured, skipping");
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany();

  if (subscriptions.length === 0) {
    console.warn("[push] No subscriptions found, skipping");
    return;
  }

  // Truncate body to stay under 4KB push payload limit
  const truncatedBody = payload.body.length > 500 ? payload.body.substring(0, 500) + "..." : payload.body;

  const message = JSON.stringify({
    title: payload.title || "Ayden",
    body: truncatedBody,
    tag: payload.tag || "ayden-message",
    url: payload.url || "/dashboard/chat",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message
      )
    )
  );

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      sent++;
    } else {
      failed++;
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      const errorBody = (result.reason as { body?: string })?.body;
      console.error(`[push] Failed to send (status ${statusCode}): ${errorBody || result.reason}`);

      // Clean up expired/invalid subscriptions (any 4xx except 429)
      if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        await prisma.pushSubscription.delete({
          where: { id: subscriptions[i].id },
        }).catch(() => {});
        console.log(`[push] Removed invalid subscription ${subscriptions[i].id}`);
      }
    }
  }

  console.log(`[push] ${payload.tag || "ayden-message"}: ${sent} sent, ${failed} failed (${subscriptions.length} total)`);
}
