import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const lodgingSchema = z.object({
  type: z.enum(["hotel", "airbnb", "vrbo", "hostel", "camping", "other"]).optional().default("hotel"),
  name: z.string().min(1),
  address: z.string().nullable().optional(),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  confirmationCode: z.string().nullable().optional(),
  nightlyRate: z.number().nullable().optional(),
  totalPrice: z.number().nullable().optional(),
  url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  destinationId: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lodgings = await prisma.tripLodging.findMany({
      where: { tripId: params.id },
      orderBy: { checkIn: "asc" },
    });
    return NextResponse.json({ data: lodgings });
  } catch (error) {
    console.error("Failed to list lodging:", error);
    return NextResponse.json({ error: "Failed to list lodging" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = lodgingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const lodging = await prisma.tripLodging.create({
      data: {
        tripId: params.id,
        destinationId: d.destinationId || null,
        type: d.type || "hotel",
        name: d.name,
        address: d.address || null,
        checkIn: new Date(d.checkIn),
        checkOut: new Date(d.checkOut),
        confirmationCode: d.confirmationCode || null,
        nightlyRate: d.nightlyRate ?? null,
        totalPrice: d.totalPrice ?? null,
        url: d.url || null,
        notes: d.notes || null,
      },
    });

    return NextResponse.json({ data: lodging }, { status: 201 });
  } catch (error) {
    console.error("Failed to create lodging:", error);
    return NextResponse.json({ error: "Failed to create lodging" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { lodgingId, ...rest } = body;
    if (!lodgingId) {
      return NextResponse.json({ error: "lodgingId is required" }, { status: 400 });
    }

    const parsed = lodgingSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const data: Record<string, unknown> = {};
    if (d.type !== undefined) data.type = d.type;
    if (d.name !== undefined) data.name = d.name;
    if (d.address !== undefined) data.address = d.address;
    if (d.checkIn !== undefined) data.checkIn = new Date(d.checkIn);
    if (d.checkOut !== undefined) data.checkOut = new Date(d.checkOut);
    if (d.confirmationCode !== undefined) data.confirmationCode = d.confirmationCode;
    if (d.nightlyRate !== undefined) data.nightlyRate = d.nightlyRate;
    if (d.totalPrice !== undefined) data.totalPrice = d.totalPrice;
    if (d.url !== undefined) data.url = d.url;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.destinationId !== undefined) data.destinationId = d.destinationId;

    const lodging = await prisma.tripLodging.update({
      where: { id: lodgingId, tripId: params.id },
      data,
    });

    return NextResponse.json({ data: lodging });
  } catch (error) {
    console.error("Failed to update lodging:", error);
    return NextResponse.json({ error: "Failed to update lodging" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const lodgingId = searchParams.get("lodgingId");
    if (!lodgingId) {
      return NextResponse.json({ error: "lodgingId is required" }, { status: 400 });
    }

    await prisma.tripLodging.delete({ where: { id: lodgingId, tripId: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete lodging:", error);
    return NextResponse.json({ error: "Failed to delete lodging" }, { status: 500 });
  }
}
