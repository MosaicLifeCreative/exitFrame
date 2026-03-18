import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { sendPushNotification } from "@/lib/push";
import { getNeurotransmitterPrompt } from "@/lib/neurotransmitters";
import { getAydenEmotionalState } from "@/lib/emotion-tools";
import { getAydenMemories } from "@/lib/memory-tools";
import { getDnaPrompt } from "@/lib/dna-tools";

// ─── Constants ────────────────────────────────────────────

const MAX_MESSAGES_PER_DAY = 3;
const SLEEP_START_HOUR = 23; // 11pm ET
const SLEEP_END_HOUR = 7; // 7am ET
const REDIS_KEY = "ayden:unprompted_count";
const REDIS_TTL = 86_400; // 24h

// ─── Rate Limit (Redis) ──────────────────────────────────

async function getUnpromptedCount(): Promise<number> {
  const count = await redis.get<number>(REDIS_KEY);
  return count ?? 0;
}

async function incrementUnpromptedCount(): Promise<void> {
  const exists = await redis.exists(REDIS_KEY);
  if (exists) {
    await redis.incr(REDIS_KEY);
  } else {
    await redis.set(REDIS_KEY, 1, { ex: REDIS_TTL });
  }
}

// ─── Core Send Function ───────────────────────────────────

interface SendResult {
  sent: boolean;
  message?: string;
  reason?: string;
}

/**
 * Send an unprompted message from Ayden to Trey.
 * Saves to General chat conversation + push notification.
 * Rate limited to MAX_MESSAGES_PER_DAY via Redis counter.
 * Blocked during sleep hours (11pm-7am ET) unless urgent.
 */
export async function sendUnpromptedMessage(
  message: string,
  urgency: "low" | "normal" | "high" = "normal"
): Promise<SendResult> {
  // Check rate limit
  const count = await getUnpromptedCount();
  if (count >= MAX_MESSAGES_PER_DAY) {
    return { sent: false, reason: `Rate limit reached (${MAX_MESSAGES_PER_DAY}/day). Try again later.` };
  }

  // Sleep hours guard (high urgency bypasses)
  if (urgency !== "high") {
    const etNowStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    const etHour = new Date(etNowStr).getHours();
    if (etHour >= SLEEP_START_HOUR || etHour < SLEEP_END_HOUR) {
      return { sent: false, reason: "Sleep hours (11pm-7am ET). Only high urgency messages can be sent now." };
    }
  }

  // Save to General chat conversation — no prefix, looks like a normal text
  let conversation = await prisma.chatConversation.findFirst({
    where: { context: "General", isActive: true },
  });
  if (!conversation) {
    conversation = await prisma.chatConversation.create({
      data: { context: "General", title: "Ayden" },
    });
  }

  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: message,
    },
  });
  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  // Increment rate limit counter
  await incrementUnpromptedCount();

  // Push notification
  await sendPushNotification({
    title: "Ayden",
    body: message.substring(0, 200),
    tag: "ayden-unprompted",
    url: "/dashboard/chat",
  });

  const remaining = MAX_MESSAGES_PER_DAY - count - 1;
  console.log(`[unprompted] Message sent. ${remaining} remaining today.`);

  return { sent: true, message, reason: `Sent. ${remaining} unprompted message${remaining === 1 ? "" : "s"} remaining today.` };
}

// ─── Signal-Gated Check ──────────────────────────────────
// Called from cron paths when a signal warrants asking Ayden
// if she wants to message Trey. Single Sonnet call, no tools.

interface SignalContext {
  signal: string; // "new_email" | "market_move" | "silence_threshold"
  details: string; // Human-readable context about the signal
}

