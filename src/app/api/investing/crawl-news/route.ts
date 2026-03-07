import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  const from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days back
  const fromStr = from.toISOString().split("T")[0];
  const toStr = now.toISOString().split("T")[0];

  const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromStr}&to=${toStr}&token=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`Finnhub error for ${ticker}: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function analyzeNewsWithClaude(
  articles: { headline: string; summary: string; relatedTickers: string[] }[],
  portfolio: { ticker: string; companyName: string; sector: string | null }[],
  watchlist: { type: string; value: string; label: string }[]
): Promise<{ index: number; relevanceScore: number; sentiment: string; aiSummary: string }[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey });

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
        content: `You are a swing trading analyst. Analyze these news articles for relevance to a trader with the following positions and interests.

PORTFOLIO: ${portfolioDesc}
WATCHLIST: ${watchlistDesc}

For each article, provide:
- relevanceScore: 0.0 to 1.0 (how relevant to the portfolio/watchlist)
- sentiment: "bullish", "bearish", or "neutral" (market impact)
- aiSummary: 1-2 sentence analysis focused on what matters for a swing trader

Focus on: price catalysts, earnings impact, sector momentum, regulatory changes, and technical breakout/breakdown signals. Ignore generic market commentary with no actionable signal.

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

export async function POST() {
  try {
    // Get all active watchlist tickers
    const watchlistItems = await prisma.watchlistItem.findMany({
      where: { isActive: true },
    });

    const tickers = watchlistItems.filter((w) => w.type === "ticker").map((w) => w.value);

    if (tickers.length === 0) {
      return NextResponse.json({ error: "No tickers in watchlist" }, { status: 400 });
    }

    // Get portfolio for context
    const holdings = await prisma.portfolioHolding.findMany({
      where: { isActive: true },
      select: { ticker: true, companyName: true, sector: true },
    });

    // Also add portfolio tickers to fetch list if not already in watchlist
    const allTickers = Array.from(new Set([...tickers, ...holdings.map((h) => h.ticker)]));

    // Fetch news for all tickers
    let allArticles: (FinnhubNewsItem & { fetchedTicker: string })[] = [];
    for (const ticker of allTickers) {
      const articles = await fetchFinnhubNews(ticker);
      allArticles = allArticles.concat(articles.map((a) => ({ ...a, fetchedTicker: ticker })));
    }

    if (allArticles.length === 0) {
      return NextResponse.json({ data: { stored: 0, analyzed: 0 } });
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

    return NextResponse.json({
      data: {
        fetched: unique.length,
        stored: storedCount,
        analyzed: analyzedCount,
      },
    });
  } catch (error) {
    console.error("Failed to crawl news:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to crawl news: ${msg}` }, { status: 500 });
  }
}
