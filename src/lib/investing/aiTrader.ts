import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

const MAX_POSITIONS = 8;
const MAX_POSITION_PCT = 0.30; // 30% of portfolio in one position
const MIN_CASH_RESERVE_PCT = 0.10; // Always keep 10% cash

// Base universe: major liquid stocks and ETFs across sectors
const BASE_UNIVERSE = [
  // Mega-cap tech
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
  // Growth / high-beta tech
  "AMD", "CRM", "NFLX", "AVGO", "SHOP", "SQ", "PLTR",
  // Financials
  "JPM", "GS", "V", "MA",
  // Healthcare
  "UNH", "LLY", "JNJ", "ABBV",
  // Energy
  "XOM", "CVX",
  // Consumer
  "COST", "WMT", "NKE",
  // ETFs (broad market, sector, volatility)
  "SPY", "QQQ", "IWM", "XLF", "XLE", "XLK", "ARKK",
];

async function getNewsDiscoveredTickers(): Promise<string[]> {
  // Pull unique tickers mentioned in recent news (last 48h)
  const recentNews = await prisma.marketNews.findMany({
    where: {
      publishedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      relatedTickers: { isEmpty: false },
    },
    select: { relatedTickers: true },
  });

  const tickers = new Set<string>();
  for (const article of recentNews) {
    for (const ticker of article.relatedTickers) {
      // Basic validation: 1-5 uppercase letters, skip common non-stock symbols
      if (/^[A-Z]{1,5}$/.test(ticker)) {
        tickers.add(ticker);
      }
    }
  }
  return Array.from(tickers);
}

export async function getAllTradableTickers(): Promise<string[]> {
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
  const newsDiscovered = await getNewsDiscoveredTickers();

  return Array.from(new Set([
    ...BASE_UNIVERSE,
    ...newsDiscovered,
    ...userHoldings.map((h) => h.ticker),
    ...watchlist.map((w) => w.value),
    ...(aiPortfolio?.positions.map((p) => p.ticker) || []),
  ]));
}

interface TradeDecision {
  action: "BUY" | "SELL" | "HOLD";
  ticker: string;
  companyName: string;
  shares: number;
  reasoning: string;
  newsIds: string[];
}

export async function getOrCreatePortfolio() {
  let portfolio = await prisma.aiPortfolio.findFirst({
    where: { isActive: true },
    include: { positions: true, trades: { orderBy: { executedAt: "desc" }, take: 10 } },
  });

  if (!portfolio) {
    // Calculate user's portfolio value dynamically for starting capital
    const userHoldings = await prisma.portfolioHolding.findMany({ where: { isActive: true } });
    const quotes = await prisma.stockQuote.findMany();
    const quoteMap = new Map(quotes.map((q) => [q.ticker, Number(q.price)]));

    let userValue = 0;
    for (const h of userHoldings) {
      const price = quoteMap.get(h.ticker);
      if (price) {
        userValue += Number(h.shares) * price;
      } else {
        // Fall back to cost basis if no quote
        userValue += Number(h.shares) * Number(h.avgCostBasis);
      }
    }

    // Minimum $10k if user has no holdings
    const startingCapital = Math.max(userValue, 10000);

    portfolio = await prisma.aiPortfolio.create({
      data: {
        cashBalance: startingCapital,
        startingCapital,
      },
      include: { positions: true, trades: { orderBy: { executedAt: "desc" }, take: 10 } },
    });
  }

  return portfolio;
}

