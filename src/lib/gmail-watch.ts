import { getGoogleAccessToken } from "@/lib/google";

const TOPIC_NAME = process.env.GMAIL_PUBSUB_TOPIC || "";

/**
 * Register a Gmail watch on Ayden's inbox.
 * Google will push notifications to our Pub/Sub topic when new mail arrives.
 * Watch expires after 7 days — must be renewed by cron.
 */
export async function registerGmailWatch(): Promise<{
  historyId: string;
  expiration: string;
}> {
  if (!TOPIC_NAME) {
    throw new Error("GMAIL_PUBSUB_TOPIC not configured");
  }

  const accessToken = await getGoogleAccessToken("ayden");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName: TOPIC_NAME,
      labelIds: ["INBOX"],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gmail watch registration failed: ${response.status} ${err}`);
  }

  const data = await response.json();
  console.log(`[gmail-watch] Registered. historyId=${data.historyId}, expires=${data.expiration}`);
  return data;
}

/**
 * Stop the current Gmail watch (cleanup).
 */
export async function stopGmailWatch(): Promise<void> {
  const accessToken = await getGoogleAccessToken("ayden");

  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.log("[gmail-watch] Stopped.");
}
