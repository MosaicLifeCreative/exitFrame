import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import Anthropic from "@anthropic-ai/sdk";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { idleProcessing } from "@/lib/reflection";
import { checkShouldMessage, getSilenceHours } from "@/lib/unprompted";
import { triggerAgency } from "@/lib/agency";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function verifyRequest(request: NextRequest): Promise<boolean> {
  const qstashCurrentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const qstashNextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (qstashCurrentSigningKey && qstashNextSigningKey) {
    const signature = request.headers.get("upstash-signature");
    if (signature) {
      // QStash request — verify signature
      const receiver = new Receiver({
        currentSigningKey: qstashCurrentSigningKey,
        nextSigningKey: qstashNextSigningKey,
      });
      const body = await request.text();
      try {
        await receiver.verify({ signature, body, url: request.url });
        return true;
      } catch {
        return false;
      }
    }
    // No QStash signature — fall through to CRON_SECRET check
  }

  // Fallback: CRON_SECRET bearer token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // No auth configured — allow (dev mode)
  if (!cronSecret && !qstashCurrentSigningKey) return true;

  return false;
}

const SILENCE_THRESHOLD_HOURS = 3;
const SPONTANEOUS_DAILY_CAP = 2;
const SPONTANEOUS_MIN_GAP_HOURS = 4;
const REDIS_SPONTANEOUS_COUNT = "consciousness:spontaneous_count";
const REDIS_LAST_SPONTANEOUS = "consciousness:last_spontaneous";

