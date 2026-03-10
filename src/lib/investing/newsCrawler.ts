import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

interface FinnhubNewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

async function fetchFinnhubNews(ticker: string): Promise<FinnhubNewsItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error("FINNHUB_API_KEY not configured");

  const now = new Date();
  // 3-day lookback so Monday catches Friday/weekend articles
  const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fromStr = from.toISOString().split("T")[0];
  const toStr = now.toISOString().split("T")[0];

  const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromStr}&to=${toStr}&token=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`Finnhub error for ${ticker}: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  // Sort by most recent first, cap at 25 per ticker
  return data
    .sort((a: FinnhubNewsItem, b: FinnhubNewsItem) => b.datetime - a.datetime)
    .slice(0, 25);
}

async function analyzeNewsWithClaude(
  articles: { headline: string; summary: string; relatedTickers: string[] }[],
  portfolio: { ticker: string; companyName: string; sector: string | null }[],
  watchlist: { type: string; value: string; label: string }[]
): Promise<{ index: number; relevanceScore: number; sentiment: string; aiSummary: string }[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey, maxRetries: 3 });

  const portfolioDesc = portfolio.length > 0
    ? portfolio.map((h) => `${h.ticker} (${h.companyName}${h.sector ? ", " + h.sector : ""})`).join(", ")
    : "No holdings";

  const watchlistDesc = watchlist.length > 0
    ? watchlist.map((w) => `${w.value} (${w.label}, ${w.type})`).join(", ")
    : "No watchlist items";

  const articlesList = articles.map((a, i) =>
    `[${i}] ${a.headline}\nTickers: ${a.relatedTickers.join(", ") || "none"}\nSummary: ${a.summary || "N/A"}`
  ).join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a momentum/swing trading analyst. This trader is aggressive but disciplined, targeting 5-20% moves over days to weeks. Analyze these news articles for relevance to their positions and watchlist.

PORTFOLIO: ${portfolioDesc}
WATCHLIST: ${watchlistDesc}

For each article, provide:
- relevanceScore: 0.0 to 1.0 (how relevant to the portfolio/watchlist and how actionable for a swing trade)
- sentiment: "bullish", "bearish", or "neutral" (directional market impact)
- aiSummary: 1-2 sentence direct analysis. Be opinionated — say what the catalyst means for price action. Flag entry/exit signals when you see them.

Prioritize: earnings catalysts, institutional moves, sector rotation signals, regulatory shifts, breakout/breakdown setups, and volume/momentum shifts. Score generic commentary and PR fluff low (< 0.2). Only score high (> 0.7) if there is a clear actionable signal.

ARTICLES:
${articlesList}

Return ONLY a JSON array with objects containing: index, relevanceScore, sentiment, aiSummary
No markdown, no code blocks, just the JSON array.`,
      },
    ],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "[]";
  try {
    const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Failed to parse Claude response for news analysis:", responseText.slice(0, 200));
    return [];
  }
}

export interface CrawlNewsResult {
  fetched: number;
  stored: number;
  analyzed: number;
}

export async function crawlNews(): Promise<CrawlNewsResult> {
  // Get all active watchlist tickers
  const watchlistItems = await prisma.watchlistItem.findMany({
    where: { isActive: true },
  });

  const tickers = watchlistItems.filter((w) => w.type === "ticker").map((w) => w.value);

  if (tickers.length === 0) {
    throw new Error("No tickers in watchlist");
  }

  // Get portfolio for context
  const holdings = await prisma.portfolioHolding.findMany({
    where: { isActive: true },
    select: { ticker: true, companyName: true, sector: true },
  });

  // Also add portfolio tickers to fetch list if not already in watchlist
  const allTickers = Array.from(new Set([...tickers, ...holdings.map((h) => h.ticker)]));

  // Fetch news for all tickers (capped at 25 per ticker, 3-day lookback)
  let allArticles: (FinnhubNewsItem & { fetchedTicker: string })[] = [];
  for (const ticker of allTickers) {
    const articles = await fetchFinnhubNews(ticker);
    allArticles = allArticles.concat(articles.map((a) => ({ ...a, fetchedTicker: ticker })));
  }

  if (allArticles.length === 0) {
    return { fetched: 0, stored: 0, analyzed: 0 };
  }

  // Deduplicate by Finnhub article ID
  const seen = new Set<number>();
  const unique: (FinnhubNewsItem & { fetchedTicker: string })[] = [];
  for (const article of allArticles) {
    if (!seen.has(article.id)) {
      seen.add(article.id);
      unique.push(article);
    }
  }

  // Store articles, skip duplicates
  let storedCount = 0;
  const toAnalyze: { dbId: string; headline: string; summary: string; relatedTickers: string[] }[] = [];

  for (const article of unique) {
    const relatedTickers = article.related
      ? article.related.split(",").map((t) => t.trim()).filter(Boolean)
      : [article.fetchedTicker];

    try {
      const existing = await prisma.marketNews.findUnique({
        where: { source_externalId: { source: "finnhub", externalId: String(article.id) } },
      });

      if (existing) {
        // Already stored — only re-analyze if no AI summary yet
        if (!existing.aiSummary) {
          toAnalyze.push({
            dbId: existing.id,
            headline: existing.headline,
            summary: existing.summary || "",
            relatedTickers: existing.relatedTickers,
          });
        }
        continue;
      }

      const created = await prisma.marketNews.create({
        data: {
          source: "finnhub",
          externalId: String(article.id),
          headline: article.headline,
          summary: article.summary || null,
          url: article.url,
          imageUrl: article.image || null,
          publishedAt: new Date(article.datetime * 1000),
          relatedTickers,
        },
      });

      toAnalyze.push({
        dbId: created.id,
        headline: created.headline,
        summary: created.summary || "",
        relatedTickers,
      });
      storedCount++;
    } catch (err) {
      // Unique constraint race condition — skip
      console.error("Failed to store article:", article.id, err);
    }
  }

  // Analyze articles with Claude in batches of 20
  let analyzedCount = 0;
  const batchSize = 20;

  for (let i = 0; i < toAnalyze.length; i += batchSize) {
    const batch = toAnalyze.slice(i, i + batchSize);
    const results = await analyzeNewsWithClaude(batch, holdings, watchlistItems);

    for (const result of results) {
      const article = batch[result.index];
      if (!article) continue;

      try {
        await prisma.marketNews.update({
          where: { id: article.dbId },
          data: {
            aiRelevanceScore: result.relevanceScore,
            aiSentiment: result.sentiment,
            aiSummary: result.aiSummary,
          },
        });
        analyzedCount++;
      } catch (err) {
        console.error("Failed to update article analysis:", article.dbId, err);
      }
    }
  }

  return {
    fetched: unique.length,
    stored: storedCount,
    analyzed: analyzedCount,
  };
}
