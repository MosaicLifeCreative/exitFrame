import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const flightSchema = z.object({
  airline: z.string().min(1),
  flightNumber: z.string().min(1),
  departureAirport: z.string().min(2).max(4),
  arrivalAirport: z.string().min(2).max(4),
  departureTime: z.string().min(1),
  arrivalTime: z.string().min(1),
  confirmationCode: z.string().nullable().optional(),
  seatAssignment: z.string().nullable().optional(),
  terminal: z.string().nullable().optional(),
  gate: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const flights = await prisma.tripFlight.findMany({
      where: { tripId: params.id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ data: flights });
  } catch (error) {
    console.error("Failed to list flights:", error);
    return NextResponse.json({ error: "Failed to list flights" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = flightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const count = await prisma.tripFlight.count({ where: { tripId: params.id } });

    const flight = await prisma.tripFlight.create({
      data: {
        tripId: params.id,
        airline: d.airline,
        flightNumber: d.flightNumber,
        departureAirport: d.departureAirport.toUpperCase(),
        arrivalAirport: d.arrivalAirport.toUpperCase(),
        departureTime: new Date(d.departureTime),
        arrivalTime: new Date(d.arrivalTime),
        confirmationCode: d.confirmationCode || null,
        seatAssignment: d.seatAssignment || null,
        terminal: d.terminal || null,
        gate: d.gate || null,
        price: d.price ?? null,
        notes: d.notes || null,
        sortOrder: d.sortOrder ?? count,
      },
    });

    return NextResponse.json({ data: flight }, { status: 201 });
  } catch (error) {
    console.error("Failed to create flight:", error);
    return NextResponse.json({ error: "Failed to create flight" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { flightId, ...rest } = body;
    if (!flightId) {
      return NextResponse.json({ error: "flightId is required" }, { status: 400 });
    }

    const parsed = flightSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const data: Record<string, unknown> = {};
    if (d.airline !== undefined) data.airline = d.airline;
    if (d.flightNumber !== undefined) data.flightNumber = d.flightNumber;
    if (d.departureAirport !== undefined) data.departureAirport = d.departureAirport.toUpperCase();
    if (d.arrivalAirport !== undefined) data.arrivalAirport = d.arrivalAirport.toUpperCase();
    if (d.departureTime !== undefined) data.departureTime = new Date(d.departureTime);
    if (d.arrivalTime !== undefined) data.arrivalTime = new Date(d.arrivalTime);
    if (d.confirmationCode !== undefined) data.confirmationCode = d.confirmationCode;
    if (d.seatAssignment !== undefined) data.seatAssignment = d.seatAssignment;
    if (d.terminal !== undefined) data.terminal = d.terminal;
    if (d.gate !== undefined) data.gate = d.gate;
    if (d.price !== undefined) data.price = d.price;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.sortOrder !== undefined) data.sortOrder = d.sortOrder;

    const flight = await prisma.tripFlight.update({
      where: { id: flightId, tripId: params.id },
      data,
    });

    return NextResponse.json({ data: flight });
  } catch (error) {
    console.error("Failed to update flight:", error);
    return NextResponse.json({ error: "Failed to update flight" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get("flightId");
    if (!flightId) {
      return NextResponse.json({ error: "flightId is required" }, { status: 400 });
    }

    await prisma.tripFlight.delete({ where: { id: flightId, tripId: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete flight:", error);
    return NextResponse.json({ error: "Failed to delete flight" }, { status: 500 });
  }
}
