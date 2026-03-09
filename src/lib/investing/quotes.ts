import { prisma } from "@/lib/prisma";

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

export async function fetchQuote(ticker: string): Promise<FinnhubQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error("FINNHUB_API_KEY not configured");

  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`Finnhub quote error for ${ticker}: ${res.status}`);
    return null;
  }

  const data: FinnhubQuote = await res.json();
  // Finnhub returns c=0 for invalid tickers
  if (!data.c || data.c === 0) return null;

  return data;
}

export async function fetchAndStoreQuotes(tickers: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  const uniqueTickers = Array.from(new Set(tickers));

  for (const ticker of uniqueTickers) {
    try {
      const quote = await fetchQuote(ticker);
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
      console.error(`Failed to fetch quote for ${ticker}:`, err);
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
