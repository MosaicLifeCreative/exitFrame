import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Supplement intake history for N days
export async function GET(request: NextRequest) {
  try {
    const days = parseInt(request.nextUrl.searchParams.get("days") || "7", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceDate = new Date(since.toISOString().slice(0, 10) + "T00:00:00Z");

    const supplements = await prisma.supplement.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const logs = await prisma.supplementLog.findMany({
      where: { date: { gte: sinceDate } },
      include: { supplement: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    // Group logs by date
    const logsByDate = new Map<string, Map<string, boolean>>();
    for (const log of logs) {
      const dateStr = log.date.toISOString().slice(0, 10);
      if (!logsByDate.has(dateStr)) logsByDate.set(dateStr, new Map());
      logsByDate.get(dateStr)!.set(log.supplement.name, log.taken);
    }

    // Build result for each day
    const data: Array<{
      date: string;
      supplements: Array<{ name: string; taken: boolean }>;
    }> = [];

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const dayLogs = logsByDate.get(dateStr);

      data.push({
        date: dateStr,
        supplements: supplements.map((s) => ({
          name: s.name,
          taken: dayLogs?.get(s.name) ?? false,
        })),
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Supplement logs error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
