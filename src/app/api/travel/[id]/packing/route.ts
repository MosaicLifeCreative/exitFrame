import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const packingSchema = z.object({
  item: z.string().min(1),
  category: z.enum(["clothes", "toiletries", "electronics", "documents", "medication", "gear", "other"]).optional().default("other"),
  isPacked: z.boolean().optional().default(false),
  sortOrder: z.number().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const items = await prisma.tripPackingItem.findMany({
      where: { tripId: params.id },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("Failed to list packing items:", error);
    return NextResponse.json({ error: "Failed to list packing items" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Support batch creation (Ayden suggesting packing lists)
    const items = Array.isArray(body) ? body : [body];
    const results = [];

    for (let i = 0; i < items.length; i++) {
      const parsed = packingSchema.safeParse(items[i]);
      if (!parsed.success) {
        return NextResponse.json(
          { error: `Item ${i}: ${parsed.error.issues[0].message}` },
          { status: 400 }
        );
      }

      const d = parsed.data;
      const item = await prisma.tripPackingItem.create({
        data: {
          tripId: params.id,
          item: d.item,
          category: d.category || "other",
          isPacked: d.isPacked || false,
          sortOrder: d.sortOrder ?? i,
        },
      });
      results.push(item);
    }

    return NextResponse.json({ data: results.length === 1 ? results[0] : results }, { status: 201 });
  } catch (error) {
    console.error("Failed to create packing item:", error);
    return NextResponse.json({ error: "Failed to create packing item" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { itemId, ...rest } = body;
    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const parsed = packingSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const data: Record<string, unknown> = {};
    if (d.item !== undefined) data.item = d.item;
    if (d.category !== undefined) data.category = d.category;
    if (d.isPacked !== undefined) data.isPacked = d.isPacked;
    if (d.sortOrder !== undefined) data.sortOrder = d.sortOrder;

    const item = await prisma.tripPackingItem.update({
      where: { id: itemId, tripId: params.id },
      data,
    });

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("Failed to update packing item:", error);
    return NextResponse.json({ error: "Failed to update packing item" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    await prisma.tripPackingItem.delete({ where: { id: itemId, tripId: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete packing item:", error);
    return NextResponse.json({ error: "Failed to delete packing item" }, { status: 500 });
  }
}
