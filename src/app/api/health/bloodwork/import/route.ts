import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

interface ImportMarker {
  name: string;
  value: number;
  unit: string;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  category?: string | null;
  notes?: string | null;
}

interface ImportPanel {
  name: string;
  date: string;
  provider?: string | null;
  labName?: string | null;
  notes?: string | null;
  markers: ImportMarker[];
}

// POST: Bulk import panels with markers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { panels } = body as { panels: ImportPanel[] };

    if (!panels || !Array.isArray(panels) || panels.length === 0) {
      return NextResponse.json(
        { error: "panels array is required and must not be empty" },
        { status: 400 }
      );
    }

    const now = new Date();
    const results = [];

    for (const p of panels) {
      if (!p.name || !p.date) {
        continue;
      }

      const markerData = (p.markers || []).map((m) => {
        let isFlagged = false;
        let flagDirection: string | null = null;
        if (m.referenceLow != null && m.value < m.referenceLow) {
          isFlagged = true;
          flagDirection = "low";
        } else if (m.referenceHigh != null && m.value > m.referenceHigh) {
          isFlagged = true;
          flagDirection = "high";
        }

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
          name: p.name,
          date: new Date(p.date + "T00:00:00Z"),
          provider: p.provider || null,
          labName: p.labName || null,
          notes: p.notes || null,
          importedFrom: "notion",
          importedAt: now,
          markers: {
            create: markerData,
          },
        },
        include: {
          markers: { select: { isFlagged: true } },
        },
      });

      results.push({
        id: panel.id,
        name: panel.name,
        date: panel.date.toISOString().slice(0, 10),
        markerCount: panel.markers.length,
        flaggedCount: panel.markers.filter((m) => m.isFlagged).length,
      });
    }

    return NextResponse.json({
      data: {
        imported: results.length,
        panels: results,
      },
    });
  } catch (error) {
    console.error("Bloodwork import POST error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
