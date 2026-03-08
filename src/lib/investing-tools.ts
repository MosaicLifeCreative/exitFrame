import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const investingTools: Anthropic.Tool[] = [
  {
    name: "get_portfolio_holdings",
    description:
      "Get Trey's portfolio holdings with current prices, market values, and P&L. Use whenever he asks about his portfolio, positions, or how his investments are doing.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "add_portfolio_holding",
    description:
      "Add a new stock holding to Trey's portfolio. Confirm ticker, shares, and cost basis before adding.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Stock ticker symbol (e.g. 'AAPL', 'VTI')",
        },
        companyName: {
          type: "string",
          description: "Company or fund name",
        },
        shares: {
          type: "number",
          description: "Number of shares owned",
        },
        avgCostBasis: {
          type: "number",
          description: "Average cost per share in dollars",
        },
        sector: {
          type: "string",
          description: "Sector (optional)",
        },
        notes: {
          type: "string",
          description: "Optional notes about the position",
        },
      },
      required: ["ticker", "companyName", "shares", "avgCostBasis"],
    },
  },
  {
    name: "update_holding",
    description:
      "Update an existing portfolio holding (shares, cost basis, notes). Get the holding ID from get_portfolio_holdings first.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the holding to update",
        },
        shares: {
          type: "number",
          description: "Updated share count",
        },
        avgCostBasis: {
          type: "number",
          description: "Updated average cost per share",
        },
        sector: {
          type: "string",
          description: "Updated sector",
        },
        notes: {
          type: "string",
          description: "Updated notes",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "remove_holding",
    description:
      "Remove a holding from Trey's portfolio (soft delete). Use when a position has been sold.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the holding to remove",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_watchlist",
    description:
      "Get Trey's investment watchlist — tickers and sectors he's monitoring.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "add_to_watchlist",
    description:
      "Add a ticker or sector to Trey's watchlist.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["ticker", "sector"],
          description: "Whether watching a specific ticker or a sector",
        },
        value: {
          type: "string",
          description: "Ticker symbol or sector name",
        },
        label: {
          type: "string",
          description: "Display name (e.g. 'Apple Inc.' or 'Clean Energy')",
        },
        notes: {
          type: "string",
          description: "Why it's being watched",
        },
      },
      required: ["type", "value", "label"],
    },
  },
  {
    name: "remove_from_watchlist",
    description:
      "Remove an item from Trey's watchlist.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the watchlist item to remove",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_ai_portfolio",
    description:
      "Get Ayden's (Claude's) autonomous paper trading portfolio — current positions, cash balance, total value, and recent trades. Use to discuss AI portfolio strategy and performance.",
    input_schema: {
      type: "object" as const,
      properties: {
        includeRecentTrades: {
          type: "boolean",
          description: "Include the last 20 trades with reasoning (default: true)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_portfolio_performance",
    description:
      "Get historical performance snapshots comparing Trey's portfolio vs Ayden's AI portfolio over time. Shows daily total values.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days of history to retrieve (default: 30)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_stock_quotes",
    description:
      "Get current cached stock quotes (price, change, change %) for portfolio and watchlist tickers. Updated hourly during market hours.",
    input_schema: {
      type: "object" as const,
      properties: {
        tickers: {
          type: "array",
          items: { type: "string" },
          description: "Specific tickers to look up (optional — returns all cached quotes if omitted)",
        },
      },
      required: [],
    },
  },
  {
    name: "search_market_news",
    description:
      "Search market news articles with AI analysis, sentiment, and relevance scores. Filter by ticker or sentiment.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "Filter by related ticker symbol",
        },
        sentiment: {
          type: "string",
          enum: ["bullish", "bearish", "neutral"],
          description: "Filter by AI sentiment analysis",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 15)",
        },
      },
      required: [],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeInvestingTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "get_portfolio_holdings":
      return getPortfolioHoldings();
    case "add_portfolio_holding":
      return addPortfolioHolding(toolInput as unknown as AddHoldingInput);
    case "update_holding":
      return updateHolding(toolInput as unknown as UpdateHoldingInput);
    case "remove_holding":
      return removeHolding(toolInput as unknown as RemoveHoldingInput);
    case "get_watchlist":
      return getWatchlist();
    case "add_to_watchlist":
      return addToWatchlist(toolInput as unknown as AddWatchlistInput);
    case "remove_from_watchlist":
      return removeFromWatchlist(toolInput as unknown as RemoveWatchlistInput);
    case "get_ai_portfolio":
      return getAiPortfolio(toolInput as unknown as GetAiPortfolioInput);
    case "get_portfolio_performance":
      return getPortfolioPerformance(toolInput as unknown as GetPerformanceInput);
    case "get_stock_quotes":
      return getStockQuotes(toolInput as unknown as GetQuotesInput);
    case "search_market_news":
      return searchMarketNews(toolInput as unknown as SearchNewsInput);
    default:
      return JSON.stringify({ error: `Unknown investing tool: ${toolName}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface AddHoldingInput {
  ticker: string;
  companyName: string;
  shares: number;
  avgCostBasis: number;
  sector?: string;
  notes?: string;
}

interface UpdateHoldingInput {
  id: string;
  shares?: number;
  avgCostBasis?: number;
  sector?: string;
  notes?: string;
}

interface RemoveHoldingInput {
  id: string;
}

interface AddWatchlistInput {
  type: string;
  value: string;
  label: string;
  notes?: string;
}

interface RemoveWatchlistInput {
  id: string;
}

interface GetAiPortfolioInput {
  includeRecentTrades?: boolean;
}

interface GetPerformanceInput {
  days?: number;
}

interface GetQuotesInput {
  tickers?: string[];
}

interface SearchNewsInput {
  ticker?: string;
  sentiment?: string;
  limit?: number;
}

// ─── Tool Implementations ────────────────────────────────

async function getPortfolioHoldings(): Promise<string> {
  const holdings = await prisma.portfolioHolding.findMany({
    where: { isActive: true },
    orderBy: { ticker: "asc" },
  });

  // Get cached quotes for these tickers
  const tickers = holdings.map((h) => h.ticker);
  const quotes = await prisma.stockQuote.findMany({
    where: { ticker: { in: tickers } },
  });
  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));

  let totalValue = 0;
  let totalCost = 0;

  const result = holdings.map((h) => {
    const shares = Number(h.shares);
    const costBasis = Number(h.avgCostBasis);
    const quote = quoteMap.get(h.ticker);
    const price = quote ? Number(quote.price) : null;
    const marketValue = price ? shares * price : null;
    const costTotal = shares * costBasis;
    const pl = marketValue !== null ? marketValue - costTotal : null;
    const plPct = costTotal > 0 && pl !== null ? (pl / costTotal) * 100 : null;

    if (marketValue !== null) totalValue += marketValue;
    totalCost += costTotal;

    return {
      id: h.id,
      ticker: h.ticker,
      companyName: h.companyName,
      shares,
      avgCostBasis: costBasis,
      currentPrice: price,
      changePct: quote?.changePct ? Number(quote.changePct) : null,
      marketValue: marketValue ? Math.round(marketValue * 100) / 100 : null,
      pnl: pl ? Math.round(pl * 100) / 100 : null,
      pnlPct: plPct ? Math.round(plPct * 100) / 100 : null,
      sector: h.sector,
      notes: h.notes,
    };
  });

  const totalPl = totalValue - totalCost;
  const totalPlPct = totalCost > 0 ? (totalPl / totalCost) * 100 : 0;

  return JSON.stringify({
    holdings: result,
    count: result.length,
    totals: {
      marketValue: Math.round(totalValue * 100) / 100,
      costBasis: Math.round(totalCost * 100) / 100,
      pnl: Math.round(totalPl * 100) / 100,
      pnlPct: Math.round(totalPlPct * 100) / 100,
    },
  });
}

async function addPortfolioHolding(input: AddHoldingInput): Promise<string> {
  const ticker = input.ticker.toUpperCase().trim();

  // Check for duplicate
  const existing = await prisma.portfolioHolding.findFirst({
    where: { ticker, isActive: true },
  });
  if (existing) {
    return JSON.stringify({
      error: `Already holding ${ticker}. Use update_holding to modify (id: ${existing.id}).`,
    });
  }

  const holding = await prisma.portfolioHolding.create({
    data: {
      ticker,
      companyName: input.companyName,
      shares: input.shares,
      avgCostBasis: input.avgCostBasis,
      sector: input.sector,
      notes: input.notes,
    },
  });

  return JSON.stringify({
    success: true,
    holding: {
      id: holding.id,
      ticker: holding.ticker,
      companyName: holding.companyName,
      shares: Number(holding.shares),
      avgCostBasis: Number(holding.avgCostBasis),
    },
  });
}

async function updateHolding(input: UpdateHoldingInput): Promise<string> {
  const data: Record<string, unknown> = {};
  if (input.shares !== undefined) data.shares = input.shares;
  if (input.avgCostBasis !== undefined) data.avgCostBasis = input.avgCostBasis;
  if (input.sector !== undefined) data.sector = input.sector;
  if (input.notes !== undefined) data.notes = input.notes;

  const holding = await prisma.portfolioHolding.update({
    where: { id: input.id },
    data,
  });

  return JSON.stringify({
    success: true,
    holding: {
      id: holding.id,
      ticker: holding.ticker,
      shares: Number(holding.shares),
      avgCostBasis: Number(holding.avgCostBasis),
      sector: holding.sector,
    },
  });
}

async function removeHolding(input: RemoveHoldingInput): Promise<string> {
  const holding = await prisma.portfolioHolding.update({
    where: { id: input.id },
    data: { isActive: false },
  });

  return JSON.stringify({
    success: true,
    message: `Removed ${holding.ticker} from portfolio.`,
  });
}

async function getWatchlist(): Promise<string> {
  const items = await prisma.watchlistItem.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  // Get quotes for ticker-type items
  const tickerItems = items.filter((i) => i.type === "ticker");
  const quotes = await prisma.stockQuote.findMany({
    where: { ticker: { in: tickerItems.map((i) => i.value) } },
  });
  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));

  const result = items.map((i) => {
    const quote = i.type === "ticker" ? quoteMap.get(i.value) : null;
    return {
      id: i.id,
      type: i.type,
      value: i.value,
      label: i.label,
      notes: i.notes,
      currentPrice: quote ? Number(quote.price) : null,
      changePct: quote?.changePct ? Number(quote.changePct) : null,
    };
  });

  return JSON.stringify({ watchlist: result, count: result.length });
}

async function addToWatchlist(input: AddWatchlistInput): Promise<string> {
  const value = input.type === "ticker" ? input.value.toUpperCase().trim() : input.value.trim();

  // Check for duplicate
  const existing = await prisma.watchlistItem.findFirst({
    where: { value, type: input.type, isActive: true },
  });
  if (existing) {
    return JSON.stringify({ error: `${value} is already on the watchlist.` });
  }

  const item = await prisma.watchlistItem.create({
    data: {
      type: input.type,
      value,
      label: input.label,
      notes: input.notes,
    },
  });

  return JSON.stringify({
    success: true,
    item: { id: item.id, type: item.type, value: item.value, label: item.label },
  });
}

async function removeFromWatchlist(input: RemoveWatchlistInput): Promise<string> {
  const item = await prisma.watchlistItem.update({
    where: { id: input.id },
    data: { isActive: false },
  });

  return JSON.stringify({
    success: true,
    message: `Removed ${item.label} from watchlist.`,
  });
}

async function getAiPortfolio(input: GetAiPortfolioInput): Promise<string> {
  const includeRecentTrades = input.includeRecentTrades !== false;

  const portfolio = await prisma.aiPortfolio.findFirst({
    where: { isActive: true },
    include: {
      positions: { orderBy: { ticker: "asc" } },
      trades: includeRecentTrades
        ? { orderBy: { executedAt: "desc" }, take: 20 }
        : undefined,
    },
  });

  if (!portfolio) {
    return JSON.stringify({ error: "No active AI portfolio found." });
  }

  // Get quotes for positions
  const tickers = portfolio.positions.map((p) => p.ticker);
  const quotes = await prisma.stockQuote.findMany({
    where: { ticker: { in: tickers } },
  });
  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));

  let holdingsValue = 0;
  const positions = portfolio.positions.map((p) => {
    const shares = Number(p.shares);
    const costBasis = Number(p.avgCostBasis);
    const quote = quoteMap.get(p.ticker);
    const price = quote ? Number(quote.price) : costBasis;
    const marketValue = shares * price;
    const pl = marketValue - shares * costBasis;
    holdingsValue += marketValue;

    return {
      ticker: p.ticker,
      companyName: p.companyName,
      shares,
      avgCostBasis: costBasis,
      currentPrice: Number(price),
      marketValue: Math.round(marketValue * 100) / 100,
      pnl: Math.round(pl * 100) / 100,
      pnlPct: costBasis > 0 ? Math.round((pl / (shares * costBasis)) * 10000) / 100 : 0,
      openedAt: p.openedAt.toISOString().slice(0, 10),
    };
  });

  const cashBalance = Number(portfolio.cashBalance);
  const totalValue = cashBalance + holdingsValue;
  const startingCapital = Number(portfolio.startingCapital);
  const totalReturn = totalValue - startingCapital;
  const totalReturnPct = startingCapital > 0 ? (totalReturn / startingCapital) * 100 : 0;

  const result: Record<string, unknown> = {
    name: portfolio.name,
    cashBalance: Math.round(cashBalance * 100) / 100,
    holdingsValue: Math.round(holdingsValue * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    startingCapital: Math.round(startingCapital * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    inceptionDate: portfolio.inceptionDate.toISOString().slice(0, 10),
    positionCount: positions.length,
    positions,
  };

  if (includeRecentTrades && portfolio.trades) {
    result.recentTrades = portfolio.trades.map((t) => ({
      ticker: t.ticker,
      side: t.side,
      shares: Number(t.shares),
      price: Number(t.price),
      total: Number(t.total),
      reasoning: t.reasoning,
      executedAt: t.executedAt.toISOString().slice(0, 10),
    }));
  }

  return JSON.stringify(result);
}

async function getPortfolioPerformance(input: GetPerformanceInput): Promise<string> {
  const days = input.days || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { snapshotDate: { gte: since } },
    orderBy: { snapshotDate: "asc" },
  });

  const userSnapshots = snapshots
    .filter((s) => s.portfolioType === "USER")
    .map((s) => ({
      date: s.snapshotDate.toISOString().slice(0, 10),
      totalValue: Number(s.totalValue),
      holdingsValue: Number(s.holdingsValue),
      cashValue: Number(s.cashValue),
      positionCount: s.positionCount,
    }));

  const aiSnapshots = snapshots
    .filter((s) => s.portfolioType === "AI")
    .map((s) => ({
      date: s.snapshotDate.toISOString().slice(0, 10),
      totalValue: Number(s.totalValue),
      holdingsValue: Number(s.holdingsValue),
      cashValue: Number(s.cashValue),
      positionCount: s.positionCount,
    }));

  return JSON.stringify({
    days,
    user: { snapshots: userSnapshots, count: userSnapshots.length },
    ai: { snapshots: aiSnapshots, count: aiSnapshots.length },
  });
}

async function getStockQuotes(input: GetQuotesInput): Promise<string> {
  const where = input.tickers?.length
    ? { ticker: { in: input.tickers.map((t) => t.toUpperCase().trim()) } }
    : {};

  const quotes = await prisma.stockQuote.findMany({
    where,
    orderBy: { ticker: "asc" },
  });

  const result = quotes.map((q) => ({
    ticker: q.ticker,
    price: Number(q.price),
    change: q.change ? Number(q.change) : null,
    changePct: q.changePct ? Number(q.changePct) : null,
    high: q.high ? Number(q.high) : null,
    low: q.low ? Number(q.low) : null,
    updatedAt: q.updatedAt.toISOString(),
  }));

  return JSON.stringify({ quotes: result, count: result.length });
}

async function searchMarketNews(input: SearchNewsInput): Promise<string> {
  const limit = input.limit || 15;
  const where: Record<string, unknown> = {};

  if (input.ticker) {
    where.relatedTickers = { has: input.ticker.toUpperCase().trim() };
  }
  if (input.sentiment) {
    where.aiSentiment = input.sentiment;
  }

  const articles = await prisma.marketNews.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  const result = articles.map((a) => ({
    id: a.id,
    headline: a.headline,
    summary: a.summary,
    aiSummary: a.aiSummary,
    aiSentiment: a.aiSentiment,
    aiRelevanceScore: a.aiRelevanceScore ? Number(a.aiRelevanceScore) : null,
    relatedTickers: a.relatedTickers,
    publishedAt: a.publishedAt.toISOString().slice(0, 10),
    url: a.url,
  }));

  return JSON.stringify({ articles: result, count: result.length });
}
