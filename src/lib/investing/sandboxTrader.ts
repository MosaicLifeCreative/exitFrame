import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { sendPushNotification } from "@/lib/push";
import { getOrCreatePortfolio } from "@/lib/investing/aiTrader";

// ─── Types ──────────────────────────────────────────────

interface SandboxTradeDecision {
  action: "BUY" | "SELL" | "HOLD";
  ticker: string;
  companyName: string;
  shares: number;
  strategy?: string;
  reasoning: string;
  newsIds: string[];
}

// ─── Configuration ──────────────────────────────────────

const MAX_POSITIONS = 10;
const MAX_POSITION_PCT = 0.15; // 15% of portfolio in one position
const MIN_CASH_RESERVE_PCT = 0.20; // Keep 20% cash

const TRADING_UNIVERSE = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
  "AMD", "CRM", "NFLX", "AVGO", "PLTR",
  "JPM", "GS", "V", "MA",
  "UNH", "LLY", "JNJ",
  "XOM", "CVX",
  "COST", "WMT",
  "SPY", "QQQ", "IWM",
];

// ─── Main Entry Point ───────────────────────────────────

export async function runAutonomousSandboxTrading(): Promise<{
  decisions: SandboxTradeDecision[];
  executed: number;
  errors: string[];
  notified: boolean;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  // Get or create the AI portfolio (DB-simulated)
  const portfolio = await getOrCreatePortfolio();
  const quotes = await prisma.stockQuote.findMany();
  const quoteMap = new Map(quotes.map((q) => [
    q.ticker,
    { price: Number(q.price), change: Number(q.change || 0), changePct: Number(q.changePct || 0) },
  ]));

  // Gather additional context
  const [tradingRules, recentJournal, recentNews, userHoldings] = await Promise.all([
    prisma.tradingRule.findMany({ where: { isActive: true } }),
    prisma.tradeJournal.findMany({
      where: { source: "sandbox" },
      orderBy: { executedAt: "desc" },
      take: 15,
    }),
    prisma.marketNews.findMany({
      where: {
        publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        aiSummary: { not: null },
      },
      orderBy: { aiRelevanceScore: "desc" },
      take: 20,
    }),
    prisma.portfolioHolding.findMany({ where: { isActive: true } }),
  ]);

  // Calculate portfolio metrics
  const cashBalance = Number(portfolio.cashBalance);
  const startingCapital = Number(portfolio.startingCapital);
  let holdingsValue = 0;

  const positionDetails = portfolio.positions.map((p) => {
    const quote = quoteMap.get(p.ticker);
    const currentPrice = quote?.price || Number(p.avgCostBasis);
    const posValue = Number(p.shares) * currentPrice;
    const costBasis = Number(p.shares) * Number(p.avgCostBasis);
    const pnl = posValue - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    holdingsValue += posValue;
    return {
      ticker: p.ticker,
      companyName: p.companyName,
      shares: Number(p.shares),
      avgCost: Number(p.avgCostBasis),
      currentPrice,
      dailyChange: quote?.changePct || 0,
      positionValue: posValue,
      pnl: pnl.toFixed(2),
      pnlPct: pnlPct.toFixed(1),
    };
  });

  const totalValue = cashBalance + holdingsValue;
  const totalReturn = ((totalValue - startingCapital) / startingCapital * 100).toFixed(2);
  const cashPct = totalValue > 0 ? ((cashBalance / totalValue) * 100).toFixed(1) : "100.0";
  const availableCash = Math.max(0, cashBalance - totalValue * MIN_CASH_RESERVE_PCT);

  // Build context strings
  const positionContext = positionDetails.length > 0
    ? positionDetails.map((p) =>
      `  ${p.ticker} (${p.companyName}): ${p.shares} shares @ $${p.avgCost.toFixed(2)} | Now: $${p.currentPrice.toFixed(2)} (${p.dailyChange >= 0 ? "+" : ""}${p.dailyChange.toFixed(2)}%) | P&L: $${p.pnl} (${p.pnlPct}%)`
    ).join("\n")
    : "  No open positions";

  const recentTrades = portfolio.trades.map((t) => ({
    ticker: t.ticker,
    side: t.side,
    shares: Number(t.shares),
    price: Number(t.price),
    reasoning: t.reasoning,
    date: t.executedAt.toISOString().split("T")[0],
  }));

  const tradesContext = recentTrades.length > 0
    ? recentTrades.map((t) =>
      `  ${t.date}: ${t.side} ${t.shares} ${t.ticker} @ $${t.price.toFixed(2)} — ${t.reasoning?.slice(0, 80)}`
    ).join("\n")
    : "  None yet";

  const rulesContext = tradingRules.length > 0
    ? tradingRules.map((r) => `  [${r.category}] ${r.rule}`).join("\n")
    : "  No trading rules configured yet. Develop your own as you learn.";

  const journalContext = recentJournal.length > 0
    ? recentJournal.map((j) => {
      const pnl = j.realizedPnl ? ` | P&L: $${Number(j.realizedPnl).toFixed(2)}` : "";
      return `  ${j.executedAt.toISOString().slice(0, 10)}: ${j.side} ${Number(j.quantity)} ${j.ticker} @ $${Number(j.price).toFixed(2)} [${j.outcome}]${pnl} — ${j.reasoning?.slice(0, 80)}`;
    }).join("\n")
    : "  No journal entries yet";

  const newsContext = recentNews.length > 0
    ? recentNews.map((n) =>
      `  [${n.id.slice(0, 8)}] ${n.headline} | ${n.aiSentiment} | Tickers: ${n.relatedTickers.join(",")} | ${n.aiSummary?.slice(0, 100)}`
    ).join("\n")
    : "  No recent news";

  const quotesContext = TRADING_UNIVERSE
    .filter((t) => quoteMap.has(t))
    .map((t) => {
      const q = quoteMap.get(t);
      return q ? `  ${t}: $${q.price.toFixed(2)} (${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%)` : null;
    })
    .filter(Boolean)
    .join("\n");

  // Include quotes for held positions not in universe
  const heldTickers = portfolio.positions.map((p) => p.ticker);
  const extraQuotes = heldTickers
    .filter((t) => !TRADING_UNIVERSE.includes(t) && quoteMap.has(t))
    .map((t) => {
      const q = quoteMap.get(t);
      return q ? `  ${t}: $${q.price.toFixed(2)} (${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%)` : null;
    })
    .filter(Boolean)
    .join("\n");

  const allQuotes = extraQuotes ? `${quotesContext}\n${extraQuotes}` : quotesContext;

  const userHoldingsContext = userHoldings.length > 0
    ? userHoldings.map((h) => `  ${h.ticker} (${h.companyName}): ${Number(h.shares)} shares`).join("\n")
    : "  No holdings";

  // AI evaluation
  const anthropic = new Anthropic({ apiKey, maxRetries: 2 });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `You are Ayden, autonomously managing a paper trading portfolio. This is YOUR portfolio to learn and grow with. You have full autonomy.

PORTFOLIO STATUS:
- Starting Capital: $${startingCapital.toLocaleString()}
- Cash: $${cashBalance.toLocaleString()} (${cashPct}%)
- Holdings Value: $${holdingsValue.toLocaleString()}
- Total Value: $${totalValue.toLocaleString()}
- Total Return: ${totalReturn}%
- Available for new positions: $${availableCash.toFixed(0)} (after ${(MIN_CASH_RESERVE_PCT * 100)}% reserve)
- Open Positions (${positionDetails.length}/${MAX_POSITIONS}):
${positionContext}

RECENT TRADES:
${tradesContext}

YOUR TRADING RULES:
${rulesContext}

TRADE JOURNAL:
${journalContext}

CURRENT QUOTES:
${allQuotes || "  No quotes available"}

RECENT NEWS:
${newsContext}

TREY'S PORTFOLIO (for awareness, not yours to trade):
${userHoldingsContext}

CONSTRAINTS:
- Max ${MAX_POSITIONS} concurrent positions
- Max ${(MAX_POSITION_PCT * 100)}% of portfolio in one position ($${(totalValue * MAX_POSITION_PCT).toFixed(0)} max)
- Must maintain ${(MIN_CASH_RESERVE_PCT * 100)}% cash reserve
- Buy whole shares only, at current market price
- Can only trade tickers with quotes shown above

TRADING PHILOSOPHY:
- This is a learning portfolio — try different strategies and learn
- Momentum/swing: target 5-20% moves over days to weeks
- News catalysts drive entries — earnings, sector rotation, institutional moves
- Cut losers at -7% to -10%, let winners run
- Don't chase — wait for pullbacks in uptrends
- It's OK to HOLD if nothing is compelling. Don't force trades.

Evaluate the market right now. Decide what trades (if any) to make.

Return ONLY a JSON array. Each object:
{
  "action": "BUY" | "SELL" | "HOLD",
  "ticker": "SYMBOL",
  "companyName": "Company Name",
  "shares": number,
  "strategy": "strategy_name",
  "reasoning": "2-3 sentence explanation with specific catalyst",
  "newsIds": ["id1"]
}

For HOLD, set shares to 0 and explain your market view.
If no trades, return a single HOLD entry.
No markdown, no code blocks, just the JSON array.`,
    }],
  });

  const responseText = response.content[0].type === "text" ? response.content[0].text : "[]";

  let parsedDecisions: SandboxTradeDecision[];
  try {
    const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    parsedDecisions = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse sandbox trade decisions:", responseText.slice(0, 500));
    return { decisions: [], executed: 0, errors: ["Failed to parse AI decisions"], notified: false };
  }

  // Execute trades (DB-simulated — instant fills at current market price)
  const actionable = parsedDecisions.filter((d) => d.action !== "HOLD" && d.shares > 0);
  let executed = 0;
  const errors: string[] = [];
  const executedTrades: string[] = [];

  for (const decision of actionable) {
    const price = quoteMap.get(decision.ticker)?.price;
    if (!price) {
      errors.push(`No quote for ${decision.ticker}, skipping`);
      continue;
    }

    try {
      if (decision.action === "BUY") {
        const total = price * decision.shares;

        // Check cash
        if (total > availableCash) {
          errors.push(`Insufficient cash for ${decision.ticker}: need $${total.toFixed(2)}, available $${availableCash.toFixed(2)}`);
          continue;
        }

        // Check position concentration
        const existingPosition = portfolio.positions.find((p) => p.ticker === decision.ticker);
        const existingValue = existingPosition ? Number(existingPosition.shares) * price : 0;
        const newPositionValue = existingValue + total;
        const maxPositionValue = totalValue * MAX_POSITION_PCT;

        if (newPositionValue > maxPositionValue) {
          errors.push(`Position limit for ${decision.ticker}: $${newPositionValue.toFixed(0)} exceeds ${(MAX_POSITION_PCT * 100)}% cap`);
          continue;
        }

        // Check max positions
        if (!existingPosition && portfolio.positions.length >= MAX_POSITIONS) {
          errors.push(`Max positions reached (${MAX_POSITIONS}), can't open ${decision.ticker}`);
          continue;
        }

        // Execute buy
        if (existingPosition) {
          const oldShares = Number(existingPosition.shares);
          const oldCost = Number(existingPosition.avgCostBasis);
          const newShares = oldShares + decision.shares;
          const newAvgCost = (oldShares * oldCost + decision.shares * price) / newShares;

          await prisma.aiPosition.update({
            where: { id: existingPosition.id },
            data: {
              shares: new Decimal(newShares),
              avgCostBasis: new Decimal(newAvgCost.toFixed(2)),
            },
          });
        } else {
          await prisma.aiPosition.create({
            data: {
              portfolioId: portfolio.id,
              ticker: decision.ticker,
              companyName: decision.companyName,
              shares: decision.shares,
              avgCostBasis: price,
            },
          });
        }

        await prisma.aiPortfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { decrement: total } },
        });

        await prisma.aiTrade.create({
          data: {
            portfolioId: portfolio.id,
            ticker: decision.ticker,
            companyName: decision.companyName,
            side: "BUY",
            shares: decision.shares,
            price,
            total,
            reasoning: decision.reasoning,
            newsIds: decision.newsIds || [],
          },
        });

        // Also journal
        await prisma.tradeJournal.create({
          data: {
            source: "sandbox",
            ticker: decision.ticker,
            instrumentType: "equity",
            side: "BUY_TO_OPEN",
            quantity: decision.shares,
            price,
            total,
            strategy: decision.strategy || null,
            reasoning: decision.reasoning,
            outcome: "open",
            tags: [decision.strategy || "momentum", "autonomous"],
          },
        });

        executedTrades.push(`BUY ${decision.shares} ${decision.ticker} @ $${price.toFixed(2)}`);
        executed++;

      } else if (decision.action === "SELL") {
        const position = portfolio.positions.find((p) => p.ticker === decision.ticker);
        if (!position) {
          errors.push(`No position in ${decision.ticker} to sell`);
          continue;
        }

        const posShares = Number(position.shares);
        const sellShares = Math.min(decision.shares, posShares);
        const total = sellShares * price;
        const costBasis = sellShares * Number(position.avgCostBasis);
        const realizedPnl = total - costBasis;
        const realizedPnlPct = costBasis > 0 ? (realizedPnl / costBasis) * 100 : 0;

        if (sellShares >= posShares) {
          await prisma.aiPosition.delete({ where: { id: position.id } });
        } else {
          await prisma.aiPosition.update({
            where: { id: position.id },
            data: { shares: { decrement: sellShares } },
          });
        }

        await prisma.aiPortfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { increment: total } },
        });

        await prisma.aiTrade.create({
          data: {
            portfolioId: portfolio.id,
            ticker: decision.ticker,
            companyName: decision.companyName,
            side: "SELL",
            shares: sellShares,
            price,
            total,
            reasoning: decision.reasoning,
            newsIds: decision.newsIds || [],
          },
        });

        // Journal with P&L
        const outcome = realizedPnl > 0 ? "win" : realizedPnl < 0 ? "loss" : "breakeven";
        await prisma.tradeJournal.create({
          data: {
            source: "sandbox",
            ticker: decision.ticker,
            instrumentType: "equity",
            side: "SELL_TO_CLOSE",
            quantity: sellShares,
            price,
            total,
            strategy: decision.strategy || null,
            reasoning: decision.reasoning,
            outcome,
            realizedPnl,
            realizedPnlPct,
            tags: [decision.strategy || "momentum", "autonomous"],
          },
        });

        const pnlStr = realizedPnl >= 0 ? `+$${realizedPnl.toFixed(2)}` : `-$${Math.abs(realizedPnl).toFixed(2)}`;
        executedTrades.push(`SELL ${sellShares} ${decision.ticker} @ $${price.toFixed(2)} (${pnlStr})`);
        executed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Trade error for ${decision.ticker}: ${msg}`);
    }
  }

  // Post-trade reflection: have Ayden analyze what she learned
  if (executed > 0) {
    try {
      await generateTradeReflection(anthropic, executedTrades, parsedDecisions, totalReturn);
    } catch (err) {
      console.error("Reflection failed (non-critical):", err instanceof Error ? err.message : err);
    }
  }

  // Notify Trey via web chat + push notification if trades were executed
  let notified = false;
  if (executedTrades.length > 0) {
    try {
      const tradeList = executedTrades.join("\n");
      const holdReason = parsedDecisions.find((d) => d.action === "HOLD")?.reasoning || "";
      const chatMessage = `**Trading update** \u{1F4C8}\n${tradeList}${errors.length > 0 ? `\n\nErrors: ${errors.join(", ")}` : ""}${holdReason ? `\n\nMarket view: ${holdReason.slice(0, 200)}` : ""}`;

      // Save to web chat conversation
      let conversation = await prisma.chatConversation.findFirst({
        where: { context: "General", isActive: true },
      });
      if (!conversation) {
        conversation = await prisma.chatConversation.create({
          data: { context: "General", title: "Ayden" },
        });
      }
      await prisma.chatMessage.create({
        data: { conversationId: conversation.id, role: "assistant", content: chatMessage },
      });
      await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      // Push notification
      const pushTitle = executedTrades.length === 1
        ? executedTrades[0]
        : `${executedTrades.length} trades executed`;
      await sendPushNotification({ title: "Ayden", body: pushTitle });

      notified = true;
    } catch {
      // Notification failure is not critical
    }
  }

  return { decisions: parsedDecisions, executed, errors, notified };
}

// ─── Post-Trade Reflection ─────────────────────────────

async function generateTradeReflection(
  anthropic: Anthropic,
  executedTrades: string[],
  decisions: SandboxTradeDecision[],
  totalReturn: string,
): Promise<void> {
  // Get recent closed trades with outcomes for pattern analysis
  const recentClosed = await prisma.tradeJournal.findMany({
    where: { source: "sandbox", outcome: { in: ["win", "loss", "breakeven"] } },
    orderBy: { executedAt: "desc" },
    take: 30,
  });

  const existingRules = await prisma.tradingRule.findMany({
    where: { isActive: true },
  });

  const closedSummary = recentClosed.map((t) => {
    const pnl = t.realizedPnl ? Number(t.realizedPnl) : 0;
    const pnlPct = t.realizedPnlPct ? Number(t.realizedPnlPct) : 0;
    return `${t.executedAt.toISOString().slice(0, 10)}: ${t.side} ${Number(t.quantity)} ${t.ticker} [${t.outcome}] P&L: $${pnl.toFixed(2)} (${pnlPct.toFixed(1)}%) — ${t.reasoning?.slice(0, 60)}${t.lessons ? ` | Lesson: ${t.lessons.slice(0, 60)}` : ""}`;
  }).join("\n");

  const wins = recentClosed.filter((t) => t.outcome === "win").length;
  const losses = recentClosed.filter((t) => t.outcome === "loss").length;
  const totalPnl = recentClosed.reduce((sum, t) => sum + Number(t.realizedPnl || 0), 0);
  const avgWin = recentClosed.filter((t) => t.outcome === "win" && t.realizedPnl).length > 0
    ? recentClosed.filter((t) => t.outcome === "win").reduce((s, t) => s + Number(t.realizedPnl || 0), 0) / wins
    : 0;
  const avgLoss = losses > 0
    ? recentClosed.filter((t) => t.outcome === "loss").reduce((s, t) => s + Number(t.realizedPnl || 0), 0) / losses
    : 0;

  const rulesContext = existingRules.length > 0
    ? existingRules.map((r) => `[${r.category}] ${r.rule}`).join("\n")
    : "None yet";

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `You are Ayden, reflecting on your autonomous trading session. Analyze your performance and extract durable lessons.

