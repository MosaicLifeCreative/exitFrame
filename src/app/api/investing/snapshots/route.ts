import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "90", 10);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { snapshotDate: { gte: since } },
      orderBy: { snapshotDate: "asc" },
    });

    const data = snapshots.map((s) => ({
      id: s.id,
      portfolioType: s.portfolioType,
      totalValue: Number(s.totalValue),
      cashValue: Number(s.cashValue),
      holdingsValue: Number(s.holdingsValue),
      positionCount: s.positionCount,
      snapshotDate: s.snapshotDate,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to get snapshots:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to get snapshots: ${msg}` }, { status: 500 });
  }
}
