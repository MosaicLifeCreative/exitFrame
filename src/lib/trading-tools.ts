import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import {
  getPositions,
  getBalance,
  getOptionChain,
  getLiveOrders,
} from "@/lib/tastytrade";

// ─── Tool Definitions ───────────────────────────────────

export const tradingTools: Anthropic.Tool[] = [
  {
    name: "get_live_positions",
    description:
      "Get Trey's REAL tastytrade positions (stocks + options) with current values and P&L. Use whenever he asks about his actual brokerage positions or account.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_account_balance",
    description:
      "Get Trey's real tastytrade account balance — cash, net liquidating value, buying power, margin requirements.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_options_chain",
    description:
      "Get the full options chain for a stock symbol — all expirations, strikes, calls and puts. Use for options analysis, finding good entries, evaluating premium.",
    input_schema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Stock ticker symbol (e.g. 'AAPL', 'SPY')",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_trade_journal",
    description:
      "Get trade journal entries — past trades with reasoning, outcomes, and lessons. Use to review trading history, analyze performance, and learn from past decisions.",
    input_schema: {
      type: "object" as const,
      properties: {
        source: {
          type: "string",
          enum: ["sandbox", "live", "all"],
          description: "Filter by trade source (default: all)",
        },
        outcome: {
          type: "string",
          enum: ["win", "loss", "breakeven", "open"],
          description: "Filter by outcome",
        },
        strategy: {
          type: "string",
          description: "Filter by strategy name",
        },
        ticker: {
          type: "string",
          description: "Filter by ticker symbol",
        },
        limit: {
          type: "number",
          description: "Max entries to return (default: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "log_trade_journal",
    description:
      "Log a trade to the journal with detailed reasoning, thesis, and strategy. Called automatically when placing sandbox orders, but also use for manual journaling of real trades.",
    input_schema: {
      type: "object" as const,
      properties: {
        source: {
          type: "string",
          enum: ["sandbox", "live", "manual"],
        },
        ticker: {
          type: "string",
        },
        instrumentType: {
          type: "string",
          enum: ["equity", "equity_option"],
        },
        optionDetails: {
          type: "object",
          properties: {
            strike: { type: "number" },
            expiration: { type: "string" },
            putCall: { type: "string", enum: ["call", "put"] },
          },
          description: "Option details (for options trades only)",
        },
        side: {
          type: "string",
          enum: ["BUY_TO_OPEN", "SELL_TO_CLOSE", "SELL_TO_OPEN", "BUY_TO_CLOSE"],
        },
        quantity: { type: "number" },
        price: { type: "number" },
        strategy: { type: "string" },
        reasoning: { type: "string" },
        thesis: { type: "string" },
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["source", "ticker", "instrumentType", "side", "quantity", "price", "reasoning"],
    },
  },
  {
    name: "close_trade_journal",
    description:
      "Close out a trade journal entry — record the exit reasoning, outcome, P&L, and lessons learned. Use when a trade is closed to complete the journal entry.",
    input_schema: {
      type: "object" as const,
      properties: {
        tradeId: {
          type: "string",
          description: "UUID of the open trade journal entry to close",
        },
        exitReasoning: {
          type: "string",
          description: "Why the trade was closed",
        },
        outcome: {
          type: "string",
          enum: ["win", "loss", "breakeven"],
        },
        realizedPnl: {
          type: "number",
          description: "Realized profit/loss in dollars",
        },
        realizedPnlPct: {
          type: "number",
          description: "Realized P&L as percentage",
        },
        lessons: {
          type: "string",
          description: "What was learned from this trade",
        },
      },
      required: ["tradeId", "exitReasoning", "outcome", "realizedPnl"],
    },
  },
  {
    name: "get_trading_rules",
    description:
      "Get the current trading rules that govern Ayden's trading decisions — entry criteria, exit rules, risk management, position sizing, and strategy preferences.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["entry", "exit", "risk", "position_sizing", "strategy"],
          description: "Filter by rule category",
        },
      },
      required: [],
    },
  },
  {
    name: "propose_trading_rule",
    description:
      "Propose a new or updated trading rule based on performance analysis. The rule needs Trey's approval before becoming active.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["entry", "exit", "risk", "position_sizing", "strategy"],
        },
        rule: {
          type: "string",
          description: "The trading rule text",
        },
        rationale: {
          type: "string",
          description: "Why this rule should be adopted, with evidence from trade history",
        },
      },
      required: ["category", "rule", "rationale"],
    },
  },
  {
    name: "get_live_orders",
    description:
      "Get currently active/pending orders on Trey's real tastytrade account.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeTradingTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "get_live_positions":
      return handleGetLivePositions();
    case "get_account_balance":
      return handleGetAccountBalance();
    case "get_options_chain":
      return handleGetOptionsChain(toolInput as { symbol: string });
    case "get_trade_journal":
      return handleGetTradeJournal(toolInput as unknown as GetTradeJournalInput);
    case "log_trade_journal":
      return handleLogTradeJournal(toolInput as unknown as LogTradeJournalInput);
    case "close_trade_journal":
      return handleCloseTradeJournal(toolInput as unknown as CloseTradeJournalInput);
    case "get_trading_rules":
      return handleGetTradingRules(toolInput as unknown as { category?: string });
    case "propose_trading_rule":
      return handleProposeTradingRule(toolInput as unknown as ProposeTradingRuleInput);
    case "get_live_orders":
      return handleGetLiveOrders();
    default:
      return JSON.stringify({ error: `Unknown trading tool: ${toolName}` });
  }
}

