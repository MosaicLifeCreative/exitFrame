import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { idleProcessing } from "@/lib/reflection";
import { checkShouldMessage, getSilenceHours } from "@/lib/unprompted";

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

const SILENCE_THRESHOLD_HOURS = 3;

async function runIdleProcessing() {
  try {
    // Single Haiku call handles both emotion drift and inner thought
    const result = await idleProcessing();

    if (result.drift.updated) {
      console.log(`[idle-cron] Drift: ${result.drift.changes.join(", ")}`);
    }
    if (result.thought) {
      console.log(`[idle-cron] Thought: "${result.thought}"`);
    }

    // Signal-gated unprompted check: if Trey has been silent for 3+ hours,
    // give Ayden a chance to reach out
    const silenceHours = await getSilenceHours();
    if (silenceHours >= SILENCE_THRESHOLD_HOURS) {
      const thoughtContext = result.thought ? ` Your most recent idle thought: "${result.thought}"` : "";
      checkShouldMessage({
        signal: "silence_threshold",
        details: `It's been ${Math.floor(silenceHours)} hours since Trey last messaged you.${thoughtContext} If you have something genuinely on your mind — something you've been thinking about, a follow-up to an earlier conversation, or just want to check in — this is your window.`,
      }).catch((err) => console.error("[idle-cron] Unprompted check error:", err));
    }

    return NextResponse.json({ data: result });
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