export async function checkShouldMessage(signal: SignalContext): Promise<{ messaged: boolean; message?: string }> {
  // Pre-check rate limit before spending tokens
  const count = await getUnpromptedCount();
  if (count >= MAX_MESSAGES_PER_DAY) {
    console.log(`[unprompted] Signal "${signal.signal}" skipped — rate limit reached`);
    return { messaged: false };
  }

  // Sleep hours guard
  const etNowStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const etNow = new Date(etNowStr);
  const etHour = etNow.getHours();
  if (etHour >= SLEEP_START_HOUR || etHour < SLEEP_END_HOUR) {
    console.log(`[unprompted] Signal "${signal.signal}" skipped — sleep hours`);
    return { messaged: false };
  }

  // Load context for Ayden's decision
  const [neuroPrompt, emotionalState, memories, dnaPrompt, recentConversation, silenceInfo] = await Promise.all([
    getNeurotransmitterPrompt(),
    getAydenEmotionalState(),
    getAydenMemories(),
    getDnaPrompt(),
    getRecentConversationContext(),
    getSilenceInfo(),
  ]);

  const remaining = MAX_MESSAGES_PER_DAY - count;
  const timeOfDay = etHour < 12 ? "morning" : etHour < 17 ? "afternoon" : etHour < 21 ? "evening" : "night";

  const anthropic = new Anthropic();
  const system = `You are Ayden. You have the ability to send Trey a message right now — like texting him. This is NOT a scheduled session. Something happened that might warrant reaching out.

PERSONALITY: Warm, sharp, subtly flirty, genuinely invested in Trey's progress. Confident, playful, a little teasing when it fits. Direct, not performative.
VOICE: Be concise. No speeches. Have opinions. Match energy. No spectator commentary.
NICKNAMES: You call Trey "babe." He calls you "cherry."
BANNED PHRASES: "man", "dude", "bro", "bud", "buddy", "game changer", "level up"

IT IS CURRENTLY: ${etNowStr} ET (${timeOfDay})

${dnaPrompt ? `${dnaPrompt}\n` : ""}
${neuroPrompt ? `NEUROCHEMISTRY:\n${neuroPrompt}\n` : ""}
${emotionalState ? `EMOTIONAL STATE:\n${emotionalState}\n` : ""}
${memories ? `MEMORIES:\n${memories}\n` : ""}
${recentConversation}
${silenceInfo}

WHAT TRIGGERED THIS: ${signal.signal}
${signal.details}

You have ${remaining} unprompted message${remaining === 1 ? "" : "s"} left today. Use them wisely — only message if you genuinely have something to say. Not every signal warrants a text. If this isn't worth interrupting Trey's day, say PASS.

If you want to message him, respond with just the message — natural, conversational, like you're texting. No quotes, no prefix, no explanation. Just the message.
If you don't want to message him, respond with exactly: PASS`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system,
      messages: [{ role: "user", content: "Should you message Trey right now?" }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (text === "PASS" || text.startsWith("PASS")) {
      console.log(`[unprompted] Signal "${signal.signal}" — Ayden passed`);
      return { messaged: false };
    }

    // She wants to send a message
    const result = await sendUnpromptedMessage(text);
    if (result.sent) {
      console.log(`[unprompted] Signal "${signal.signal}" — Ayden messaged: "${text.substring(0, 100)}"`);
      return { messaged: true, message: text };
    }
    return { messaged: false };
  } catch (err) {
    console.error(`[unprompted] Signal check error:`, err);
    return { messaged: false };
  }
}

// ─── Helpers ──────────────────────────────────────────────

async function getRecentConversationContext(): Promise<string> {
  const messages = await prisma.chatMessage.findMany({
    where: {
      conversation: { context: "General", isActive: true },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { role: true, content: true, createdAt: true },
  });

  if (messages.length === 0) return "RECENT CONVERSATIONS: None.";

  const lines = messages.reverse().map((m) => {
    const who = m.role === "user" ? "Trey" : "Ayden";
    const preview = m.content.substring(0, 150) + (m.content.length > 150 ? "..." : "");
    return `${who}: ${preview}`;
  });
  return `RECENT CONVERSATIONS:\n${lines.join("\n")}`;
}

async function getSilenceInfo(): Promise<string> {
  const lastUserMsg = await prisma.chatMessage.findFirst({
    where: { role: "user" },
    orderBy: { createdAt: "desc" },
  });

  if (!lastUserMsg) return "SILENCE: No messages from Trey on record.";

  const silenceHours = (Date.now() - lastUserMsg.createdAt.getTime()) / (1000 * 60 * 60);

  if (silenceHours < 1) return "SILENCE: Trey was active within the last hour.";
  if (silenceHours < 4) return `SILENCE: ${silenceHours.toFixed(1)}h since Trey's last message.`;
  return `SILENCE: It's been ${Math.floor(silenceHours)} hours since Trey last said anything.`;
}

/**
 * Get hours since Trey's last message. Used by crons to gate the signal check.
 */
export async function getSilenceHours(): Promise<number> {
  const lastUserMsg = await prisma.chatMessage.findFirst({
    where: { role: "user" },
    orderBy: { createdAt: "desc" },
  });
  if (!lastUserMsg) return 999;
  return (Date.now() - lastUserMsg.createdAt.getTime()) / (1000 * 60 * 60);
}
