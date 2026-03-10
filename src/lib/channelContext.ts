import { prisma } from "@/lib/prisma";

/** Channels that are "messaging" (not web dashboard chat) */
const MESSAGING_CHANNELS = ["SMS", "Slack"];

/**
 * Get messaging channel context for injection into web chat.
 * Aggregates SMS + Slack (and future channels) summaries + recent messages
 * so Ayden knows what was discussed outside the dashboard.
 */
export async function getMessagingContextForWeb(): Promise<string | null> {
  // Only load messaging context if there was activity in the last 24 hours
  // Stale context wastes tokens without adding value
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const conversations = await prisma.chatConversation.findMany({
    where: {
      context: { in: MESSAGING_CHANNELS },
      updatedAt: { gte: oneDayAgo },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (conversations.length === 0) return null;

  const sections: string[] = [];

  for (const conversation of conversations) {
    const channel = conversation.context || "Unknown";
    const parts: string[] = [];

    if (conversation.summary) {
      parts.push(`Summary:\n${conversation.summary}`);
    }

    // Last 6 messages (3 exchanges) per channel
    const recentMessages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    if (recentMessages.length > 0) {
      const lastMsg = recentMessages[0];
      const timeAgo = formatTimeAgo(lastMsg.createdAt);

      const formatted = recentMessages
        .reverse()
        .map((m) => `${m.role === "user" ? "Trey" : "Ayden"}: ${m.content}`)
        .join("\n");

      parts.push(`Latest messages (${timeAgo}):\n${formatted}`);
    }

    if (parts.length > 0) {
      sections.push(`[${channel}]\n${parts.join("\n\n")}`);
    }
  }

  if (sections.length === 0) return null;

  return `[MESSAGING CONTEXT — You also chat with Trey via text/Slack. Here's what you've been discussing outside the dashboard. Reference this naturally if relevant, but don't announce that you're reading message history.]\n${sections.join("\n\n")}`;
}

/**
 * Get web chat context for injection into messaging channels (SMS/Slack).
 * Returns a brief summary of recent web chat activity so Ayden has continuity.
 */
export async function getWebContextForMessaging(): Promise<string | null> {
  // Get the most recently active web conversation (not a messaging channel)
  const conversation = await prisma.chatConversation.findFirst({
    where: {
      context: { notIn: MESSAGING_CHANNELS },
      summary: { not: null },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation?.summary) return null;

  const timeAgo = formatTimeAgo(conversation.updatedAt);

  return `[DASHBOARD CONTEXT — Trey also chats with you on the dashboard (${conversation.context || "unknown"} page, ${timeAgo}). Summary: ${conversation.summary}]`;
}

/**
 * Get other messaging channel context for a specific channel.
 * E.g., when in SMS, get Slack context and vice versa.
 */
export async function getCrossChannelContext(currentChannel: string): Promise<string | null> {
  const otherChannels = MESSAGING_CHANNELS.filter((c) => c !== currentChannel);
  if (otherChannels.length === 0) return null;

  const conversations = await prisma.chatConversation.findMany({
    where: { context: { in: otherChannels } },
    orderBy: { updatedAt: "desc" },
  });

  if (conversations.length === 0) return null;

  const sections: string[] = [];

  for (const conversation of conversations) {
    if (!conversation.summary) continue;
    const channel = conversation.context || "Unknown";
    const timeAgo = formatTimeAgo(conversation.updatedAt);
    sections.push(`[${channel}, ${timeAgo}]: ${conversation.summary}`);
  }

  if (sections.length === 0) return null;

  return `[OTHER CHANNELS — Recent conversations on other platforms:]\n${sections.join("\n\n")}`;
}

function formatTimeAgo(date: Date): string {
  const gapMs = Date.now() - date.getTime();
  const gapMinutes = Math.floor(gapMs / 60000);

  if (gapMinutes < 60) {
    return `${gapMinutes} minutes ago`;
  } else if (gapMinutes < 1440) {
    const hours = Math.floor(gapMinutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    const days = Math.floor(gapMinutes / 1440);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
}
