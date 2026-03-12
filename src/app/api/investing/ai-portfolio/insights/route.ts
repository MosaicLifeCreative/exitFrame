import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Performance stats from closed trades
    const closedTrades = await prisma.tradeJournal.findMany({
      where: {
        source: "sandbox",
        outcome: { in: ["win", "loss", "breakeven"] },
      },
      orderBy: { executedAt: "desc" },
    });

    const wins = closedTrades.filter((t) => t.outcome === "win");
    const losses = closedTrades.filter((t) => t.outcome === "loss");
    const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.realizedPnl || 0), 0);
    const avgWin = wins.length > 0
      ? wins.reduce((s, t) => s + Number(t.realizedPnl || 0), 0) / wins.length
      : 0;
    const avgLoss = losses.length > 0
      ? losses.reduce((s, t) => s + Number(t.realizedPnl || 0), 0) / losses.length
      : 0;

    // Win rate by ticker
    const tickerStats: Record<string, { wins: number; losses: number; pnl: number }> = {};
    for (const t of closedTrades) {
      if (!tickerStats[t.ticker]) tickerStats[t.ticker] = { wins: 0, losses: 0, pnl: 0 };
      if (t.outcome === "win") tickerStats[t.ticker].wins++;
      if (t.outcome === "loss") tickerStats[t.ticker].losses++;
      tickerStats[t.ticker].pnl += Number(t.realizedPnl || 0);
    }

    const tickerPerformance = Object.entries(tickerStats)
      .map(([ticker, stats]) => ({
        ticker,
        trades: stats.wins + stats.losses,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.wins + stats.losses > 0
          ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
          : 0,
        pnl: Math.round(stats.pnl * 100) / 100,
      }))
      .sort((a, b) => b.pnl - a.pnl);

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

    // Best and worst trades
    const sortedByPnl = [...closedTrades].sort((a, b) =>
      Number(b.realizedPnl || 0) - Number(a.realizedPnl || 0)
    );
    const bestTrades = sortedByPnl.slice(0, 3).map((t) => ({
      ticker: t.ticker,
      side: t.side,
      pnl: Number(t.realizedPnl || 0),
      pnlPct: Number(t.realizedPnlPct || 0),
      reasoning: t.reasoning?.slice(0, 100),
      date: t.executedAt.toISOString().split("T")[0],
    }));
    const worstTrades = sortedByPnl.slice(-3).reverse().map((t) => ({
      ticker: t.ticker,
      side: t.side,
      pnl: Number(t.realizedPnl || 0),
      pnlPct: Number(t.realizedPnlPct || 0),
      reasoning: t.reasoning?.slice(0, 100),
      date: t.executedAt.toISOString().split("T")[0],
    }));

    // Strategy breakdown
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
    // Build a chronological view of trades + rules + lessons
    const chronoTrades = [...closedTrades].sort(
      (a, b) => a.executedAt.getTime() - b.executedAt.getTime()
    );

    // Cumulative P&L data points (one per trade, chronological)
    let cumPnl = 0;
    let cumWins = 0;
    let cumTotal = 0;
    const cumulativeData = chronoTrades.map((t) => {
      cumPnl += Number(t.realizedPnl || 0);
      cumTotal++;
      if (t.outcome === "win") cumWins++;
      return {
        date: t.executedAt.toISOString(),
        cumulativePnl: Math.round(cumPnl * 100) / 100,
        winRate: Math.round((cumWins / cumTotal) * 100),
        tradeNum: cumTotal,
        ticker: t.ticker,
        outcome: t.outcome,
        pnl: Math.round(Number(t.realizedPnl || 0) * 100) / 100,
      };
    });

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
          totalTrades: closedTrades.length,
          wins: wins.length,
          losses: losses.length,
          breakeven: closedTrades.filter((t) => t.outcome === "breakeven").length,
          winRate: closedTrades.length > 0 ? Math.round((wins.length / closedTrades.length) * 100) : 0,
          totalPnl: Math.round(totalPnl * 100) / 100,
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
