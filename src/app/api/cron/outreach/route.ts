import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { executeOutreach } from "@/lib/outreach";
import { idleEmotionDrift, generateIdleThought } from "@/lib/reflection";
import { triggerAgency } from "@/lib/agency";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

async function runOutreach() {
  try {
    // Step 1: Idle emotional drift (non-fatal)
    let driftResult = null;
    try {
      driftResult = await idleEmotionDrift();
      if (driftResult.updated) {
        console.log(`[outreach-cron] Idle drift: ${driftResult.changes.join(", ")}`);
      }
    } catch (driftErr) {
      console.error("[outreach-cron] Idle drift error (non-fatal):", driftErr);
    }

    // Step 2: Inner thought (non-fatal)
    let thoughtResult = null;
    try {
      thoughtResult = await generateIdleThought();
      if (thoughtResult.thought) {
        console.log(`[outreach-cron] Thought: "${thoughtResult.thought}"`);
      }
    } catch (thoughtErr) {
      console.error("[outreach-cron] Thought generation error (non-fatal):", thoughtErr);
    }

    // Step 3: Silence trigger — if Trey hasn't spoken in 8+ waking hours, wake agency
    try {
      const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
      const hour = etNow.getHours();
      if (hour >= 8 && hour < 22) {
        const lastUserMsg = await prisma.chatMessage.findFirst({
          where: { role: "user" },
          orderBy: { createdAt: "desc" },
        });
        if (lastUserMsg) {
          const silenceHours = (Date.now() - lastUserMsg.createdAt.getTime()) / (1000 * 60 * 60);
          if (silenceHours >= 8) {
            console.log(`[outreach-cron] Silence trigger: ${silenceHours.toFixed(1)}h since last message`);
            triggerAgency("silence", `It's been ${Math.floor(silenceHours)} hours since Trey last said anything. Is there something you want to think about or do?`).catch((err) =>
              console.error("[outreach-cron] Silence trigger failed:", err)
            );
          }
        }
      }
    } catch (err) {
      console.error("[outreach-cron] Silence check error (non-fatal):", err);
    }

    // Step 4: Outreach decision + send
    const result = await executeOutreach();
    console.log(`Outreach cron: sent=${result.sent}, reason=${result.reason}`);
    return NextResponse.json({ data: { ...result, drift: driftResult, thought: thoughtResult } });
  } catch (error) {
    console.error("Outreach cron error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Outreach failed: ${msg}` }, { status: 500 });
  }
}

// GET: Vercel daily cron / manual trigger
export async function GET(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runOutreach();
}

// POST: QStash scheduled call
export async function POST(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runOutreach();
}
