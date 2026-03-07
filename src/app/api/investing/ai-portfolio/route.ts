import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const portfolio = await prisma.aiPortfolio.findFirst({
      where: { isActive: true },
      include: {
        positions: { orderBy: { ticker: "asc" } },
        trades: { orderBy: { executedAt: "desc" }, take: 50 },
      },
    });

    if (!portfolio) {
      return NextResponse.json({ data: null });
    }

    // Attach current quotes to positions
    const quotes = await prisma.stockQuote.findMany();
    const quoteMap = new Map(quotes.map((q) => [q.ticker, {
      price: Number(q.price),
      change: q.change ? Number(q.change) : null,
      changePct: q.changePct ? Number(q.changePct) : null,
    }]));

    const positionsWithQuotes = portfolio.positions.map((p) => {
      const quote = quoteMap.get(p.ticker);
      const currentPrice = quote?.price || Number(p.avgCostBasis);
      const shares = Number(p.shares);
      const costBasis = Number(p.avgCostBasis);
      const marketValue = shares * currentPrice;
      const totalCost = shares * costBasis;
      const pnl = marketValue - totalCost;
      const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

      return {
        ...p,
        shares: p.shares.toString(),
        avgCostBasis: p.avgCostBasis.toString(),
        currentPrice,
        dailyChange: quote?.change || null,
        dailyChangePct: quote?.changePct || null,
        marketValue,
        pnl,
        pnlPct,
      };
    });

    const holdingsValue = positionsWithQuotes.reduce((sum, p) => sum + p.marketValue, 0);
    const cashBalance = Number(portfolio.cashBalance);
    const totalValue = cashBalance + holdingsValue;
    const startingCapital = Number(portfolio.startingCapital);
    const totalReturn = ((totalValue - startingCapital) / startingCapital) * 100;

    return NextResponse.json({
      data: {
        id: portfolio.id,
        name: portfolio.name,
        cashBalance,
        startingCapital,
        inceptionDate: portfolio.inceptionDate,
        totalValue,
        holdingsValue,
        totalReturn,
        positions: positionsWithQuotes,
        trades: portfolio.trades.map((t) => ({
          ...t,
          shares: t.shares.toString(),
          price: t.price.toString(),
          total: t.total.toString(),
        })),
      },
    });
  } catch (error) {
    console.error("Failed to get AI portfolio:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to get AI portfolio: ${msg}` }, { status: 500 });
  }
}
