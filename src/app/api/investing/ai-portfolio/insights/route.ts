import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ── Realized P&L from actual trade data (FIFO matching) ──
    const portfolio = await prisma.aiPortfolio.findFirst({
      where: { isActive: true },
    });

    interface RoundTrip {
      ticker: string;
      buyPrice: number;
      sellPrice: number;
      shares: number;
      pnl: number;
      closedAt: Date;
    }

    const roundTrips: RoundTrip[] = [];

    if (portfolio) {
      const allTrades = await prisma.aiTrade.findMany({
        where: { portfolioId: portfolio.id },
        orderBy: [{ ticker: "asc" }, { executedAt: "asc" }],
      });

      // Group by ticker
      const byTicker: Record<string, typeof allTrades> = {};
      for (const t of allTrades) {
        if (!byTicker[t.ticker]) byTicker[t.ticker] = [];
        byTicker[t.ticker].push(t);
      }

      // FIFO matching per ticker
      for (const [ticker, trades] of Object.entries(byTicker)) {
        const buyLots: { shares: number; price: number }[] = [];

        for (const t of trades) {
          const shares = Number(t.shares);
          const price = Number(t.price);

          if (t.side === "BUY") {
            buyLots.push({ shares, price });
          } else {
            // SELL — consume buy lots FIFO
            let remaining = shares;
            let totalCost = 0;

            while (remaining > 0 && buyLots.length > 0) {
              const lot = buyLots[0];
              const consumed = Math.min(remaining, lot.shares);
              totalCost += consumed * lot.price;
              lot.shares -= consumed;
              remaining -= consumed;
              if (lot.shares <= 0) buyLots.shift();
            }

            const sellRevenue = shares * price;
            const pnl = sellRevenue - totalCost;
            roundTrips.push({
              ticker,
              buyPrice: totalCost / shares,
              sellPrice: price,
              shares,
              pnl,
              closedAt: t.executedAt,
            });
          }
        }
      }
    }

    const totalRealizedPnl = roundTrips.reduce((sum, rt) => sum + rt.pnl, 0);
    const rtWins = roundTrips.filter((rt) => rt.pnl > 0.005);
    const rtLosses = roundTrips.filter((rt) => rt.pnl < -0.005);
    const rtBreakeven = roundTrips.filter((rt) => Math.abs(rt.pnl) <= 0.005);
    const avgWin = rtWins.length > 0
      ? rtWins.reduce((s, rt) => s + rt.pnl, 0) / rtWins.length
      : 0;
    const avgLoss = rtLosses.length > 0
      ? rtLosses.reduce((s, rt) => s + rt.pnl, 0) / rtLosses.length
      : 0;

    // Ticker performance from actual trades
    const tickerStats: Record<string, { wins: number; losses: number; breakeven: number; pnl: number }> = {};
    for (const rt of roundTrips) {
      if (!tickerStats[rt.ticker]) tickerStats[rt.ticker] = { wins: 0, losses: 0, breakeven: 0, pnl: 0 };
      if (rt.pnl > 0.005) tickerStats[rt.ticker].wins++;
      else if (rt.pnl < -0.005) tickerStats[rt.ticker].losses++;
      else tickerStats[rt.ticker].breakeven++;
      tickerStats[rt.ticker].pnl += rt.pnl;
    }

    const tickerPerformance = Object.entries(tickerStats)
      .map(([ticker, stats]) => ({
        ticker,
        trades: stats.wins + stats.losses + stats.breakeven,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.wins + stats.losses > 0
          ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
          : 0,
        pnl: Math.round(stats.pnl * 100) / 100,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    // Journal entries (for lessons, observations, timeline — not P&L)
    const closedTrades = await prisma.tradeJournal.findMany({
      where: {
        source: "sandbox",
        outcome: { in: ["win", "loss", "breakeven"] },
      },
      orderBy: { executedAt: "desc" },
    });

    // Lessons from trade journal (non-null lessons on closed trades)
    const lessonsEntries = await prisma.tradeJournal.findMany({
      where: {
        source: "sandbox",
        lessons: { not: null },
      },
      orderBy: { executedAt: "desc" },
      take: 20,
      select: {
        ticker: true,
        lessons: true,
        outcome: true,
        realizedPnl: true,
        executedAt: true,
      },
    });

    // Market observations
    const observations = await prisma.tradeJournal.findMany({
      where: {
        source: "sandbox",
        instrumentType: "observation",
      },
      orderBy: { executedAt: "desc" },
      take: 10,
      select: {
        reasoning: true,
        executedAt: true,
      },
    });

    // Trading rules (both active and pending)
    const rules = await prisma.tradingRule.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    const activeRules = rules.filter((r) => r.isActive);
    const pendingRules = rules.filter((r) => !r.isActive);

    // Best and worst trades (from actual FIFO round trips)
    const sortedByPnl = [...roundTrips].sort((a, b) => b.pnl - a.pnl);
    const bestTrades = sortedByPnl.slice(0, 3).map((rt) => ({
      ticker: rt.ticker,
      side: "SELL",
      pnl: Math.round(rt.pnl * 100) / 100,
      pnlPct: rt.buyPrice > 0 ? Math.round(((rt.sellPrice - rt.buyPrice) / rt.buyPrice) * 10000) / 100 : 0,
      reasoning: null as string | null,
      date: rt.closedAt.toISOString().split("T")[0],
    }));
    const worstTrades = sortedByPnl.slice(-3).reverse().map((rt) => ({
      ticker: rt.ticker,
      side: "SELL",
      pnl: Math.round(rt.pnl * 100) / 100,
      pnlPct: rt.buyPrice > 0 ? Math.round(((rt.sellPrice - rt.buyPrice) / rt.buyPrice) * 10000) / 100 : 0,
      reasoning: null as string | null,
      date: rt.closedAt.toISOString().split("T")[0],
    }));

    // Strategy breakdown (from journal — strategies aren't tracked in aiTrade)
    const strategyStats: Record<string, { count: number; wins: number; pnl: number }> = {};
    for (const t of closedTrades) {
      const strat = t.strategy || "untagged";
      if (!strategyStats[strat]) strategyStats[strat] = { count: 0, wins: 0, pnl: 0 };
      strategyStats[strat].count++;
      if (t.outcome === "win") strategyStats[strat].wins++;
      strategyStats[strat].pnl += Number(t.realizedPnl || 0);
    }

    const strategyPerformance = Object.entries(strategyStats).map(([strategy, stats]) => ({
      strategy,
      trades: stats.count,
      winRate: stats.count > 0 ? Math.round((stats.wins / stats.count) * 100) : 0,
      pnl: Math.round(stats.pnl * 100) / 100,
    }));

    // ── Evolution timeline ──
    // Cumulative P&L from actual round trips (chronological)
    const chronoRoundTrips = [...roundTrips].sort(
      (a, b) => a.closedAt.getTime() - b.closedAt.getTime()
    );

    let cumPnl = 0;
    let cumWins = 0;
    let cumTotal = 0;
    const cumulativeData = chronoRoundTrips.map((rt) => {
      cumPnl += rt.pnl;
      cumTotal++;
      if (rt.pnl > 0.005) cumWins++;
      const outcome = rt.pnl > 0.005 ? "win" : rt.pnl < -0.005 ? "loss" : "breakeven";
      return {
        date: rt.closedAt.toISOString(),
        cumulativePnl: Math.round(cumPnl * 100) / 100,
        winRate: Math.round((cumWins / cumTotal) * 100),
        tradeNum: cumTotal,
        ticker: rt.ticker,
        outcome,
        pnl: Math.round(rt.pnl * 100) / 100,
      };
    });

    // Journal trades for timeline
    const chronoTrades = [...closedTrades].sort(
      (a, b) => a.executedAt.getTime() - b.executedAt.getTime()
    );

    // Timeline events: merge trades, rules, and lessons chronologically
    interface TimelineEvent {
      date: string;
      type: "trade" | "rule_proposed" | "rule_approved" | "lesson" | "observation";
      title: string;
      detail: string | null;
      outcome?: string | null;
      pnl?: number | null;
    }
    const timeline: TimelineEvent[] = [];

    // Add closed trades
    for (const t of chronoTrades) {
      timeline.push({
        date: t.executedAt.toISOString(),
        type: "trade",
        title: `${t.side.replace("_TO_", " to ").toLowerCase()} ${t.ticker}`,
        detail: t.reasoning || null,
        outcome: t.outcome,
        pnl: t.realizedPnl ? Math.round(Number(t.realizedPnl) * 100) / 100 : null,
      });
    }

    // Add rules (with creation dates)
    for (const r of rules) {
      timeline.push({
        date: r.createdAt.toISOString(),
        type: r.isActive ? "rule_approved" : "rule_proposed",
        title: `${r.category} rule: ${r.rule}`,
        detail: r.performance || null,
      });
    }

    // Add lessons
    for (const l of lessonsEntries) {
      if (l.lessons) {
        timeline.push({
          date: l.executedAt.toISOString(),
          type: "lesson",
          title: `Lesson from ${l.ticker} (${l.outcome})`,
          detail: l.lessons,
          pnl: l.realizedPnl ? Math.round(Number(l.realizedPnl) * 100) / 100 : null,
        });
      }
    }

    // Add observations
    for (const o of observations) {
      if (o.reasoning) {
        timeline.push({
          date: o.executedAt.toISOString(),
          type: "observation",
          title: "Market observation",
          detail: o.reasoning,
        });
      }
    }

    // Sort timeline chronologically (newest first for display)
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Strategy evolution: what strategies were used over time
    const strategyByMonth: Record<string, Record<string, number>> = {};
    for (const t of chronoTrades) {
      const month = t.executedAt.toISOString().slice(0, 7); // "YYYY-MM"
      const strat = t.strategy || "untagged";
      if (!strategyByMonth[month]) strategyByMonth[month] = {};
      strategyByMonth[month][strat] = (strategyByMonth[month][strat] || 0) + 1;
    }

    const strategyEvolution = Object.entries(strategyByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, strats]) => ({
        month,
        strategies: strats,
        dominant: Object.entries(strats).sort((a, b) => b[1] - a[1])[0]?.[0] || "none",
      }));

    return NextResponse.json({
      data: {
        performance: {
          totalTrades: roundTrips.length,
          wins: rtWins.length,
          losses: rtLosses.length,
          breakeven: rtBreakeven.length,
          winRate: roundTrips.length > 0 ? Math.round((rtWins.length / roundTrips.length) * 100) : 0,
          totalPnl: Math.round(totalRealizedPnl * 100) / 100,
          avgWin: Math.round(avgWin * 100) / 100,
          avgLoss: Math.round(avgLoss * 100) / 100,
          profitFactor: Math.abs(avgLoss) > 0 ? Math.round((avgWin / Math.abs(avgLoss)) * 100) / 100 : 0,
        },
        tickerPerformance,
        strategyPerformance,
        bestTrades,
        worstTrades,
        lessons: lessonsEntries.map((l) => ({
          ticker: l.ticker,
          lessons: l.lessons,
          outcome: l.outcome,
          pnl: l.realizedPnl ? Number(l.realizedPnl) : null,
          date: l.executedAt.toISOString().split("T")[0],
        })),
        observations: observations.map((o) => ({
          text: o.reasoning,
          date: o.executedAt.toISOString().split("T")[0],
        })),
        rules: {
          active: activeRules.map((r) => ({
            id: r.id,
            category: r.category,
            rule: r.rule,
            source: r.source,
            performance: r.performance,
          })),
          pending: pendingRules.map((r) => ({
            id: r.id,
            category: r.category,
            rule: r.rule,
            rationale: r.performance,
          })),
        },
        evolution: {
          cumulativeData,
          timeline: timeline.slice(0, 50),
          strategyEvolution,
        },
      },
    });
  } catch (error) {
    console.error("Failed to get trading insights:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to get insights: ${msg}` }, { status: 500 });
  }
}
