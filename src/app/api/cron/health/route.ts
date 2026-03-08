import { NextRequest, NextResponse } from "next/server";
import { syncOuraData, getOuraStatus } from "@/lib/oura";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Health cron — syncs Oura data every 6 hours
// Called by Vercel daily cron or QStash schedule

async function verifyRequest(request: NextRequest): Promise<boolean> {
  // QStash signature verification
  const qstashCurrentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const qstashNextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (qstashCurrentSigningKey && qstashNextSigningKey) {
    const { Receiver } = await import("@upstash/qstash");
    const receiver = new Receiver({
      currentSigningKey: qstashCurrentSigningKey,
      nextSigningKey: qstashNextSigningKey,
    });

    const signature = request.headers.get("upstash-signature");
    if (signature) {
      const body = await request.text();
      try {
        await receiver.verify({ signature, body, url: request.url });
        return true;
      } catch {
        return false;
      }
    }
  }

  // Fallback: CRON_SECRET bearer token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // No auth configured — allow (dev mode)
  if (!cronSecret && !qstashCurrentSigningKey) return true;

  return false;
}

async function runHealthCron() {
  const log: string[] = [];

  // Check if Oura is connected
  const status = await getOuraStatus();
  if (!status.connected) {
    log.push("Oura not connected — skipping sync");
    return NextResponse.json({ data: { message: "Oura not connected", log } });
  }

  // Sync last 3 days of data (catches any gaps)
  try {
    const results = await syncOuraData(3);
    log.push(`Oura sync: ${results.sleep} sleep, ${results.readiness} readiness, ${results.activity} activity, ${results.hrv} HR days`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.push(`Oura sync error: ${msg}`);
  }

  return NextResponse.json({ data: { message: "Health cron complete", log } });
}

export async function GET(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runHealthCron();
}

export async function POST(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runHealthCron();
}