export async function evaluateTrades(): Promise<TradeDecision[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const portfolio = await getOrCreatePortfolio();
  const quotes = await prisma.stockQuote.findMany();
  const quoteMap = new Map(quotes.map((q) => [q.ticker, { price: Number(q.price), change: Number(q.change || 0), changePct: Number(q.changePct || 0) }]));

  // Get recent news (last 24h with AI analysis)
  const recentNews = await prisma.marketNews.findMany({
    where: {
      publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      aiSummary: { not: null },
    },
    orderBy: { aiRelevanceScore: "desc" },
    take: 30,
  });

  // Get user's holdings for awareness
  const userHoldings = await prisma.portfolioHolding.findMany({ where: { isActive: true } });

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
  const cashPct = ((cashBalance / totalValue) * 100).toFixed(1);

  // Recent trade history for context
  const recentTrades = portfolio.trades.map((t) => ({
    ticker: t.ticker,
    side: t.side,
    shares: Number(t.shares),
    price: Number(t.price),
    reasoning: t.reasoning,
    date: t.executedAt.toISOString().split("T")[0],
  }));

  // All tradable tickers: base universe + news-discovered + user's + AI positions
  const availableTickers = Array.from(new Set([
    ...BASE_UNIVERSE,
    ...(await getNewsDiscoveredTickers()),
    ...userHoldings.map((h) => h.ticker),
    ...portfolio.positions.map((p) => p.ticker),
  ]));

  const tickerQuotes = availableTickers.filter((t) => quoteMap.has(t)).map((t) => {
    const q = quoteMap.get(t);
    return q ? `${t}: $${q.price.toFixed(2)} (${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%)` : `${t}: no quote`;
  }).join("\n");

  const newsContext = recentNews.map((n) =>
    `[${n.id}] ${n.headline} | ${n.aiSentiment} | Score: ${n.aiRelevanceScore?.toFixed(2)} | ${n.aiSummary}`
  ).join("\n");

  const anthropic = new Anthropic({ apiKey, maxRetries: 3 });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `You are managing an autonomous paper trading portfolio. Your goal is to MAXIMIZE portfolio value through aggressive momentum/swing trading.

PORTFOLIO STATUS:
- Starting Capital: $${startingCapital.toLocaleString()}
- Cash: $${cashBalance.toLocaleString()} (${cashPct}%)
- Holdings Value: $${holdingsValue.toLocaleString()}
- Total Value: $${totalValue.toLocaleString()}
- Total Return: ${totalReturn}%
- Open Positions (${positionDetails.length}/${MAX_POSITIONS}):
${positionDetails.length > 0 ? positionDetails.map((p) => `  ${p.ticker}: ${p.shares} shares @ $${p.avgCost.toFixed(2)} | Now: $${p.currentPrice.toFixed(2)} (${p.dailyChange >= 0 ? "+" : ""}${p.dailyChange.toFixed(2)}%) | P&L: $${p.pnl} (${p.pnlPct}%)`).join("\n") : "  None"}

RECENT TRADES:
${recentTrades.length > 0 ? recentTrades.map((t) => `  ${t.date}: ${t.side} ${t.shares} ${t.ticker} @ $${t.price.toFixed(2)} — ${t.reasoning}`).join("\n") : "  None yet"}

CURRENT QUOTES:
${tickerQuotes}

RECENT NEWS & ANALYSIS:
${newsContext || "No recent news available"}

USER'S PORTFOLIO (for awareness, NOT yours to trade):
${userHoldings.map((h) => `  ${h.ticker} (${h.companyName}): ${Number(h.shares)} shares`).join("\n") || "  No holdings"}

RULES:
- Max ${MAX_POSITIONS} concurrent positions
- Max ${(MAX_POSITION_PCT * 100).toFixed(0)}% of portfolio in one position ($${(totalValue * MAX_POSITION_PCT).toFixed(0)} max per position)
- Must maintain ${(MIN_CASH_RESERVE_PCT * 100).toFixed(0)}% cash reserve ($${(totalValue * MIN_CASH_RESERVE_PCT).toFixed(0)} minimum cash)
- Available cash for new positions: $${Math.max(0, cashBalance - totalValue * MIN_CASH_RESERVE_PCT).toFixed(0)}
- You have access to ~${availableTickers.length} tickers (major stocks/ETFs + news-discovered momentum plays)
- Can only trade tickers with available quotes below
- Buy in whole shares only
- You can BUY new or add to positions, SELL partial or full positions, or HOLD

TRADING PHILOSOPHY:
- Momentum/swing: target 5-20% moves over days to weeks
- News catalysts drive entries — earnings, sector rotation, institutional moves
- Cut losers at -7% to -10%, let winners run
- Don't chase — wait for pullbacks in uptrends
- Concentrated bets on high-conviction plays

Evaluate the market right now. Decide what trades (if any) to make. It's OK to HOLD if nothing is compelling.

Return ONLY a JSON array of trade decisions. Each object:
{
  "action": "BUY" | "SELL" | "HOLD",
  "ticker": "SYMBOL",
  "companyName": "Company Name",
  "shares": number,
  "reasoning": "2-3 sentence explanation with specific catalyst",
  "newsIds": ["id1", "id2"]
}

For HOLD actions, set shares to 0 and explain why you're holding.
If no trades, return a single HOLD entry explaining the market view.
No markdown, no code blocks, just the JSON array.`,
    }],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "[]";
  try {
    const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse trade decisions:", responseText.slice(0, 300));
    return [];
  }
}

