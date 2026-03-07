import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");
    const sentiment = searchParams.get("sentiment");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Record<string, unknown> = {};

    if (ticker) {
      where.relatedTickers = { has: ticker.toUpperCase() };
    }

    if (sentiment) {
      where.aiSentiment = sentiment;
    }

    const [articles, total] = await Promise.all([
      prisma.marketNews.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.marketNews.count({ where }),
    ]);

    return NextResponse.json({ data: articles, total });
  } catch (error) {
    console.error("Failed to list news:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to list news: ${msg}` }, { status: 500 });
  }
}
