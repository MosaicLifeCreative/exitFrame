import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const transportSchema = z.object({
  type: z.string().min(1), // rental_car, rideshare, train, shuttle, bus, other
  company: z.string().nullable().optional(),
  confirmationCode: z.string().nullable().optional(),
  pickupLocation: z.string().nullable().optional(),
  dropoffLocation: z.string().nullable().optional(),
  pickupTime: z.string().nullable().optional(),
  dropoffTime: z.string().nullable().optional(),
  vehicleDetails: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transports = await prisma.tripTransport.findMany({
      where: { tripId: params.id },
      orderBy: { pickupTime: "asc" },
    });
    return NextResponse.json({ data: transports });
  } catch (error) {
    console.error("Failed to list transport:", error);
    return NextResponse.json({ error: "Failed to list transport" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = transportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const transport = await prisma.tripTransport.create({
      data: {
        tripId: params.id,
        type: d.type,
        company: d.company || null,
        confirmationCode: d.confirmationCode || null,
        pickupLocation: d.pickupLocation || null,
        dropoffLocation: d.dropoffLocation || null,
        pickupTime: d.pickupTime ? new Date(d.pickupTime) : null,
        dropoffTime: d.dropoffTime ? new Date(d.dropoffTime) : null,
        vehicleDetails: d.vehicleDetails || null,
        price: d.price ?? null,
        notes: d.notes || null,
      },
    });

    return NextResponse.json({ data: transport }, { status: 201 });
  } catch (error) {
    console.error("Failed to create transport:", error);
    return NextResponse.json({ error: "Failed to create transport" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { transportId, ...rest } = body;
    if (!transportId) {
      return NextResponse.json({ error: "transportId is required" }, { status: 400 });
    }

    const parsed = transportSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const data: Record<string, unknown> = {};
    if (d.type !== undefined) data.type = d.type;
    if (d.company !== undefined) data.company = d.company;
    if (d.confirmationCode !== undefined) data.confirmationCode = d.confirmationCode;
    if (d.pickupLocation !== undefined) data.pickupLocation = d.pickupLocation;
    if (d.dropoffLocation !== undefined) data.dropoffLocation = d.dropoffLocation;
    if (d.pickupTime !== undefined) data.pickupTime = d.pickupTime ? new Date(d.pickupTime) : null;
    if (d.dropoffTime !== undefined) data.dropoffTime = d.dropoffTime ? new Date(d.dropoffTime) : null;
    if (d.vehicleDetails !== undefined) data.vehicleDetails = d.vehicleDetails;
    if (d.price !== undefined) data.price = d.price;
    if (d.notes !== undefined) data.notes = d.notes;

    const transport = await prisma.tripTransport.update({
      where: { id: transportId, tripId: params.id },
      data,
    });

    return NextResponse.json({ data: transport });
  } catch (error) {
    console.error("Failed to update transport:", error);
    return NextResponse.json({ error: "Failed to update transport" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const transportId = searchParams.get("transportId");
    if (!transportId) {
      return NextResponse.json({ error: "transportId is required" }, { status: 400 });
    }

    await prisma.tripTransport.delete({ where: { id: transportId, tripId: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete transport:", error);
    return NextResponse.json({ error: "Failed to delete transport" }, { status: 500 });
  }
}
