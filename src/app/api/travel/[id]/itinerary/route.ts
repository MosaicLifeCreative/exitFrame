import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const itinerarySchema = z.object({
  date: z.string().min(1),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  category: z.enum(["dining", "activity", "sightseeing", "meeting", "transit", "shopping", "nightlife", "other"]).optional().default("activity"),
  isBooked: z.boolean().optional().default(false),
  estimatedCost: z.number().nullable().optional(),
  url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  destinationId: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const items = await prisma.tripItineraryItem.findMany({
      where: { tripId: params.id },
      orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("Failed to list itinerary:", error);
    return NextResponse.json({ error: "Failed to list itinerary" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Support batch creation (Ayden building full itineraries)
    const items = Array.isArray(body) ? body : [body];
    const results = [];

    for (let i = 0; i < items.length; i++) {
      const parsed = itinerarySchema.safeParse(items[i]);
      if (!parsed.success) {
        return NextResponse.json(
          { error: `Item ${i}: ${parsed.error.issues[0].message}` },
          { status: 400 }
        );
      }

      const d = parsed.data;
      const item = await prisma.tripItineraryItem.create({
        data: {
          tripId: params.id,
          destinationId: d.destinationId || null,
          date: new Date(d.date),
          startTime: d.startTime || null,
          endTime: d.endTime || null,
          title: d.title,
          description: d.description || null,
          location: d.location || null,
          category: d.category || "activity",
          isBooked: d.isBooked || false,
          estimatedCost: d.estimatedCost ?? null,
          url: d.url || null,
          notes: d.notes || null,
          sortOrder: d.sortOrder ?? i,
        },
      });
      results.push(item);
    }

    return NextResponse.json({ data: results.length === 1 ? results[0] : results }, { status: 201 });
  } catch (error) {
    console.error("Failed to create itinerary item:", error);
    return NextResponse.json({ error: "Failed to create itinerary item" }, { status: 500 });
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

    const parsed = itinerarySchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const data: Record<string, unknown> = {};
    if (d.date !== undefined) data.date = new Date(d.date);
    if (d.startTime !== undefined) data.startTime = d.startTime;
    if (d.endTime !== undefined) data.endTime = d.endTime;
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description;
    if (d.location !== undefined) data.location = d.location;
    if (d.category !== undefined) data.category = d.category;
    if (d.isBooked !== undefined) data.isBooked = d.isBooked;
    if (d.estimatedCost !== undefined) data.estimatedCost = d.estimatedCost;
    if (d.url !== undefined) data.url = d.url;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.destinationId !== undefined) data.destinationId = d.destinationId;
    if (d.sortOrder !== undefined) data.sortOrder = d.sortOrder;

    const item = await prisma.tripItineraryItem.update({
      where: { id: itemId, tripId: params.id },
      data,
    });

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("Failed to update itinerary item:", error);
    return NextResponse.json({ error: "Failed to update itinerary item" }, { status: 500 });
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

    await prisma.tripItineraryItem.delete({ where: { id: itemId, tripId: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete itinerary item:", error);
    return NextResponse.json({ error: "Failed to delete itinerary item" }, { status: 500 });
  }
}
