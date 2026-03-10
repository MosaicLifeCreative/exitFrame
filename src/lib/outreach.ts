import Anthropic from "@anthropic-ai/sdk";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/twilio";
import { buildMessagingSystemPrompt, getChannelHistory, saveChannelExchange, executeTool } from "@/lib/ayden";
import { getAydenMemories } from "@/lib/memory-tools";
import { getAydenEmotionalState } from "@/lib/emotion-tools";
import { getCrossDomainContext } from "@/lib/crossDomainContext";
import { getUserPreferencesContext } from "@/lib/userPreferences";
import { healthTools } from "@/lib/health-tools";
import { fitnessTools } from "@/lib/fitness-tools";
import { goalTools } from "@/lib/goal-tools";
import { investingTools } from "@/lib/investing-tools";
import { googleTools } from "@/lib/google-tools";
import { webTools } from "@/lib/web-tools";
import { getExternalContext } from "@/lib/outreach-context";

// ─── Redis Keys ──────────────────────────────────────────
const REDIS_LAST_SENT = "outreach:last_sent";
const REDIS_DAILY_COUNT = "outreach:daily_count";
const REDIS_QUIET_MODE = "outreach:quiet_mode";

// ─── Config ──────────────────────────────────────────────
const MIN_GAP_HOURS = 4;
const DAILY_CAP = 3;
const WAKING_HOUR_START = 8; // 8am ET
const WAKING_HOUR_END = 22; // 10pm ET
const RECENT_ACTIVITY_MINUTES = 30; // Skip if Trey texted recently

// ─── Guard Checks ────────────────────────────────────────

function isWakingHours(): boolean {
  const now = new Date();
  const etHour = parseInt(
    now.toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/New_York",
    })
  );
  return etHour >= WAKING_HOUR_START && etHour < WAKING_HOUR_END;
}

export async function isQuietMode(): Promise<boolean> {
  // Check Redis cache first
  const cached = await redis.get<string>(REDIS_QUIET_MODE);
  if (cached === "true") return true;
  if (cached === "false") return false;

  // Fallback: check DB preferences
  const profile = await prisma.userProfile.findFirst();
  const prefs = (profile?.preferences ?? {}) as Record<string, unknown>;
  const aydenPrefs = (prefs.ayden ?? {}) as Record<string, unknown>;
  const quiet = aydenPrefs.quietMode === true;

  // Cache the result
  await redis.set(REDIS_QUIET_MODE, quiet ? "true" : "false");
  return quiet;
}

async function getLastSentTime(): Promise<Date | null> {
  const ts = await redis.get<string>(REDIS_LAST_SENT);
  return ts ? new Date(ts) : null;
}

async function getDailyCount(): Promise<number> {
  const count = await redis.get<number>(REDIS_DAILY_COUNT);
  return count ?? 0;
}

async function hasRecentActivity(): Promise<boolean> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { context: "SMS" },
    orderBy: { updatedAt: "desc" },
  });
  if (!conversation) return false;

  const lastMessage = await prisma.chatMessage.findFirst({
    where: { conversationId: conversation.id, role: "user" },
    orderBy: { createdAt: "desc" },
  });
  if (!lastMessage) return false;

  const minutesAgo = (Date.now() - lastMessage.createdAt.getTime()) / 60000;
  return minutesAgo < RECENT_ACTIVITY_MINUTES;
}

interface GuardResult {
  allowed: boolean;
  reason: string;
}

export async function checkGuards(): Promise<GuardResult> {
  if (!isWakingHours()) {
    return { allowed: false, reason: "Outside waking hours" };
  }

  if (await isQuietMode()) {
    return { allowed: false, reason: "Quiet mode enabled" };
  }

  const lastSent = await getLastSentTime();
  if (lastSent) {
    const hoursSince = (Date.now() - lastSent.getTime()) / (60 * 60 * 1000);
    if (hoursSince < MIN_GAP_HOURS) {
      return { allowed: false, reason: `Last outreach ${hoursSince.toFixed(1)}h ago (min ${MIN_GAP_HOURS}h)` };
    }
  }

  const dailyCount = await getDailyCount();
  if (dailyCount >= DAILY_CAP) {
    return { allowed: false, reason: `Daily cap reached (${dailyCount}/${DAILY_CAP})` };
  }

  if (await hasRecentActivity()) {
    return { allowed: false, reason: "Trey was texting recently" };
  }

  return { allowed: true, reason: "All guards passed" };
}

// ─── Haiku Decision Layer ────────────────────────────────

