import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

function computeFlag(
  value: number,
  referenceLow?: number | null,
  referenceHigh?: number | null
): { isFlagged: boolean; flagDirection: string | null } {
  if (referenceLow != null && value < referenceLow) {
    return { isFlagged: true, flagDirection: "low" };
  }
  if (referenceHigh != null && value > referenceHigh) {
    return { isFlagged: true, flagDirection: "high" };
  }
  return { isFlagged: false, flagDirection: null };
}

// GET: List all panels with marker count and flagged count
export async function GET() {
  try {
    const panels = await prisma.bloodworkPanel.findMany({
      orderBy: { date: "desc" },
      include: {
        markers: {
          select: { isFlagged: true },
        },
      },
    });

    const data = panels.map((p) => ({
      id: p.id,
      name: p.name,
      date: p.date.toISOString().slice(0, 10),
      provider: p.provider,
      labName: p.labName,
      notes: p.notes,
      importedFrom: p.importedFrom,
      markerCount: p.markers.length,
      flaggedCount: p.markers.filter((m) => m.isFlagged).length,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Bloodwork panels GET error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface MarkerInput {
  name: string;
  value: number;
  unit: string;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  category?: string | null;
  notes?: string | null;
}

// POST: Create a panel with markers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, date, provider, labName, notes, markers } = body as {
      name: string;
      date: string;
      provider?: string;
      labName?: string;
      notes?: string;
      markers?: MarkerInput[];
    };

    if (!name || !date) {
      return NextResponse.json(
        { error: "Name and date are required" },
        { status: 400 }
      );
    }

    const markerData = (markers || []).map((m) => {
      const { isFlagged, flagDirection } = computeFlag(
        m.value,
        m.referenceLow,
        m.referenceHigh
      );
      return {
        name: m.name,
        value: new Decimal(m.value),
        unit: m.unit,
        referenceLow:
          m.referenceLow != null ? new Decimal(m.referenceLow) : null,
        referenceHigh:
          m.referenceHigh != null ? new Decimal(m.referenceHigh) : null,
        isFlagged,
        flagDirection,
        category: m.category || null,
        notes: m.notes || null,
      };
    });

    const panel = await prisma.bloodworkPanel.create({
      data: {
        name,
        date: new Date(date + "T00:00:00Z"),
        provider: provider || null,
        labName: labName || null,
        notes: notes || null,
        markers: {
          create: markerData,
        },
      },
      include: {
        markers: true,
      },
    });

    return NextResponse.json({
      data: {
        id: panel.id,
        name: panel.name,
        date: panel.date.toISOString().slice(0, 10),
        provider: panel.provider,
        labName: panel.labName,
        markerCount: panel.markers.length,
        flaggedCount: panel.markers.filter((m) => m.isFlagged).length,
      },
    });
  } catch (error) {
    console.error("Bloodwork panel POST error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
