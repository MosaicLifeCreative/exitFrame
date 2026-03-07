import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const createWatchlistSchema = z.object({
  type: z.enum(["ticker", "sector"]),
  value: z.string().min(1, "Value is required"),
  label: z.string().min(1, "Label is required"),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const items = await prisma.watchlistItem.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { value: "asc" }],
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("Failed to list watchlist:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to list watchlist: ${msg}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createWatchlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const value = parsed.data.type === "ticker"
      ? parsed.data.value.toUpperCase().trim()
      : parsed.data.value.trim();

    const item = await prisma.watchlistItem.create({
      data: {
        type: parsed.data.type,
        value,
        label: parsed.data.label,
        notes: parsed.data.notes || null,
      },
    });

    logActivity({
      domain: "life",
      module: "investing",
      activityType: "created",
      title: `Added ${value} to watchlist`,
      refType: "watchlist_item",
      refId: item.id,
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("Failed to create watchlist item:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create watchlist item: ${msg}` }, { status: 500 });
  }
}
