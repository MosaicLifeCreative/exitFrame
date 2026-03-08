import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Active supplements
export async function GET() {
  try {
    const supplements = await prisma.supplement.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    const data = supplements.map((s) => ({
      id: s.id,
      name: s.name,
      dosage: s.dosage,
      frequency: s.frequency,
      category: s.category,
      notes: s.notes,
      isActive: s.isActive,
      startDate: s.startDate?.toISOString().slice(0, 10) ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Supplements GET error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Create a supplement
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, dosage, frequency, category, notes } = body as {
      name: string;
      dosage?: string;
      frequency?: string;
      category?: string;
      notes?: string;
    };

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supplement = await prisma.supplement.create({
      data: {
        name,
        dosage,
        frequency: frequency || "daily",
        category,
        notes,
        startDate: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"),
      },
    });

    return NextResponse.json({
      data: {
        id: supplement.id,
        name: supplement.name,
        dosage: supplement.dosage,
        frequency: supplement.frequency,
        category: supplement.category,
      },
    });
  } catch (error) {
    console.error("Supplements POST error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
