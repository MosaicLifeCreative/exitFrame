import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAndStoreQuotes } from "@/lib/investing/quotes";
import { evaluateTrades, executeTrades } from "@/lib/investing/aiTrader";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const log: string[] = [];

  try {
    // Fetch fresh quotes first
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

    // Evaluate trades
    const decisions = await evaluateTrades();
    const tradeActions = decisions.filter((d) => d.action !== "HOLD");
    log.push(`${decisions.length} decisions, ${tradeActions.length} actionable`);

    if (tradeActions.length > 0) {
      const result = await executeTrades(decisions);
      log.push(`Executed ${result.executed} trades`);
      if (result.errors.length > 0) {
        log.push(`Errors: ${result.errors.join("; ")}`);
      }
    }

    const holds = decisions.filter((d) => d.action === "HOLD");
    if (holds.length > 0) {
      log.push(`Hold: ${holds[0].reasoning}`);
    }

    return NextResponse.json({
      data: {
        decisions: decisions.length,
        executed: tradeActions.length,
        log,
      },
    });
  } catch (error) {
    console.error("Evaluate trades error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Evaluation failed: ${msg}`, log }, { status: 500 });
  }
}
