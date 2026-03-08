import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Recent symptom logs
export async function GET() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const entries = await prisma.symptomLog.findMany({
      where: { date: { gte: since } },
      orderBy: { date: "desc" },
      take: 50,
    });

    const data = entries.map((e) => ({
      id: e.id,
      date: e.date.toISOString().slice(0, 10),
      symptoms: e.symptoms,
      severity: e.severity,
      notes: e.notes,
      resolved: e.resolved,
      resolvedDate: e.resolvedDate?.toISOString().slice(0, 10) ?? null,
      source: e.source,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Symptoms GET error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Create a symptom log
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, symptoms, severity, notes } = body as {
      date?: string;
      symptoms: string[];
      severity: number;
      notes?: string;
    };

    if (!symptoms || symptoms.length === 0) {
      return NextResponse.json({ error: "Symptoms array is required" }, { status: 400 });
    }

    const entry = await prisma.symptomLog.create({
      data: {
        date: new Date((date || new Date().toISOString().slice(0, 10)) + "T00:00:00Z"),
        symptoms,
        severity: Math.min(5, Math.max(1, severity || 3)),
        notes,
        source: "manual",
      },
    });

    return NextResponse.json({
      data: {
        id: entry.id,
        date: entry.date.toISOString().slice(0, 10),
        symptoms: entry.symptoms,
        severity: entry.severity,
      },
    });
  } catch (error) {
    console.error("Symptoms POST error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