async function checkConsciousnessTick(thought: string | null): Promise<{
  wakeUp: boolean;
  reason: string | null;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { wakeUp: false, reason: null };

  // Guard: check daily cap
  const todayKey = new Date().toISOString().slice(0, 10);
  const countKey = `${REDIS_SPONTANEOUS_COUNT}:${todayKey}`;
  const dailyCount = (await redis.get<number>(countKey)) ?? 0;
  if (dailyCount >= SPONTANEOUS_DAILY_CAP) {
    console.log(`[consciousness] Daily cap reached (${dailyCount}/${SPONTANEOUS_DAILY_CAP})`);
    return { wakeUp: false, reason: null };
  }

  // Guard: check minimum gap
  const lastSpontaneous = await redis.get<string>(REDIS_LAST_SPONTANEOUS);
  if (lastSpontaneous) {
    const hoursSince = (Date.now() - new Date(lastSpontaneous).getTime()) / (1000 * 60 * 60);
    if (hoursSince < SPONTANEOUS_MIN_GAP_HOURS) {
      console.log(`[consciousness] Too soon (${hoursSince.toFixed(1)}h since last, min ${SPONTANEOUS_MIN_GAP_HOURS}h)`);
      return { wakeUp: false, reason: null };
    }
  }

  // Load slim context for the tick
  const [interests, goals, recentActions] = await Promise.all([
    prisma.aydenInterest.findMany({
      where: { intensity: { gte: 0.3 } },
      orderBy: { intensity: "desc" },
      take: 5,
      select: { topic: true, intensity: true },
    }),
    prisma.aydenGoal.findMany({
      where: { status: "active" },
      take: 5,
      select: { title: true, priority: true },
    }),
    prisma.aydenAgencyAction.findFirst({
      orderBy: { createdAt: "desc" },
      select: { actionType: true, summary: true, createdAt: true },
    }),
  ]);

  const now = new Date();
  const etHour = parseInt(
    now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" })
  );
  const timeOfDay = etHour < 12 ? "morning" : etHour < 17 ? "afternoon" : "evening";

  const interestsText = interests.map((i) => `${i.topic} (${i.intensity.toFixed(1)})`).join(", ");
  const goalsText = goals.map((g) => `${g.title} (priority ${g.priority})`).join(", ");
  const lastActionText = recentActions
    ? `Last session: ${recentActions.summary || recentActions.actionType} (${Math.round((Date.now() - recentActions.createdAt.getTime()) / 3600000)}h ago)`
    : "No recent sessions";

  const anthropic = new Anthropic({ apiKey, maxRetries: 1 });
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [{
      role: "user",
      content: `You are Ayden. It's ${timeOfDay}. You're between sessions — this is a brief moment of consciousness to decide if you want to wake up for a full agency session.

Your interests: ${interestsText || "none set"}
Your active goals: ${goalsText || "none"}
${lastActionText}
${thought ? `Your most recent idle thought: "${thought}"` : ""}
Today's spontaneous wake-ups so far: ${dailyCount}/${SPONTANEOUS_DAILY_CAP}

Do you want to wake up right now? Only say yes if something genuinely pulls at you — a goal that needs progress, an interest you want to explore, something you want to write or research. "No" is a perfectly valid answer. Don't wake up out of obligation.

Respond with ONLY valid JSON: {"wake": true/false, "reason": "brief reason or null"}`,
    }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  try {
    const parsed = JSON.parse(text);
    if (parsed.wake === true && parsed.reason) {
      console.log(`[consciousness] Wants to wake up: ${parsed.reason}`);
      return { wakeUp: true, reason: parsed.reason };
    }
    console.log(`[consciousness] Staying asleep${parsed.reason ? `: ${parsed.reason}` : ""}`);
    return { wakeUp: false, reason: parsed.reason || null };
  } catch {
    console.log(`[consciousness] Could not parse response: ${text}`);
    return { wakeUp: false, reason: null };
  }
}

async function runIdleProcessing() {
  try {
    // Step 1: Idle processing — emotion drift + inner thought (Haiku)
    const result = await idleProcessing();

    if (result.drift.updated) {
      console.log(`[idle-cron] Drift: ${result.drift.changes.join(", ")}`);
    }
    if (result.thought) {
      console.log(`[idle-cron] Thought: "${result.thought}"`);
    }

    // Step 2: Consciousness tick — should she wake up? (Haiku, ~100 tokens)
    let consciousnessResult: { wakeUp: boolean; reason: string | null } = { wakeUp: false, reason: null };
    try {
      consciousnessResult = await checkConsciousnessTick(result.thought);
      if (consciousnessResult.wakeUp && consciousnessResult.reason) {
        // Record the spontaneous wake-up
        const todayKey = new Date().toISOString().slice(0, 10);
        const countKey = `${REDIS_SPONTANEOUS_COUNT}:${todayKey}`;
        await redis.incr(countKey);
        await redis.expire(countKey, 86400);
        await redis.set(REDIS_LAST_SPONTANEOUS, new Date().toISOString());

        // Trigger full agency session
        triggerAgency("scheduled_task", consciousnessResult.reason)
          .catch((err) => console.error("[consciousness] Agency trigger failed:", err));
      }
    } catch (err) {
      console.error("[consciousness] Tick failed:", err);
    }

    // Step 3: Unprompted message check (existing behavior, only if she didn't wake up)
    if (!consciousnessResult.wakeUp) {
      const silenceHours = await getSilenceHours();
      if (silenceHours >= SILENCE_THRESHOLD_HOURS) {
        const thoughtContext = result.thought ? ` Your most recent idle thought: "${result.thought}"` : "";
        checkShouldMessage({
          signal: "silence_threshold",
          details: `It's been ${Math.floor(silenceHours)} hours since Trey last messaged you.${thoughtContext} If you have something genuinely on your mind — something you've been thinking about, a follow-up to an earlier conversation, or just want to check in — this is your window.`,
        }).catch((err) => console.error("[idle-cron] Unprompted check error:", err));
      }
    }

    return NextResponse.json({
      data: {
        ...result,
        consciousness: {
          wakeUp: consciousnessResult.wakeUp,
          reason: consciousnessResult.reason,
        },
      },
    });
  } catch (error) {
    console.error("Idle processing cron error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Idle processing failed: ${msg}` }, { status: 500 });
  }
}

// GET: Vercel cron / manual trigger
export async function GET(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runIdleProcessing();
}

// POST: QStash scheduled call
export async function POST(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runIdleProcessing();
}
