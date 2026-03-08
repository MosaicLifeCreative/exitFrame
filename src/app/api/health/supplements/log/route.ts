import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Log supplement intake (toggle)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

    if (body.all) {
      // Mark all active daily supplements as taken
      const actives = await prisma.supplement.findMany({
        where: { isActive: true, frequency: { in: ["daily", "twice-daily"] } },
      });

      for (const sup of actives) {
        await prisma.supplementLog.upsert({
          where: { supplementId_date: { supplementId: sup.id, date: today } },
          create: { supplementId: sup.id, date: today, taken: true },
          update: { taken: true },
        });
      }

      return NextResponse.json({ data: { logged: actives.length } });
    }

    const { supplementId } = body as { supplementId: string };
    if (!supplementId) {
      return NextResponse.json({ error: "supplementId required" }, { status: 400 });
    }

    // Toggle: if already taken today, un-take it
    const existing = await prisma.supplementLog.findUnique({
      where: { supplementId_date: { supplementId, date: today } },
    });

    if (existing) {
      await prisma.supplementLog.update({
        where: { id: existing.id },
        data: { taken: !existing.taken },
      });
      return NextResponse.json({ data: { taken: !existing.taken } });
    }

    await prisma.supplementLog.create({
      data: { supplementId, date: today, taken: true },
    });

    return NextResponse.json({ data: { taken: true } });
  } catch (error) {
    console.error("Supplement log error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
