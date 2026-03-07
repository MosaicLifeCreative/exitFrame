import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAndStoreQuotes, isMarketOpen, isMarketCloseWindow, shouldCrawlNews } from "@/lib/investing/quotes";
import { evaluateTrades, executeTrades } from "@/lib/investing/aiTrader";
import { takePortfolioSnapshots } from "@/lib/investing/snapshots";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for this endpoint

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log: string[] = [];
  const marketOpen = isMarketOpen();
  const closeWindow = isMarketCloseWindow();
  const crawlTime = shouldCrawlNews();

  log.push(`Market open: ${marketOpen}, Close window: ${closeWindow}, Crawl time: ${crawlTime}`);

  // If market is closed and not in close window, skip everything
  if (!marketOpen && !closeWindow) {
    return NextResponse.json({ data: { message: "Market closed", log } });
  }

  try {
    // Step 1: Fetch quotes for all relevant tickers
    const userHoldings = await prisma.portfolioHolding.findMany({
      where: { isActive: true },
      select: { ticker: true },
    });
    const watchlist = await prisma.watchlistItem.findMany({
      where: { isActive: true, type: "ticker" },
      select: { value: true },
    });
    const aiPortfolio = await prisma.aiPortfolio.findFirst({
      where: { isActive: true },
      include: { positions: { select: { ticker: true } } },
    });

    const allTickers = Array.from(new Set([
      ...userHoldings.map((h) => h.ticker),
      ...watchlist.map((w) => w.value),
      ...(aiPortfolio?.positions.map((p) => p.ticker) || []),
    ]));

    const quotes = await fetchAndStoreQuotes(allTickers);
    log.push(`Fetched quotes for ${quotes.size} tickers`);

    // Step 2: News crawl (3x/day: open, midday, close)
    if (crawlTime) {
      try {
        const crawlRes = await fetch(new URL("/api/investing/crawl-news", request.url), {
          method: "POST",
        });
        if (crawlRes.ok) {
          const crawlData = await crawlRes.json();
          log.push(`News crawl: ${crawlData.data?.fetched || 0} fetched, ${crawlData.data?.analyzed || 0} analyzed`);
        } else {
          log.push(`News crawl failed: ${crawlRes.status}`);
        }
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
