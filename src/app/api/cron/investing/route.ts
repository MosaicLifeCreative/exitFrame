import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { fetchAndStoreQuotes, isMarketOpen, isMarketCloseWindow, shouldCrawlNews } from "@/lib/investing/quotes";
import { evaluateTrades, executeTrades, getAllTradableTickers } from "@/lib/investing/aiTrader";
import { takePortfolioSnapshots } from "@/lib/investing/snapshots";
import { crawlNews } from "@/lib/investing/newsCrawler";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

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

async function runCron() {
  const log: string[] = [];
  const marketOpen = isMarketOpen();
  const closeWindow = isMarketCloseWindow();
  const crawlTime = shouldCrawlNews();

  log.push(`Market open: ${marketOpen}, Close window: ${closeWindow}, Crawl time: ${crawlTime}`);

  // If market is closed, not in close window, AND not crawl time, skip everything
  if (!marketOpen && !closeWindow && !crawlTime) {
    return NextResponse.json({ data: { message: "Market closed", log } });
  }

  try {
    // Step 1: Fetch quotes for full ticker universe (base + news-discovered + user + AI)
    const allTickers = await getAllTradableTickers();
    const quotes = await fetchAndStoreQuotes(allTickers);
    log.push(`Fetched quotes for ${quotes.size}/${allTickers.length} tickers`);

    // Step 2: News crawl (3x/day: open, midday, close)
    if (crawlTime) {
      try {
        const crawlResult = await crawlNews();
        log.push(`News crawl: ${crawlResult.fetched} fetched, ${crawlResult.stored} stored, ${crawlResult.analyzed} analyzed`);
      } catch (err) {
        log.push(`News crawl error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 3: AI trade evaluation (every hour during market hours)
    if (marketOpen) {
      try {
        const decisions = await evaluateTrades();
        const tradeActions = decisions.filter((d) => d.action !== "HOLD");
        log.push(`Trade evaluation: ${decisions.length} decisions, ${tradeActions.length} actionable`);

        if (tradeActions.length > 0) {
          const result = await executeTrades(decisions);
          log.push(`Trades executed: ${result.executed}`);
          if (result.errors.length > 0) {
            log.push(`Trade errors: ${result.errors.join("; ")}`);
          }
        }

        // Log HOLD reasoning
        const holds = decisions.filter((d) => d.action === "HOLD");
        if (holds.length > 0) {
          log.push(`Hold reasoning: ${holds[0].reasoning}`);
        }
      } catch (err) {
        log.push(`Trade evaluation error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 4: EOD snapshots (at market close)
    if (closeWindow) {
      try {
        const snapshots = await takePortfolioSnapshots();
        log.push(`Snapshots: user=${snapshots.user}, ai=${snapshots.ai}`);
      } catch (err) {
        log.push(`Snapshot error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({ data: { message: "Cron complete", log } });
  } catch (error) {
    console.error("Investing cron error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Cron failed: ${msg}`, log }, { status: 500 });
  }
}

// GET: Vercel daily cron
export async function GET(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}

// POST: QStash hourly schedule
export async function POST(request: NextRequest) {
  const authorized = await verifyRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCron();
}
