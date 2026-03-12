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

const createTripSchema = z.object({
  name: z.string().min(1, "Trip name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["upcoming", "active", "completed", "cancelled"]).optional(),
  destinations: z.array(destinationSchema).min(1, "At least one destination is required"),
});

const tripInclude = {
  destinations: {
    orderBy: { sortOrder: "asc" as const },
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const trips = await prisma.trip.findMany({
      where,
      include: tripInclude,
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ data: trips });
  } catch (error) {
    console.error("Failed to list trips:", error);
    return NextResponse.json({ error: "Failed to list trips" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const d = parsed.data;

    const trip = await prisma.trip.create({
      data: {
        name: d.name,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        notes: d.notes || null,
        status: d.status || "upcoming",
        destinations: {
          create: d.destinations.map((dest, i) => ({
            city: dest.city,
            state: dest.state || null,
            country: dest.country || "US",
            arrivalDate: dest.arrivalDate ? new Date(dest.arrivalDate) : null,
            departureDate: dest.departureDate ? new Date(dest.departureDate) : null,
            notes: dest.notes || null,
            sortOrder: i,
          })),
        },
      },
      include: tripInclude,
    });

    return NextResponse.json({ data: trip }, { status: 201 });
  } catch (error) {
    console.error("Failed to create trip:", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
