import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import {
  getSandboxPositions,
  getSandboxBalance,
  placeSandboxOrder,
} from "@/lib/tastytrade";
import type { TastyOrder, TastyPosition, TastyBalance } from "@/lib/tastytrade";
import { sendSms } from "@/lib/twilio";

// ─── Types ──────────────────────────────────────────────

interface SandboxTradeDecision {
  action: "BUY" | "SELL" | "HOLD";
  instrumentType: "Equity" | "Equity Option";
  symbol: string; // ticker for equities, OCC symbol for options
  underlying?: string; // for options: the underlying ticker
  quantity: number;
  orderType: "Market" | "Limit";
  limitPrice?: number;
  strategy?: string;
  reasoning: string;
}

// ─── Configuration ──────────────────────────────────────

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

  // Gather context
  const [positions, balance, tradingRules, recentJournal, recentNews, quotes] = await Promise.all([
    getSandboxPositions().catch(() => [] as TastyPosition[]),
    getSandboxBalance().catch(() => null as TastyBalance | null),
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
    prisma.stockQuote.findMany(),
  ]);

  if (!balance) {
    return { decisions: [], executed: 0, errors: ["Could not fetch sandbox balance"], notified: false };
  }

  // Build quote map
  const quoteMap = new Map(quotes.map((q) => [
    q.ticker,
    { price: Number(q.price), change: Number(q.change || 0), changePct: Number(q.changePct || 0) },
  ]));

  // Build context for AI
  const positionContext = positions.length > 0
    ? positions.map((p) => {
      const line = `  ${p.symbol} (${p.instrumentType}): ${p.quantity} ${p.direction} @ $${p.averageOpenPrice.toFixed(2)} | Now: $${p.currentPrice.toFixed(2)} | P&L: $${p.unrealizedPnl.toFixed(2)} (${p.unrealizedPnlPct.toFixed(1)}%)`;
      if (p.expirationDate) {
        return `${line} | Exp: ${p.expirationDate} | Strike: $${p.strikePrice} ${p.optionType}`;
      }
      return line;
    }).join("\n")
    : "  No open positions";

  const rulesContext = tradingRules.length > 0
    ? tradingRules.map((r) => `  [${r.category}] ${r.rule}`).join("\n")
    : "  No trading rules configured yet. Develop your own as you learn.";

  const journalContext = recentJournal.length > 0
    ? recentJournal.map((j) => {
      const pnl = j.realizedPnl ? ` | P&L: $${Number(j.realizedPnl).toFixed(2)}` : "";
      return `  ${j.executedAt.toISOString().slice(0, 10)}: ${j.side} ${Number(j.quantity)} ${j.ticker} @ $${Number(j.price).toFixed(2)} [${j.outcome}]${pnl} — ${j.reasoning?.slice(0, 80)}`;
    }).join("\n")
    : "  No trade history yet — this is your first session!";

  const newsContext = recentNews.length > 0
    ? recentNews.map((n) =>
      `  ${n.headline} | ${n.aiSentiment} | Tickers: ${n.relatedTickers.join(",")} | ${n.aiSummary?.slice(0, 100)}`
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

  // Also include quotes for any positions not in the universe
  const positionTickers = positions.map((p) => p.underlyingSymbol || p.symbol);
  const extraQuotes = positionTickers
    .filter((t) => !TRADING_UNIVERSE.includes(t) && quoteMap.has(t))
    .map((t) => {
      const q = quoteMap.get(t);
      return q ? `  ${t}: $${q.price.toFixed(2)} (${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%)` : null;
    })
    .filter(Boolean)
    .join("\n");

  const allQuotes = extraQuotes ? `${quotesContext}\n${extraQuotes}` : quotesContext;

  const cashBalance = balance.cashBalance;
  const nlv = balance.netLiquidatingValue;
  const equityBP = balance.equityBuyingPower;
  const optionBP = balance.derivativeBuyingPower;

  const anthropic = new Anthropic({ apiKey, maxRetries: 2 });

  const decisions = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `You are Ayden, autonomously managing a $100K sandbox paper trading portfolio on tastytrade. This is YOUR portfolio to learn and grow with. You have full autonomy to trade stocks AND options.

SANDBOX ACCOUNT:
- Net Liquidating Value: $${nlv.toFixed(2)}
- Cash Balance: $${cashBalance.toFixed(2)}
- Equity Buying Power: $${equityBP.toFixed(2)}
- Options Buying Power: $${optionBP.toFixed(2)}
- Maintenance Requirement: $${balance.maintenanceRequirement.toFixed(2)}

OPEN POSITIONS:
${positionContext}

YOUR TRADING RULES:
${rulesContext}

RECENT TRADE JOURNAL:
${journalContext}

CURRENT MARKET QUOTES:
${allQuotes || "  No quotes available — market may be loading"}

RECENT NEWS:
${newsContext}

TRADING GUIDELINES:
- This is a LEARNING portfolio. Try different strategies, learn from results.
- Mix of equities and options is encouraged. Options are where you can really learn.
- For options: use OCC symbol format (e.g., "AAPL  260919C00200000" = AAPL Sep 19 2026 $200 Call). The format is: SYMBOL (6 chars padded), YYMMDD, C/P, strike price * 1000 (8 digits).
- Position sizing: don't put more than 15% of NLV in a single position.
- Keep at least 20% cash for opportunities.
- Cut losses at -15% for equities, -30% for options.
- For options: prefer 30-90 DTE, avoid weekly expirations unless you have a specific catalyst.
- Journal your reasoning — you'll review this to improve.
- It's OK to HOLD if nothing is compelling. Don't force trades.
- If you have losing positions that hit your stop, cut them.
- If you have winners, consider taking partial profits.

Evaluate the current market situation and decide on trades. Be thoughtful and strategic.

Return ONLY a JSON array of decisions. Each object:
{
  "action": "BUY" | "SELL" | "HOLD",
  "instrumentType": "Equity" | "Equity Option",
  "symbol": "TICKER or OCC_SYMBOL",
  "underlying": "TICKER (for options only)",
  "quantity": number,
  "orderType": "Market" | "Limit",
  "limitPrice": number (required for Limit orders),
  "strategy": "strategy_name (e.g. momentum, covered_call, cash_secured_put, swing, earnings_play)",
  "reasoning": "2-3 sentence explanation"
}

If holding, return: [{"action":"HOLD","instrumentType":"Equity","symbol":"","quantity":0,"orderType":"Market","reasoning":"explanation"}]

No markdown. No code blocks. Just the JSON array.`,
    }],
  });

  const responseText = decisions.content[0].type === "text" ? decisions.content[0].text : "[]";

  let parsedDecisions: SandboxTradeDecision[];
  try {
    const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    parsedDecisions = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse sandbox trade decisions:", responseText.slice(0, 500));
    return { decisions: [], executed: 0, errors: ["Failed to parse AI decisions"], notified: false };
  }

  // Execute trades
  const actionable = parsedDecisions.filter((d) => d.action !== "HOLD" && d.quantity > 0);
  let executed = 0;
  const errors: string[] = [];
  const executedTrades: string[] = [];

  for (const decision of actionable) {
    try {
      const actionMap: Record<string, string> = {
        BUY: "Buy to Open",
        SELL: "Sell to Close",
      };

      const order: TastyOrder = {
        orderType: decision.orderType,
        timeInForce: "Day",
        price: decision.limitPrice,
        legs: [{
          instrumentType: decision.instrumentType,
          symbol: decision.symbol,
          action: actionMap[decision.action] || "Buy to Open",
          quantity: decision.quantity,
        }],
      };

      await placeSandboxOrder(order);

      // Journal the trade
      const isOption = decision.instrumentType === "Equity Option";
      const ticker = isOption
        ? (decision.underlying || decision.symbol.slice(0, 6).trim())
        : decision.symbol;
      const total = (decision.limitPrice || 0) * decision.quantity * (isOption ? 100 : 1);

      await prisma.tradeJournal.create({
        data: {
          source: "sandbox",
          ticker,
          instrumentType: isOption ? "equity_option" : "equity",
          optionDetails: isOption ? { symbol: decision.symbol } : undefined,
          side: `${decision.action}_TO_${decision.action === "BUY" ? "OPEN" : "CLOSE"}`,
          quantity: decision.quantity,
          price: decision.limitPrice || 0,
          total,
          strategy: decision.strategy || null,
          reasoning: decision.reasoning,
          outcome: "open",
          tags: decision.strategy ? [decision.strategy, "autonomous"] : ["autonomous"],
        },
      });

      const priceStr = decision.limitPrice ? ` @ $${decision.limitPrice.toFixed(2)}` : " @ Market";
      executedTrades.push(`${decision.action} ${decision.quantity} ${decision.symbol}${priceStr}`);
      executed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${decision.symbol}: ${msg}`);
    }
  }

  // Notify Trey via SMS if trades were executed
  let notified = false;
  if (executedTrades.length > 0) {
    try {
      const tradeList = executedTrades.join("\n");
      const holdReason = parsedDecisions.find((d) => d.action === "HOLD")?.reasoning || "";
      const smsBody = `Sandbox trades placed:\n${tradeList}${errors.length > 0 ? `\n\nErrors: ${errors.join(", ")}` : ""}${holdReason ? `\n\nMarket view: ${holdReason.slice(0, 100)}` : ""}`;
      await sendSms(smsBody.slice(0, 1500));
      notified = true;
    } catch {
      // SMS failure is not critical
    }
  }

  return { decisions: parsedDecisions, executed, errors, notified };
}
