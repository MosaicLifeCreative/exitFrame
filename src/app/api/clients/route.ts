import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createClientSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  domain: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  services: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeFilter = searchParams.get("active");

    const where = activeFilter !== null
      ? { isActive: activeFilter === "true" }
      : {};

    const clients = await prisma.client.findMany({
      where,
      include: { services: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: clients });
  } catch (error) {
    console.error("Failed to list clients:", error);
    return NextResponse.json({ error: "Failed to list clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { services, ...clientData } = parsed.data;

    // Clean empty strings to null
    const cleaned = {
      ...clientData,
      contactEmail: clientData.contactEmail || null,
      contactFirstName: clientData.contactFirstName || null,
      contactLastName: clientData.contactLastName || null,
      contactPhone: clientData.contactPhone || null,
      domain: clientData.domain || null,
      address: clientData.address || null,
      notes: clientData.notes || null,
    };

    const client = await prisma.client.create({
      data: {
        ...cleaned,
        services: services?.length
          ? {
              create: services.map((serviceType) => ({
                serviceType,
                isActive: true,
              })),
            }
          : undefined,
      },
      include: { services: true },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    console.error("Failed to create client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