// ─── Input Types ────────────────────────────────────────

interface GetTradeJournalInput {
  source?: string;
  outcome?: string;
  strategy?: string;
  ticker?: string;
  limit?: number;
}

interface LogTradeJournalInput {
  source: string;
  ticker: string;
  instrumentType: string;
  optionDetails?: { strike?: number; expiration?: string; putCall?: string };
  side: string;
  quantity: number;
  price: number;
  strategy?: string;
  reasoning: string;
  thesis?: string;
  tags?: string[];
}

interface CloseTradeJournalInput {
  tradeId: string;
  exitReasoning: string;
  outcome: string;
  realizedPnl: number;
  realizedPnlPct?: number;
  lessons?: string;
}

interface ProposeTradingRuleInput {
  category: string;
  rule: string;
  rationale: string;
}

// ─── Tool Implementations ───────────────────────────────

async function handleGetLivePositions(): Promise<string> {
  try {
    const positions = await getPositions();
    const equities = positions.filter((p) => p.instrumentType === "Equity");
    const options = positions.filter((p) => p.instrumentType === "Equity Option");

    let totalMarketValue = 0;
    let totalUnrealizedPnl = 0;
    for (const p of positions) {
      totalMarketValue += p.marketValue;
      totalUnrealizedPnl += p.unrealizedPnl;
    }

    return JSON.stringify({
      positions: positions.map((p) => ({
        symbol: p.symbol,
        type: p.instrumentType,
        underlying: p.underlyingSymbol,
        quantity: p.quantity,
        direction: p.direction,
        avgOpenPrice: p.averageOpenPrice,
        currentPrice: p.currentPrice,
        marketValue: p.marketValue,
        unrealizedPnl: p.unrealizedPnl,
        unrealizedPnlPct: p.unrealizedPnlPct,
        ...(p.expirationDate && { expiration: p.expirationDate }),
        ...(p.strikePrice && { strike: p.strikePrice }),
        ...(p.optionType && { optionType: p.optionType }),
      })),
      summary: {
        totalPositions: positions.length,
        equities: equities.length,
        options: options.length,
        totalMarketValue: Math.round(totalMarketValue * 100) / 100,
        totalUnrealizedPnl: Math.round(totalUnrealizedPnl * 100) / 100,
      },
    });
  } catch (err) {
    return JSON.stringify({ error: `Failed to fetch positions: ${err instanceof Error ? err.message : String(err)}` });
  }
}

async function handleGetAccountBalance(): Promise<string> {
  try {
    const balance = await getBalance();
    return JSON.stringify({
      cashBalance: balance.cashBalance,
      netLiquidatingValue: balance.netLiquidatingValue,
      equityBuyingPower: balance.equityBuyingPower,
      derivativeBuyingPower: balance.derivativeBuyingPower,
      maintenanceRequirement: balance.maintenanceRequirement,
      longEquityValue: balance.longEquityValue,
      shortEquityValue: balance.shortEquityValue,
      longDerivativeValue: balance.longDerivativeValue,
      shortDerivativeValue: balance.shortDerivativeValue,
      pendingCash: balance.pendingCash,
    });
  } catch (err) {
    return JSON.stringify({ error: `Failed to fetch balance: ${err instanceof Error ? err.message : String(err)}` });
  }
}

async function handleGetOptionsChain(input: { symbol: string }): Promise<string> {
  try {
    const chain = await getOptionChain(input.symbol);

    // Summarize: list expirations with strike counts (full chain would be huge)
    const summary = chain.map((exp) => ({
      expiration: exp.expirationDate,
      daysToExpiration: exp.daysToExpiration,
      type: exp.expirationType,
      strikeCount: exp.strikes.length,
      strikeRange: exp.strikes.length > 0
        ? `$${exp.strikes[0].strikePrice} - $${exp.strikes[exp.strikes.length - 1].strikePrice}`
        : "N/A",
    }));

    return JSON.stringify({
      symbol: input.symbol.toUpperCase(),
      expirationCount: chain.length,
      expirations: summary,
      note: "Use specific expiration + strike range for detailed analysis. Full chain data available via API.",
    });
  } catch (err) {
    return JSON.stringify({ error: `Failed to fetch options chain: ${err instanceof Error ? err.message : String(err)}` });
  }
}

