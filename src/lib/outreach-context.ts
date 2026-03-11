import { prisma } from "@/lib/prisma";
import { googleCalendarFetch, getGoogleAccessToken } from "@/lib/google";

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

// ─── Calendar Context ───────────────────────────────────

interface CalendarEvent {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
}

interface CalendarListResponse {
  items?: CalendarEvent[];
}

export async function getCalendarContext(): Promise<string | null> {
  try {
    // Check if Google is connected
    const token = await getGoogleAccessToken("personal");
    if (!token) {
      const bizToken = await getGoogleAccessToken("business");
      if (!bizToken) return null;
    }

    const account = token ? "personal" : "business";
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const data = await googleCalendarFetch<CalendarListResponse>(
      "/calendars/primary/events",
      {
        params: {
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
          timeZone: "America/New_York",
        },
        account: account as "personal" | "business",
      }
    );

    const events = data.items || [];
    if (events.length === 0) return "Today's calendar: No events scheduled.";

    const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

    const lines = events.map((e) => {
      const startStr = e.start?.dateTime
        ? new Date(e.start.dateTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "America/New_York",
          })
        : "All day";
      const isPast = e.end?.dateTime
        ? new Date(e.end.dateTime) < etNow
        : false;
      const status = isPast ? " [PAST]" : "";
      return `- ${startStr}: ${e.summary || "Untitled"}${e.location ? ` @ ${e.location}` : ""}${status}`;
    });

    return `Today's calendar (${events.length} events):\n${lines.join("\n")}`;
  } catch (err) {
    console.error("Calendar context error:", err);
    return null;
  }
}

// ─── Fitness Follow-up Context ──────────────────────────

export async function getFitnessFollowUpContext(): Promise<string | null> {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Get workouts from today and yesterday
    const [todayWorkouts, todayCardio, yesterdayWorkouts, yesterdayCardio] = await Promise.all([
      prisma.workoutSession.findMany({
        where: { performedAt: { gte: startOfDay }, source: { not: "draft" } },
        select: { name: true, performedAt: true },
      }),
      prisma.cardioSession.findMany({
        where: { performedAt: { gte: startOfDay } },
        select: { activityType: true, performedAt: true, durationMinutes: true },
      }),
      prisma.workoutSession.findMany({
        where: { performedAt: { gte: yesterday, lt: startOfDay }, source: { not: "draft" } },
        select: { name: true, performedAt: true },
      }),
      prisma.cardioSession.findMany({
        where: { performedAt: { gte: yesterday, lt: startOfDay } },
        select: { activityType: true, performedAt: true, durationMinutes: true },
      }),
    ]);

    // Weekly totals
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const [weekWorkouts, weekCardio] = await Promise.all([
      prisma.workoutSession.count({
        where: { performedAt: { gte: monday }, source: { not: "draft" } },
      }),
      prisma.cardioSession.count({
        where: { performedAt: { gte: monday } },
      }),
    ]);

    const parts: string[] = [];

    if (todayWorkouts.length > 0 || todayCardio.length > 0) {
      const items = [
        ...todayWorkouts.map((w) => w.name),
        ...todayCardio.map((c) => `${c.activityType} (${c.durationMinutes}min)`),
      ];
      parts.push(`Today's activity: ${items.join(", ")}`);
    } else {
      parts.push("Today's activity: None logged yet");
    }

    if (yesterdayWorkouts.length > 0 || yesterdayCardio.length > 0) {
      const items = [
        ...yesterdayWorkouts.map((w) => w.name),
        ...yesterdayCardio.map((c) => `${c.activityType} (${c.durationMinutes}min)`),
      ];
      parts.push(`Yesterday: ${items.join(", ")}`);
    } else {
      parts.push("Yesterday: No activity logged");
    }

    parts.push(`This week: ${weekWorkouts} lifting, ${weekCardio} cardio sessions`);

    return `Fitness check-in:\n${parts.join("\n")}`;
  } catch (err) {
    console.error("Fitness follow-up context error:", err);
    return null;
  }
}

// ─── Goal Deadlines Context ─────────────────────────────

export async function getGoalDeadlineContext(): Promise<string | null> {
  try {
    const now = new Date();
    const twoWeeksOut = new Date(now);
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

    const urgentGoals = await prisma.goal.findMany({
      where: {
        status: "active",
        targetDate: { lte: twoWeeksOut },
      },
      select: {
        title: true,
        category: true,
        goalType: true,
        currentValue: true,
        targetValue: true,
        unit: true,
        targetDate: true,
      },
      orderBy: { targetDate: "asc" },
    });

    if (urgentGoals.length === 0) return null;

    const lines = urgentGoals.map((g) => {
      const daysLeft = Math.ceil(
        (new Date(g.targetDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      let progress = "";
      if (g.goalType === "quantitative" && g.currentValue != null && g.targetValue != null) {
        const pct = Math.round(
          (parseFloat(String(g.currentValue)) / parseFloat(String(g.targetValue))) * 100
        );
        progress = ` — ${pct}% complete`;
      }
      const urgency = daysLeft <= 0 ? " [OVERDUE]" : daysLeft <= 3 ? " [URGENT]" : "";
      return `- ${g.title} [${g.category}]: ${daysLeft}d left${progress}${urgency}`;
    });

    return `Upcoming goal deadlines:\n${lines.join("\n")}`;
  } catch (err) {
    console.error("Goal deadline context error:", err);
    return null;
  }
}

// ─── Combined External Context ──────────────────────────

export async function getExternalContext(): Promise<string | null> {
  const [weather, market, calendar, fitness, goals] = await Promise.all([
    getWeatherContext(),
    getMarketContext(),
    getCalendarContext(),
    getFitnessFollowUpContext(),
    getGoalDeadlineContext(),
  ]);

  const sections = [weather, calendar, fitness, goals, market].filter(Boolean);
  if (sections.length === 0) return null;

  return `EXTERNAL CONTEXT (real-time data for outreach decisions):\n${sections.join("\n\n")}`;
}
