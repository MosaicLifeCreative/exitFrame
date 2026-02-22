import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (dateFrom || dateTo) {
      where.startedAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
      };
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({ data: entries });
  } catch (error) {
    console.error("Failed to list time entries:", error);
    return NextResponse.json({ error: "Failed to list time entries" }, { status: 500 });
  }
}