async function handleGetTradeJournal(input: GetTradeJournalInput): Promise<string> {
  const limit = input.limit || 20;
  const where: Record<string, unknown> = {};

  if (input.source && input.source !== "all") where.source = input.source;
  if (input.outcome) where.outcome = input.outcome;
  if (input.strategy) where.strategy = input.strategy;
  if (input.ticker) where.ticker = input.ticker.toUpperCase();

  const entries = await prisma.tradeJournal.findMany({
    where,
    orderBy: { executedAt: "desc" },
    take: limit,
  });

  // Performance summary
  const closedEntries = entries.filter((e) => e.outcome && e.outcome !== "open");
  const wins = closedEntries.filter((e) => e.outcome === "win").length;
  const losses = closedEntries.filter((e) => e.outcome === "loss").length;
  const totalPnl = closedEntries.reduce((sum, e) => sum + Number(e.realizedPnl || 0), 0);

  return JSON.stringify({
    entries: entries.map((e) => ({
      id: e.id,
      source: e.source,
      ticker: e.ticker,
      instrumentType: e.instrumentType,
      side: e.side,
      quantity: Number(e.quantity),
      price: Number(e.price),
      total: Number(e.total),
      strategy: e.strategy,
      reasoning: e.reasoning,
      thesis: e.thesis,
      outcome: e.outcome,
      realizedPnl: e.realizedPnl ? Number(e.realizedPnl) : null,
      realizedPnlPct: e.realizedPnlPct ? Number(e.realizedPnlPct) : null,
      exitReasoning: e.exitReasoning,
      lessons: e.lessons,
      tags: e.tags,
      executedAt: e.executedAt.toISOString().slice(0, 10),
      closedAt: e.closedAt?.toISOString().slice(0, 10) || null,
    })),
    count: entries.length,
    performance: {
      closedTrades: closedEntries.length,
      wins,
      losses,
      winRate: closedEntries.length > 0 ? Math.round((wins / closedEntries.length) * 100) : 0,
      totalPnl: Math.round(totalPnl * 100) / 100,
    },
  });
}

async function handleLogTradeJournal(input: LogTradeJournalInput): Promise<string> {
  const total = input.price * input.quantity * (input.instrumentType === "equity_option" ? 100 : 1);

  const entry = await prisma.tradeJournal.create({
    data: {
      source: input.source,
      ticker: input.ticker.toUpperCase(),
      instrumentType: input.instrumentType,
      optionDetails: input.optionDetails || undefined,
      side: input.side,
      quantity: input.quantity,
      price: input.price,
      total,
      strategy: input.strategy || null,
      reasoning: input.reasoning,
      thesis: input.thesis || null,
      outcome: "open",
      tags: input.tags || [],
    },
  });

  return JSON.stringify({
    success: true,
    journalId: entry.id,
    message: `Trade journaled: ${input.side} ${input.quantity} ${input.ticker} @ $${input.price}`,
  });
}

async function handleCloseTradeJournal(input: CloseTradeJournalInput): Promise<string> {
  const entry = await prisma.tradeJournal.update({
    where: { id: input.tradeId },
    data: {
      exitReasoning: input.exitReasoning,
      outcome: input.outcome,
      realizedPnl: input.realizedPnl,
      realizedPnlPct: input.realizedPnlPct || null,
      lessons: input.lessons || null,
      closedAt: new Date(),
    },
  });

  return JSON.stringify({
    success: true,
    message: `Trade closed: ${entry.ticker} — ${input.outcome} ($${input.realizedPnl})`,
    lessons: input.lessons || "No lessons recorded.",
  });
}

async function handleGetTradingRules(input: { category?: string }): Promise<string> {
  const where: Record<string, unknown> = { isActive: true };
  if (input.category) where.category = input.category;

  const rules = await prisma.tradingRule.findMany({
    where,
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  // Group by category
  const grouped: Record<string, Array<{ id: string; rule: string; source: string; performance: string | null }>> = {};
  for (const r of rules) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push({
      id: r.id,
      rule: r.rule,
      source: r.source,
      performance: r.performance,
    });
  }

  return JSON.stringify({
    rules: grouped,
    totalRules: rules.length,
  });
}

async function handleProposeTradingRule(input: ProposeTradingRuleInput): Promise<string> {
  // Create as inactive — needs Trey's approval
  const rule = await prisma.tradingRule.create({
    data: {
      category: input.category,
      rule: input.rule,
      source: "ayden",
      isActive: false, // Pending approval
    },
  });

  return JSON.stringify({
    success: true,
    ruleId: rule.id,
    message: `Proposed new ${input.category} rule. Waiting for Trey's approval.`,
    rule: input.rule,
    rationale: input.rationale,
    note: "Tell Trey about this proposal and ask for approval. Do not activate it yourself.",
  });
}

async function handleGetLiveOrders(): Promise<string> {
  try {
    const orders = await getLiveOrders();
    return JSON.stringify({ orders, count: orders.length });
  } catch (err) {
    return JSON.stringify({ error: `Failed to fetch live orders: ${err instanceof Error ? err.message : String(err)}` });
  }
}
