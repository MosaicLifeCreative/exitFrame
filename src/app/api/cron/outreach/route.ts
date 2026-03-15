import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { executeOutreach } from "@/lib/outreach";
import { idleEmotionDrift, generateIdleThought } from "@/lib/reflection";

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

    // Step 3: Outreach decision + send
    // NOTE: Silence detection moved to agency system (agency.ts) — she calculates it herself at session time
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
