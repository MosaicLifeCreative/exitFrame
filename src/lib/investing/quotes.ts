import { prisma } from "@/lib/prisma";
import { getMarketQuotes } from "@/lib/tastytrade";

// ─── Finnhub (fallback for tickers tastytrade doesn't cover) ───

interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp
}

async function fetchFinnhubQuote(ticker: string): Promise<FinnhubQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data: FinnhubQuote = await res.json();
  if (!data.c || data.c === 0) return null;
  return data;
}

// ─── Main Quote Fetcher (tastytrade primary, Finnhub fallback) ───

export async function fetchAndStoreQuotes(tickers: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  const uniqueTickers = Array.from(new Set(tickers));

  // Step 1: Batch fetch from tastytrade
  let ttQuotes: Awaited<ReturnType<typeof getMarketQuotes>> = [];
  try {
    ttQuotes = await getMarketQuotes(uniqueTickers);
  } catch (err) {
    console.error("tastytrade quote batch failed, falling back to Finnhub:", err instanceof Error ? err.message : err);
  }

  // Store TT quotes
  const fetched = new Set<string>();
  for (const q of ttQuotes) {
    try {
      await prisma.stockQuote.upsert({
        where: { ticker: q.symbol },
        create: {
          ticker: q.symbol,
          price: q.last,
          change: q.change,
          changePct: q.changePct,
          high: q.high || null,
          low: q.low || null,
          volume: q.volume || null,
        },
        update: {
          price: q.last,
          change: q.change,
          changePct: q.changePct,
          high: q.high || null,
          low: q.low || null,
          volume: q.volume || null,
        },
      });
      priceMap.set(q.symbol, q.last);
      fetched.add(q.symbol);
    } catch (err) {
      console.error(`Failed to store TT quote for ${q.symbol}:`, err);
    }
  }

  // Step 2: Finnhub fallback for any tickers TT missed
  const missing = uniqueTickers.filter((t) => !fetched.has(t));
  if (missing.length > 0) {
    console.log(`TT missed ${missing.length} tickers, falling back to Finnhub: ${missing.join(", ")}`);
    for (const ticker of missing) {
      try {
        const quote = await fetchFinnhubQuote(ticker);
        if (!quote) continue;

        await prisma.stockQuote.upsert({
          where: { ticker },
          create: {
            ticker,
            price: quote.c,
            change: quote.d,
            changePct: quote.dp,
            high: quote.h,
            low: quote.l,
            volume: null,
          },
          update: {
            price: quote.c,
            change: quote.d,
            changePct: quote.dp,
            high: quote.h,
            low: quote.l,
          },
        });

        priceMap.set(ticker, quote.c);
      } catch (err) {
        console.error(`Finnhub fallback failed for ${ticker}:`, err);
      }
    }
  }

  return priceMap;
}

export async function getAllQuotes(): Promise<Map<string, { price: number; change: number | null; changePct: number | null }>> {
  const quotes = await prisma.stockQuote.findMany();
  const map = new Map<string, { price: number; change: number | null; changePct: number | null }>();

  for (const q of quotes) {
    map.set(q.ticker, {
      price: Number(q.price),
      change: q.change ? Number(q.change) : null,
      changePct: q.changePct ? Number(q.changePct) : null,
    });
  }

  return map;
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // M-F, 9:30 AM - 4:00 PM ET
  if (day === 0 || day === 6) return false;
  if (timeInMinutes < 570 || timeInMinutes >= 960) return false; // 570 = 9:30, 960 = 16:00

  return true;
}

export function isMarketCloseWindow(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // M-F, 4:00-4:30 PM ET window for EOD snapshots
  if (day === 0 || day === 6) return false;
  return timeInMinutes >= 960 && timeInMinutes < 990;
}

export function shouldCrawlNews(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hours = et.getHours();

  // M-F only
  if (day === 0 || day === 6) return false;

  // Crawl at market open (9), midday (12), close (16), and evening (19)
  return hours === 9 || hours === 12 || hours === 16 || hours === 19;
}