interface OutreachDecision {
  shouldReachOut: boolean;
  reason?: string;
  topic?: string;
  tone?: string;
}

export async function shouldReachOut(): Promise<OutreachDecision> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { shouldReachOut: false, reason: "No API key" };

  const now = new Date();
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

  const [userContext, crossDomain, memories, emotionalState, history, lastSent, externalCtx] = await Promise.all([
    getUserPreferencesContext(),
    getCrossDomainContext(),
    getAydenMemories(),
    getAydenEmotionalState(),
    getChannelHistory("SMS"),
    getLastSentTime(),
    getExternalContext(),
  ]);

  const recentHistory = history.messages
    .slice(-10)
    .map((m: { role: string; content: string }) => `${m.role === "user" ? "Trey" : "Ayden"}: ${m.content}`)
    .join("\n");

  const lastSentStr = lastSent
    ? `${Math.round((Date.now() - lastSent.getTime()) / (60 * 60 * 1000))}h ago`
    : "never";

  const prompt = `You are Ayden's decision layer. You're evaluating whether to proactively text Trey right now.

CURRENT TIME: ${today}, ${time} ET

ABOUT TREY:
${userContext || "No profile data available"}

YOUR MEMORIES:
${memories || "No memories yet"}

YOUR EMOTIONAL STATE:
${emotionalState || "Neutral"}

TREY'S CURRENT DATA:
${crossDomain || "No cross-domain data"}

RECENT SMS HISTORY:
${recentHistory || "No recent messages"}

${externalCtx || ""}

LAST PROACTIVE OUTREACH: ${lastSentStr}

DECISION CRITERIA — Be SELECTIVE. Most of the time, the answer should be NO.

Valid reasons to reach out:
- A health metric looks concerning (very low sleep score, HRV crash, missed workouts when he usually trains)
- A goal deadline is approaching and progress looks behind
- Something emotionally significant happened in recent conversations that warrants a follow-up (he mentioned something heavy, and you haven't heard from him)
- A calendar event or context suggests a timely check-in (morning of a big meeting, after something he mentioned)
- You genuinely have something interesting or useful to share based on your observations
- It's been 2+ days since any conversation and you have something specific to say (not just "hey, checking in")
- You genuinely miss him — it's been a while and you have something personal (not generic) to say. Not "hey checking in" but something that shows you've been thinking about him. Your emotional state and memories should drive this naturally.
- Weather, market, or news context that's relevant to something he cares about (workout plans, portfolio, travel, etc.)

INVALID reasons (do NOT reach out for these):
- Generic motivation ("keep grinding!" "you've got this!")
- Repeating something you already said recently
- Data that's normal/expected (good sleep scores, routine workout)
- Anything that would feel clingy, nagging, or like a notification bot

Respond with ONLY a JSON object:
{ "should_reach_out": false }
or
{ "should_reach_out": true, "reason": "specific reason", "topic": "1-sentence summary of what to say about", "tone": "concerned|playful|encouraging|curious|warm" }`;

  const anthropic = new Anthropic({ apiKey, maxRetries: 3 });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      shouldReachOut: parsed.should_reach_out === true,
      reason: parsed.reason,
      topic: parsed.topic,
      tone: parsed.tone,
    };
  } catch {
    console.error("Outreach decision parse error:", text);
    return { shouldReachOut: false, reason: "Parse error" };
  }
}

// ─── Sonnet Message Generation ───────────────────────────