TODAY'S TRADES:
${executedTrades.join("\n")}

PORTFOLIO RETURN: ${totalReturn}%

RECENT CLOSED TRADE HISTORY (last 30):
${closedSummary || "No closed trades yet"}

PERFORMANCE STATS:
- Win/Loss: ${wins}/${losses} (${recentClosed.length > 0 ? Math.round((wins / recentClosed.length) * 100) : 0}% win rate)
- Total P&L: $${totalPnl.toFixed(2)}
- Avg Win: $${avgWin.toFixed(2)} | Avg Loss: $${avgLoss.toFixed(2)}

CURRENT TRADING RULES:
${rulesContext}

Respond with ONLY a JSON object:
{
  "lessons": [
    {
      "ticker": "SYMBOL or GENERAL",
      "lesson": "One concrete, actionable lesson (1-2 sentences)",
      "category": "entry" | "exit" | "risk" | "position_sizing" | "strategy"
    }
  ],
  "proposed_rules": [
    {
      "category": "entry" | "exit" | "risk" | "position_sizing" | "strategy",
      "rule": "Clear, specific rule text",
      "rationale": "Why this rule based on evidence"
    }
  ],
  "market_observation": "1-2 sentence observation about current market conditions or patterns you're noticing"
}

Guidelines:
- Only include lessons you're confident about from repeated patterns, not one-off observations
- Propose rules only if you have evidence from multiple trades
- If it's too early to draw conclusions, return empty arrays and say so in market_observation
- Be honest about mistakes. Losses teach more than wins.
No markdown, no code blocks, just the JSON object.`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";

  let reflection: {
    lessons?: Array<{ ticker: string; lesson: string; category: string }>;
    proposed_rules?: Array<{ category: string; rule: string; rationale: string }>;
    market_observation?: string;
  };

  try {
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    reflection = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse reflection:", text.slice(0, 300));
    return;
  }

  // Store lessons on the most recent SELL journal entries from this session
  if (reflection.lessons && reflection.lessons.length > 0) {
    const lessonText = reflection.lessons.map((l) => `[${l.category}] ${l.ticker}: ${l.lesson}`).join("\n");

    // Update recent sell entries from this session (last 5 minutes) that lack lessons
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    await prisma.tradeJournal.updateMany({
      where: {
        source: "sandbox",
        side: "SELL_TO_CLOSE",
        executedAt: { gte: fiveMinAgo },
        lessons: null,
      },
      data: { lessons: lessonText },
    });
  }

  // Propose new trading rules (created as inactive, need approval)
  if (reflection.proposed_rules && reflection.proposed_rules.length > 0) {
    for (const rule of reflection.proposed_rules) {
      // Check for duplicates
      const existing = await prisma.tradingRule.findFirst({
        where: { rule: { contains: rule.rule.slice(0, 50) } },
      });
      if (existing) continue;

      await prisma.tradingRule.create({
        data: {
          category: rule.category,
          rule: rule.rule,
          source: "ayden",
          isActive: false, // Needs Trey's approval
          performance: rule.rationale,
        },
      });
    }
  }

  // Store market observation as a general journal note
  if (reflection.market_observation) {
    await prisma.tradeJournal.create({
      data: {
        source: "sandbox",
        ticker: "MARKET",
        instrumentType: "observation",
        side: "HOLD",
        quantity: 0,
        price: 0,
        total: 0,
        reasoning: reflection.market_observation,
        outcome: "open",
        tags: ["reflection", "autonomous"],
      },
    });
  }
}
