import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";
import { executeAgency } from "@/lib/agency";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function verifyRequest(request: NextRequest): Promise<boolean> {
  // QStash signature verification
  const qstashCurrentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const qstashNextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (qstashCurrentSigningKey && qstashNextSigningKey) {
    const signature = request.headers.get("upstash-signature");
    if (signature) {
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

  // Fallback: CRON_SECRET bearer token (Vercel cron or manual calls)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // No auth configured — allow (dev mode)
  if (!cronSecret && !qstashCurrentSigningKey) return true;

  return false;
}

/**
 * Cron: Ayden's autonomous agency session.
 * Dual-triggered: Vercel cron (primary) + QStash (backup).
 * Dedup guard: skips if a session already ran in the last 20 minutes.
 */
export async function GET(request: NextRequest) {
  if (!(await verifyRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dedup: if a session already ran in the last 20 minutes, skip
  const recentSession = await prisma.aydenAgencySession.findFirst({
    where: { createdAt: { gte: new Date(Date.now() - 20 * 60 * 1000) } },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (recentSession) {
    const agoMin = Math.floor((Date.now() - recentSession.createdAt.getTime()) / 60000);
    console.log(`[agency-cron] Skipping — session ran ${agoMin}min ago (${recentSession.id})`);
    return NextResponse.json({ data: { skipped: true, reason: `Session ran ${agoMin}min ago` } });
  }

  try {
    const result = await executeAgency({ reason: "Scheduled agency session", source: "cron" });
    const errSuffix = result.errors.length > 0 ? ` errors=${result.errors.join(" | ")}` : "";
    console.log(
      `[agency-cron] acted=${result.acted} action=${result.action || "none"} summary=${(result.summary || "").substring(0, 200)}${errSuffix}`
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[agency-cron] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Agency cron failed: ${msg}` }, { status: 500 });
  }
}

// QStash sends POST requests
export async function POST(request: NextRequest) {
  return GET(request);
}