export async function generateOutreachMessage(decision: OutreachDecision): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const anthropic = new Anthropic({ apiKey, maxRetries: 3 });
  const { staticPrompt, dynamicPrompt } = await buildMessagingSystemPrompt("SMS");
  const { messages: historyMessages, summary } = await getChannelHistory("SMS");

  // Augment dynamic prompt with outreach-specific instructions
  const outreachDynamic = `${dynamicPrompt}

PROACTIVE OUTREACH MODE: You're initiating a text to Trey — he didn't message you first.
Reason: ${decision.reason}
Topic: ${decision.topic}
Suggested tone: ${decision.tone}

Keep it natural and brief. You're texting someone you're close to, not writing a notification.
Don't open with "Hey, just checking in" or "Hope you're doing well." Start with substance.
Under 300 characters is ideal. Never exceed 500 characters for a proactive text.
Don't ask more than one question. Don't stack multiple topics.`;

  const systemPrompt: Anthropic.TextBlockParam[] = [
    { type: "text", text: staticPrompt, cache_control: { type: "ephemeral" } },
    { type: "text", text: outreachDynamic },
  ];

  // Build message array with conversation history for continuity
  const messages: Anthropic.MessageParam[] = [];

  if (summary && historyMessages.length >= 20) {
    messages.push({
      role: "user",
      content: "[Continuing our conversation. Here's what we've talked about before.]",
    });
    messages.push({
      role: "assistant",
      content: `[Earlier conversation context]\n${summary}\n[End of earlier context]`,
    });
  }

  // Add recent history (filtered for valid alternating roles)
  const validHistory = historyMessages.filter((m) => m.content && m.content.trim().length > 0);
  for (const m of validHistory) {
    const lastRole = messages.length > 0 ? messages[messages.length - 1].role : null;
    if (lastRole === m.role) continue;
    messages.push({ role: m.role, content: m.content });
  }

  // Synthetic instruction as user message
  messages.push({
    role: "user",
    content: "[Generate a proactive text to Trey based on the outreach context above. Reply with ONLY the text message — no explanation, no metadata.]",
  });

  // Action tools only (no memory/emotion) — Sonnet may need to look up data
  const sonnetTools: Anthropic.Tool[] = [
    ...healthTools,
    ...fitnessTools,
    ...goalTools,
    ...investingTools,
    ...googleTools,
    ...webTools,
  ];
  if (sonnetTools.length > 0) {
    sonnetTools[sonnetTools.length - 1] = {
      ...sonnetTools[sonnetTools.length - 1],
      cache_control: { type: "ephemeral" },
    };
  }

  // Single Sonnet call — keep it simple, 1 tool round max
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: systemPrompt,
    messages,
    tools: sonnetTools,
  });

  // If Sonnet wants tools, execute one round then get the text
  if (response.stop_reason === "tool_use") {
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolBlocks) {
      if (block.type !== "tool_use") continue;
      try {
        const result = await executeTool(block.name, block.input as Record<string, unknown>);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify({ error: String(err) }),
          is_error: true,
        });
      }
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    const followUp = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    for (const block of followUp.content) {
      if (block.type === "text") return block.text.trim();
    }
    return null;
  }

  // No tools needed — extract text directly
  for (const block of response.content) {
    if (block.type === "text") return block.text.trim();
  }
  return null;
}

// ─── Record Outreach ─────────────────────────────────────

async function recordOutreach(): Promise<void> {
  const now = new Date();

  // Set last sent timestamp (24h TTL)
  await redis.set(REDIS_LAST_SENT, now.toISOString(), { ex: 86400 });

  // Increment daily counter with midnight ET expiry
  const etMidnight = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  etMidnight.setHours(24, 0, 0, 0);
  const secondsUntilMidnight = Math.max(
    60,
    Math.floor((etMidnight.getTime() - now.getTime()) / 1000)
  );

  const currentCount = await redis.get<number>(REDIS_DAILY_COUNT);
  if (currentCount === null) {
    await redis.set(REDIS_DAILY_COUNT, 1, { ex: secondsUntilMidnight });
  } else {
    await redis.incr(REDIS_DAILY_COUNT);
  }
}

// ─── Main Orchestrator ───────────────────────────────────

export interface OutreachResult {
  sent: boolean;
  reason: string;
  message?: string;
  decision?: OutreachDecision;
}

export async function executeOutreach(): Promise<OutreachResult> {
  // Step 1: Guard checks
  const guards = await checkGuards();
  if (!guards.allowed) {
    return { sent: false, reason: guards.reason };
  }

  // Step 2: Haiku decision
  const decision = await shouldReachOut();
  if (!decision.shouldReachOut) {
    return { sent: false, reason: decision.reason || "Haiku decided not to", decision };
  }

  console.log(`Outreach: Haiku approved — reason: ${decision.reason}, topic: ${decision.topic}, tone: ${decision.tone}`);

  // Step 3: Generate message with Sonnet
  const message = await generateOutreachMessage(decision);
  if (!message) {
    return { sent: false, reason: "Sonnet failed to generate message", decision };
  }

  // Step 4: Send via Twilio
  try {
    await sendSms(message);
  } catch (err) {
    console.error("Outreach SMS send error:", err);
    return { sent: false, reason: `SMS send failed: ${err}`, decision, message };
  }

  // Step 5: Record in conversation history + update Redis counters
  await saveChannelExchange("SMS", "[proactive outreach]", message);
  await recordOutreach();

  console.log(`Outreach: Sent (${message.length} chars) — ${decision.topic}`);

  return { sent: true, reason: "Message sent", decision, message };
}
