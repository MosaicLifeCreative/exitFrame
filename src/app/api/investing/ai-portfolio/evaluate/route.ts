import { NextResponse } from "next/server";
import { fetchAndStoreQuotes } from "@/lib/investing/quotes";
import { evaluateTrades, executeTrades, getAllTradableTickers } from "@/lib/investing/aiTrader";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const log: string[] = [];

  try {
    // Fetch fresh quotes for full ticker universe
    const allTickers = await getAllTradableTickers();
    const quotes = await fetchAndStoreQuotes(allTickers);
    log.push(`Fetched quotes for ${quotes.size}/${allTickers.length} tickers`);

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