export async function executeTrades(decisions: TradeDecision[]): Promise<{ executed: number; errors: string[] }> {
  const portfolio = await getOrCreatePortfolio();
  const quotes = await prisma.stockQuote.findMany();
  const quoteMap = new Map(quotes.map((q) => [q.ticker, Number(q.price)]));

  let executed = 0;
  const errors: string[] = [];

  for (const decision of decisions) {
    if (decision.action === "HOLD") continue;

    const price = quoteMap.get(decision.ticker);
    if (!price) {
      errors.push(`No quote for ${decision.ticker}, skipping`);
      continue;
    }

    if (decision.shares <= 0) continue;

    try {
      if (decision.action === "BUY") {
        const total = price * decision.shares;
        const cashBalance = Number(portfolio.cashBalance);
        const holdingsValue = portfolio.positions.reduce((sum, p) => {
          const q = quoteMap.get(p.ticker) || Number(p.avgCostBasis);
          return sum + Number(p.shares) * q;
        }, 0);
        const totalValue = cashBalance + holdingsValue;
        const minCash = totalValue * MIN_CASH_RESERVE_PCT;

        if (total > cashBalance - minCash) {
          errors.push(`Insufficient cash for ${decision.ticker}: need $${total.toFixed(2)}, available $${(cashBalance - minCash).toFixed(2)}`);
          continue;
        }

        // Check position concentration limit
        const existingPosition = portfolio.positions.find((p) => p.ticker === decision.ticker);
        const existingValue = existingPosition ? Number(existingPosition.shares) * price : 0;
        const newPositionValue = existingValue + total;
        const maxPositionValue = totalValue * MAX_POSITION_PCT;

        if (newPositionValue > maxPositionValue) {
          errors.push(`Position limit for ${decision.ticker}: $${newPositionValue.toFixed(0)} would exceed ${(MAX_POSITION_PCT * 100)}% cap ($${maxPositionValue.toFixed(0)})`);
          continue;
        }

        // Check max positions
        if (!existingPosition && portfolio.positions.length >= MAX_POSITIONS) {
          errors.push(`Max positions reached (${MAX_POSITIONS}), can't open ${decision.ticker}`);
          continue;
        }

        // Execute buy
        if (existingPosition) {
          // Average into existing position
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

        // Deduct cash
        const updatedPortfolio = await prisma.aiPortfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { decrement: total } },
        });
        portfolio.cashBalance = updatedPortfolio.cashBalance;

        // Log trade
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

        if (sellShares >= posShares) {
          // Full sell — close position
          await prisma.aiPosition.delete({ where: { id: position.id } });
        } else {
          // Partial sell
          await prisma.aiPosition.update({
            where: { id: position.id },
            data: { shares: { decrement: sellShares } },
          });
        }

        // Add cash
        await prisma.aiPortfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { increment: total } },
        });

        // Log trade
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

        executed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Trade error for ${decision.ticker}: ${msg}`);
    }
  }

  return { executed, errors };
}
