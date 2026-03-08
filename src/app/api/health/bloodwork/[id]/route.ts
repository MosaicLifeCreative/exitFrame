import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Single panel with all markers
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const panel = await prisma.bloodworkPanel.findUnique({
      where: { id },
      include: {
        markers: {
          orderBy: [{ category: "asc" }, { name: "asc" }],
        },
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "Panel not found" }, { status: 404 });
    }

    const data = {
      id: panel.id,
      name: panel.name,
      date: panel.date.toISOString().slice(0, 10),
      provider: panel.provider,
      labName: panel.labName,
      notes: panel.notes,
      importedFrom: panel.importedFrom,
      importedAt: panel.importedAt?.toISOString() ?? null,
      createdAt: panel.createdAt.toISOString(),
      updatedAt: panel.updatedAt.toISOString(),
      markers: panel.markers.map((m) => ({
        id: m.id,
        name: m.name,
        value: Number(m.value),
        unit: m.unit,
        referenceLow: m.referenceLow != null ? Number(m.referenceLow) : null,
        referenceHigh:
          m.referenceHigh != null ? Number(m.referenceHigh) : null,
        isFlagged: m.isFlagged,
        flagDirection: m.flagDirection,
        category: m.category,
        notes: m.notes,
      })),
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Bloodwork panel GET error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: Update panel metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, date, provider, labName, notes } = body as {
      name?: string;
      date?: string;
      provider?: string;
      labName?: string;
      notes?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (date !== undefined) updateData.date = new Date(date + "T00:00:00Z");
    if (provider !== undefined) updateData.provider = provider;
    if (labName !== undefined) updateData.labName = labName;
    if (notes !== undefined) updateData.notes = notes;

    const panel = await prisma.bloodworkPanel.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      data: {
        id: panel.id,
        name: panel.name,
        date: panel.date.toISOString().slice(0, 10),
        provider: panel.provider,
        labName: panel.labName,
        notes: panel.notes,
      },
    });
  } catch (error) {
    console.error("Bloodwork panel PATCH error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Delete panel (cascades to markers)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.bloodworkPanel.delete({
      where: { id },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Bloodwork panel DELETE error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
