import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE: Remove a supplement (soft delete — sets inactive, or hard delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.supplement.update({
      where: { id },
      data: {
        isActive: false,
        endDate: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"),
      },
    });

    return NextResponse.json({ data: { deactivated: true } });
  } catch (error) {
    console.error("Supplement delete error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: Update a supplement
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, dosage, frequency, category, notes, isActive } = body as {
      name?: string;
      dosage?: string;
      frequency?: string;
      category?: string;
      notes?: string;
      isActive?: boolean;
    };

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (dosage !== undefined) data.dosage = dosage;
    if (frequency !== undefined) data.frequency = frequency;
    if (category !== undefined) data.category = category;
    if (notes !== undefined) data.notes = notes;
    if (isActive !== undefined) {
      data.isActive = isActive;
      if (!isActive) data.endDate = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
      else data.endDate = null;
    }

    const supplement = await prisma.supplement.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      data: {
        id: supplement.id,
        name: supplement.name,
        dosage: supplement.dosage,
        frequency: supplement.frequency,
        isActive: supplement.isActive,
      },
    });
  } catch (error) {
    console.error("Supplement update error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
