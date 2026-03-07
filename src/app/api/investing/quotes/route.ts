import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const quotes = await prisma.stockQuote.findMany({
      orderBy: { ticker: "asc" },
    });

    const data = quotes.map((q) => ({
      ticker: q.ticker,
      price: Number(q.price),
      change: q.change ? Number(q.change) : null,
      changePct: q.changePct ? Number(q.changePct) : null,
      high: q.high ? Number(q.high) : null,
      low: q.low ? Number(q.low) : null,
      updatedAt: q.updatedAt,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to get quotes:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to get quotes: ${msg}` }, { status: 500 });
  }
}
