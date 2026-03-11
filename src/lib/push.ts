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
    console.warn("Push: VAPID keys not configured, skipping");
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany();

  if (subscriptions.length === 0) return;

  const message = JSON.stringify({
    title: payload.title || "Ayden",
    body: payload.body,
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

  // Clean up expired/invalid subscriptions
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription expired or unsubscribed
        await prisma.pushSubscription.delete({
          where: { id: subscriptions[i].id },
        }).catch(() => {});
      }
    }
  }
}
