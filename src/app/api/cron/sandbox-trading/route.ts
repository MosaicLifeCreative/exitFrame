import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { isMarketOpen } from "@/lib/investing/quotes";
import { runAutonomousSandboxTrading } from "@/lib/investing/sandboxTrader";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

async function verifyRequest(request: NextRequest): Promise<boolean> {
  const qstashCurrentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const qstashNextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  // QStash signature (POST from QStash)
  const signature = request.headers.get("upstash-signature");
  if (signature && qstashCurrentSigningKey && qstashNextSigningKey) {
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

  // CRON_SECRET bearer token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // Vercel Cron triggers GET requests (Vercel authenticates internally via CRON_SECRET)
  // For manual browser testing, allow GET requests through — the route is behind middleware auth
  if (request.method === "GET") return true;

  return false;
}

async function runCron() {
  if (!isMarketOpen()) {
    return NextResponse.json({ data: { message: "Market closed, skipping sandbox trading" } });
  }

  // Check sandbox is configured
  if (!process.env.TASTYTRADE_SANDBOX_REFRESH_TOKEN || !process.env.TASTYTRADE_SANDBOX_CLIENT_SECRET) {
    return NextResponse.json({ data: { message: "Sandbox not configured" } });
  }

  try {
    const result = await runAutonomousSandboxTrading();

    return NextResponse.json({
      data: {
        message: result.executed > 0
          ? `Executed ${result.executed} sandbox trades`
          : "No trades — holding",
        decisions: result.decisions.length,
        executed: result.executed,
        errors: result.errors,
        notified: result.notified,
        holdReason: result.decisions.find((d) => d.action === "HOLD")?.reasoning || null,
      },
    });
  } catch (error) {
    console.error("Sandbox trading cron error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Sandbox trading failed: ${msg}` }, { status: 500 });
  }
}

// GET: Vercel cron or manual trigger
export async function GET(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}

// POST: QStash schedule
export async function POST(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}
