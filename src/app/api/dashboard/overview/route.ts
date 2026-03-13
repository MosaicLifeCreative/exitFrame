import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHeartRate } from "@/lib/neurotransmitters";
import { googleCalendarFetch } from "@/lib/google";

export const dynamic = "force-dynamic";

interface CalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
}

interface CalendarListResponse {
  items?: CalendarEvent[];
}

export async function GET() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Week boundaries (Monday-based)
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);

  // Run all fetches in parallel, each wrapped in its own try/catch
  const [
    aydenResult,
    calendarResult,
    tasksResult,
    notesResult,
    fitnessResult,
    travelResult,
    hobbiesResult,
    investingResult,
    healthResult,
  ] = await Promise.all([
    // 1. Ayden status
    (async () => {
      try {
        const [hr, emotion, latestThought] = await Promise.all([
          getHeartRate(),
          prisma.aydenEmotionalState.findFirst({
            where: { isActive: true },
            orderBy: [{ updatedAt: "desc" }],
            select: { dimension: true, intensity: true },
          }),
          prisma.aydenThought.findFirst({
            orderBy: { createdAt: "desc" },
            select: { thought: true, createdAt: true },
          }),
        ]);
        return {
          bpm: hr.bpm,
          state: hr.state,
          emotion: emotion?.dimension ?? null,
          emotionIntensity: emotion?.intensity ?? null,
          thought: latestThought?.thought ?? null,
          thoughtAt: latestThought?.createdAt ?? null,
        };
      } catch (e) {
        console.error("Dashboard overview — ayden error:", e);
        return null;
      }
    })(),

    // 2. Google Calendar — today's events
    (async () => {
      try {
        const data = await googleCalendarFetch<CalendarListResponse>(
          "/calendars/primary/events",
          {
            params: {
              timeZone: "America/New_York",
              singleEvents: "true",
              orderBy: "startTime",
              maxResults: "5",
              timeMin: now.toISOString(),
              timeMax: todayEnd.toISOString(),
            },
            account: "business",
          }
        );
        return (data.items || []).map((e) => ({
          id: e.id,
          title: e.summary || "Untitled",
          start: e.start?.dateTime || e.start?.date || null,
          end: e.end?.dateTime || e.end?.date || null,
          location: e.location || null,
        }));
      } catch (e) {
        console.error("Dashboard overview — calendar error:", e);
        return null;
      }
    })(),

    // 3. Active tasks (top 5 by score, then priority)
    (async () => {
      try {
        const tasks = await prisma.task.findMany({
          where: { status: { in: ["todo", "in_progress"] } },
          orderBy: [{ computedScore: "desc" }, { urgencyScore: "desc" }, { dueDate: "asc" }],
          take: 5,
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            dueDate: true,
            computedScore: true,
            group: { select: { name: true, color: true } },
          },
        });
        return tasks.map((t) => ({
          ...t,
          score: t.computedScore ? Number(t.computedScore) : null,
        }));
      } catch (e) {
        console.error("Dashboard overview — tasks error:", e);
        return null;
      }
    })(),

    // 4. Recent notes (3 most recent)
    (async () => {
      try {
        return await prisma.note.findMany({
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: {
            id: true,
            title: true,
            noteType: true,
            updatedAt: true,
            domain: true,
          },
        });
      } catch (e) {
        console.error("Dashboard overview — notes error:", e);
        return null;
      }
    })(),

    // 5. Fitness this week
    (async () => {
      try {
        const [sessions, cardio] = await Promise.all([
          prisma.workoutSession.findMany({
            where: {
              performedAt: { gte: weekStart },
              source: { not: "draft" },
            },
            orderBy: { performedAt: "desc" },
            select: {
              id: true,
              name: true,
              performedAt: true,
              durationMinutes: true,
            },
          }),
          prisma.cardioSession.findMany({
            where: { performedAt: { gte: weekStart } },
            orderBy: { performedAt: "desc" },
            select: {
              id: true,
              activityType: true,
              performedAt: true,
              durationMinutes: true,
            },
          }),
        ]);

        const totalWorkouts = sessions.length + cardio.length;
        const totalMinutes =
          sessions.reduce((s, w) => s + (w.durationMinutes || 0), 0) +
          cardio.reduce((s, c) => s + (c.durationMinutes || 0), 0);

        // Most recent session name
        const allSorted = [
          ...sessions.map((s) => ({ name: s.name, at: s.performedAt })),
          ...cardio.map((c) => ({
            name: c.activityType.charAt(0).toUpperCase() + c.activityType.slice(1),
            at: c.performedAt,
          })),
        ].sort((a, b) => b.at.getTime() - a.at.getTime());

        return {
          workoutCount: totalWorkouts,
          totalMinutes,
          latestSession: allSorted[0]?.name ?? null,
          latestSessionAt: allSorted[0]?.at ?? null,
        };
      } catch (e) {
        console.error("Dashboard overview — fitness error:", e);
        return null;
      }
    })(),

    // 6. Upcoming travel
    (async () => {
      try {
        const trip = await prisma.trip.findFirst({
          where: { status: "upcoming", startDate: { gte: todayStart } },
          orderBy: { startDate: "asc" },
          include: {
            destinations: { orderBy: { sortOrder: "asc" }, take: 1 },
          },
        });
        if (!trip) return null;
        const daysUntil = Math.ceil(
          (trip.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: trip.id,
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          daysUntil,
          destination: trip.destinations[0]
            ? `${trip.destinations[0].city}${trip.destinations[0].state ? `, ${trip.destinations[0].state}` : ""}`
            : null,
        };
      } catch (e) {
        console.error("Dashboard overview — travel error:", e);
        return null;
      }
    })(),

    // 7. Hobbies (active only)
    (async () => {
      try {
        const hobbies = await prisma.hobby.findMany({
          where: { status: "active" },
          include: {
            logs: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
            _count: { select: { logs: true } },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          take: 5,
        });
        return hobbies.map((h) => ({
          id: h.id,
          name: h.name,
          icon: h.icon,
          logCount: h._count.logs,
          lastLogDate: h.logs[0]?.createdAt ?? null,
        }));
      } catch (e) {
        console.error("Dashboard overview — hobbies error:", e);
        return null;
      }
    })(),

    // 8. Investing snapshot
    (async () => {
      try {
        const portfolio = await prisma.aiPortfolio.findFirst({
          where: { isActive: true },
          include: { positions: true },
        });
        if (!portfolio) return null;

        const quotes = await prisma.stockQuote.findMany();
        const quoteMap = new Map(
          quotes.map((q) => [q.ticker, { price: Number(q.price), changePct: q.changePct ? Number(q.changePct) : null }])
        );

        let holdingsValue = 0;
        for (const p of portfolio.positions) {
          const quote = quoteMap.get(p.ticker);
          const price = quote?.price || Number(p.avgCostBasis);
          holdingsValue += Number(p.shares) * price;
        }

        const cashBalance = Number(portfolio.cashBalance);
        const totalValue = cashBalance + holdingsValue;
        const startingCapital = Number(portfolio.startingCapital);
        const totalReturn = startingCapital > 0 ? ((totalValue - startingCapital) / startingCapital) * 100 : 0;

        return {
          portfolioName: portfolio.name,
          totalValue,
          totalReturn,
          positionCount: portfolio.positions.length,
        };
      } catch (e) {
        console.error("Dashboard overview — investing error:", e);
        return null;
      }
    })(),

    // 9. Health — latest Oura sleep + recent symptoms
    (async () => {
      try {
        const [ouraData, recentSymptoms] = await Promise.all([
          prisma.ouraData.findFirst({
            where: { dataType: "daily_sleep" },
            orderBy: { date: "desc" },
            select: { data: true, date: true },
          }),
          prisma.symptomLog.count({
            where: {
              date: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
              resolved: false,
            },
          }),
        ]);

        let sleepScore: number | null = null;
        if (ouraData?.data && typeof ouraData.data === "object") {
          const d = ouraData.data as Record<string, unknown>;
          if (typeof d.score === "number") sleepScore = d.score;
        }

        return {
          sleepScore,
          sleepDate: ouraData?.date ?? null,
          unresolvedSymptoms: recentSymptoms,
        };
      } catch (e) {
        console.error("Dashboard overview — health error:", e);
        return null;
      }
    })(),
  ]);

  return NextResponse.json({
    data: {
      ayden: aydenResult,
      calendar: calendarResult,
      tasks: tasksResult,
      notes: notesResult,
      fitness: fitnessResult,
      travel: travelResult,
      hobbies: hobbiesResult,
      investing: investingResult,
      health: healthResult,
    },
  });
}
