import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const destinationSchema = z.object({
  city: z.string().min(1),
  state: z.string().nullable().optional(),
  country: z.string().optional().default("US"),
  arrivalDate: z.string().nullable().optional(),
  departureDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateTripSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["upcoming", "active", "completed", "cancelled"]).optional(),
  destinations: z.array(destinationSchema).optional(),
});

const tripInclude = {
  destinations: {
    orderBy: { sortOrder: "asc" as const },
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: tripInclude,
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json({ data: trip });
  } catch (error) {
    console.error("Failed to get trip:", error);
    return NextResponse.json({ error: "Failed to get trip" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { destinations, ...fields } = parsed.data;
    const data: Record<string, unknown> = {};

    if (fields.name !== undefined) data.name = fields.name;
    if (fields.startDate !== undefined) data.startDate = new Date(fields.startDate);
    if (fields.endDate !== undefined) data.endDate = fields.endDate ? new Date(fields.endDate) : null;
    if (fields.notes !== undefined) data.notes = fields.notes;
    if (fields.status !== undefined) data.status = fields.status;

    await prisma.trip.update({
      where: { id: params.id },
      data,
    });

    // Replace destinations if provided
    if (destinations) {
      await prisma.tripDestination.deleteMany({ where: { tripId: params.id } });
      await prisma.tripDestination.createMany({
        data: destinations.map((dest, i) => ({
          tripId: params.id,
          city: dest.city,
          state: dest.state || null,
          country: dest.country || "US",
          arrivalDate: dest.arrivalDate ? new Date(dest.arrivalDate) : null,
          departureDate: dest.departureDate ? new Date(dest.departureDate) : null,
          notes: dest.notes || null,
          sortOrder: i,
        })),
      });
    }

    const full = await prisma.trip.findUnique({
      where: { id: params.id },
      include: tripInclude,
    });

    return NextResponse.json({ data: full });
  } catch (error) {
    console.error("Failed to update trip:", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.trip.delete({ where: { id: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete trip:", error);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}
