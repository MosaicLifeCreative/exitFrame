import { prisma } from "@/lib/prisma";

// ─── Weather (OpenWeatherMap) ────────────────────────────

interface WeatherData {
  temp: number;
  feelsLike: number;
  description: string;
  windMph: number;
  humidity: number;
  high: number;
  low: number;
  alerts?: string[];
}

export async function getWeatherContext(): Promise<string | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    // Columbus, OH (Trey's location) — use 2.5 API (free tier)
    const lat = 39.9612;
    const lon = -82.9988;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    const weather: WeatherData = {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather?.[0]?.description || "unknown",
      windMph: Math.round(data.wind?.speed || 0),
      humidity: data.main.humidity,
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
    };

    return formatWeather(weather);
  } catch (err) {
    console.error("Weather fetch error:", err);
    return null;
  }
}

function formatWeather(w: WeatherData): string {
  let text = `Weather (Columbus, OH): ${w.temp}°F (feels ${w.feelsLike}°F), ${w.description}. High ${w.high}°F, Low ${w.low}°F. Wind ${w.windMph} mph, humidity ${w.humidity}%.`;
  if (w.alerts && w.alerts.length > 0) {
    text += ` ALERTS: ${w.alerts.join(", ")}.`;
  }
  return text;
}

// ─── Market Moves ────────────────────────────────────────

interface MarketAlert {
  ticker: string;
  changePct: number;
  price: number;
  isHolding: boolean;
  isAiPosition: boolean;
}

export async function getMarketContext(): Promise<string | null> {
  try {
    // Get all quotes updated in the last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const quotes = await prisma.stockQuote.findMany({
      where: { updatedAt: { gte: oneDayAgo } },
      select: { ticker: true, price: true, changePct: true },
    });

    if (quotes.length === 0) return null;

    // Get user's holdings and AI positions for context
    const [holdings, aiPositions] = await Promise.all([
      prisma.portfolioHolding.findMany({
        where: { isActive: true },
        select: { ticker: true },
      }),
      prisma.aiPosition.findMany({
        select: { ticker: true },
      }),
    ]);

    const holdingTickers = new Set(holdings.map((h) => h.ticker));
    const aiTickers = new Set(aiPositions.map((p) => p.ticker));

    // Flag significant moves (>3% for holdings, >5% for watchlist)
    const alerts: MarketAlert[] = [];
    for (const q of quotes) {
      if (!q.changePct) continue;
      const pct = parseFloat(String(q.changePct));
      const isHolding = holdingTickers.has(q.ticker);
      const isAi = aiTickers.has(q.ticker);
      const threshold = isHolding || isAi ? 3 : 5;

      if (Math.abs(pct) >= threshold) {
        alerts.push({
          ticker: q.ticker,
          changePct: pct,
          price: parseFloat(String(q.price)),
          isHolding,
          isAiPosition: isAi,
        });
      }
    }

    if (alerts.length === 0) return null;

    // Sort by absolute change, biggest moves first
    alerts.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

    const lines = alerts.slice(0, 5).map((a) => {
      const direction = a.changePct > 0 ? "up" : "down";
      const label = a.isHolding ? " (Trey's holding)" : a.isAiPosition ? " (Ayden's position)" : "";
      return `${a.ticker}: ${direction} ${Math.abs(a.changePct).toFixed(1)}% at $${a.price.toFixed(2)}${label}`;
    });

    return `Market moves:\n${lines.join("\n")}`;
  } catch (err) {
    console.error("Market context error:", err);
    return null;
  }
}

// ─── Combined External Context ──────────────────────────

export async function getExternalContext(): Promise<string | null> {
  const [weather, market] = await Promise.all([
    getWeatherContext(),
    getMarketContext(),
  ]);

  const sections = [weather, market].filter(Boolean);
  if (sections.length === 0) return null;

  return `EXTERNAL CONTEXT (real-time data for outreach decisions):\n${sections.join("\n\n")}`;
}
