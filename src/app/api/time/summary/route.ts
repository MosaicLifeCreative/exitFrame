import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    const where: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      where.startedAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
      };
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    // Aggregate by client
    const byClient: Record<string, { name: string; minutes: number }> = {};
    const byModule: Record<string, number> = {};
    let totalMinutes = 0;

    for (const entry of entries) {
      const mins = entry.durationMinutes ?? 0;
      totalMinutes += mins;

      const clientKey = entry.clientId ?? "personal";
      const clientName = entry.client?.name ?? "Personal";
      if (!byClient[clientKey]) {
        byClient[clientKey] = { name: clientName, minutes: 0 };
      }
      byClient[clientKey].minutes += mins;

      if (!byModule[entry.module]) {
        byModule[entry.module] = 0;
      }
      byModule[entry.module] += mins;
    }

    return NextResponse.json({
      data: {
        totalMinutes,
        byClient: Object.entries(byClient).map(([id, data]) => ({
          id,
          name: data.name,
          minutes: data.minutes,
        })),
        byModule: Object.entries(byModule).map(([name, minutes]) => ({
          name,
          minutes,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to get time summary:", error);
    return NextResponse.json({ error: "Failed to get time summary" }, { status: 500 });
  }
}
