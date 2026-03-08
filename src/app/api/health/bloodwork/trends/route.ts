import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Trend data for a specific marker name across all panels
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const markerName = searchParams.get("marker");

    if (!markerName) {
      return NextResponse.json(
        { error: "marker query parameter is required" },
        { status: 400 }
      );
    }

    const markers = await prisma.bloodworkMarker.findMany({
      where: {
        name: {
          equals: markerName,
          mode: "insensitive",
        },
      },
      include: {
        panel: {
          select: { name: true, date: true },
        },
      },
      orderBy: {
        panel: { date: "asc" },
      },
    });

    const data = markers.map((m) => ({
      date: m.panel.date.toISOString().slice(0, 10),
      value: Number(m.value),
      unit: m.unit,
      flag: m.isFlagged ? m.flagDirection : null,
      panelName: m.panel.name,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Bloodwork trends GET error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
