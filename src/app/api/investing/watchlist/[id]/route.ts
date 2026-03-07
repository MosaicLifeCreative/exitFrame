import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateWatchlistSchema = z.object({
  type: z.enum(["ticker", "sector"]).optional(),
  value: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid watchlist item ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateWatchlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const item = await prisma.watchlistItem.update({
      where: { id },
      data: parsed.data,
    });

    logActivity({
      domain: "life",
      module: "investing",
      activityType: "updated",
      title: `Updated watchlist item: ${item.value}`,
      refType: "watchlist_item",
      refId: item.id,
    });

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("Failed to update watchlist item:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to update watchlist item: ${msg}` }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid watchlist item ID" }, { status: 400 });
    }

    const item = await prisma.watchlistItem.update({
      where: { id },
      data: { isActive: false },
    });

    logActivity({
      domain: "life",
      module: "investing",
      activityType: "updated",
      title: `Removed ${item.value} from watchlist`,
      refType: "watchlist_item",
      refId: item.id,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete watchlist item:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to delete watchlist item: ${msg}` }, { status: 500 });
  }
}
