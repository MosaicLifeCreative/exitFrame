import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

// POST: Add a marker to an existing panel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, value, unit, referenceLow, referenceHigh, category, notes } =
      body as {
        name: string;
        value: number;
        unit: string;
        referenceLow?: number | null;
        referenceHigh?: number | null;
        category?: string | null;
        notes?: string | null;
      };

    if (!name || value == null || !unit) {
      return NextResponse.json(
        { error: "Name, value, and unit are required" },
        { status: 400 }
      );
    }

    // Verify panel exists
    const panel = await prisma.bloodworkPanel.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 });
    }

    // Auto-compute flag
    let isFlagged = false;
    let flagDirection: string | null = null;
    if (referenceLow != null && value < referenceLow) {
      isFlagged = true;
      flagDirection = "low";
    } else if (referenceHigh != null && value > referenceHigh) {
      isFlagged = true;
      flagDirection = "high";
    }

    const marker = await prisma.bloodworkMarker.create({
      data: {
        panelId: id,
        name,
        value: new Decimal(value),
        unit,
        referenceLow:
          referenceLow != null ? new Decimal(referenceLow) : null,
        referenceHigh:
          referenceHigh != null ? new Decimal(referenceHigh) : null,
        isFlagged,
        flagDirection,
        category: category || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      data: {
        id: marker.id,
        panelId: marker.panelId,
        name: marker.name,
        value: Number(marker.value),
        unit: marker.unit,
        referenceLow:
          marker.referenceLow != null ? Number(marker.referenceLow) : null,
        referenceHigh:
          marker.referenceHigh != null ? Number(marker.referenceHigh) : null,
        isFlagged: marker.isFlagged,
        flagDirection: marker.flagDirection,
        category: marker.category,
        notes: marker.notes,
      },
    });
  } catch (error) {
    console.error("Bloodwork marker POST error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
