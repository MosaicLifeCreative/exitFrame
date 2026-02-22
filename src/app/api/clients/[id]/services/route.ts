import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
export const dynamic = "force-dynamic";

const addServiceSchema = z.object({
  serviceType: z.string().min(1, "Service type is required"),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const services = await prisma.clientService.findMany({
      where: { clientId: params.id },
      orderBy: { serviceType: "asc" },
    });

    return NextResponse.json({ data: services });
  } catch (error) {
    console.error("Failed to list client services:", error);
    return NextResponse.json({ error: "Failed to list services" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = addServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if service already exists for this client
    const existing = await prisma.clientService.findFirst({
      where: {
        clientId: params.id,
        serviceType: parsed.data.serviceType,
      },
    });

    if (existing) {
      // Toggle the existing service
      const service = await prisma.clientService.update({
        where: { id: existing.id },
        data: { isActive: !existing.isActive },
      });
      return NextResponse.json({ data: service });
    }

    const service = await prisma.clientService.create({
      data: {
        clientId: params.id,
        serviceType: parsed.data.serviceType,
        config: (parsed.data.config ?? {}) as Prisma.InputJsonValue,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return NextResponse.json({ data: service }, { status: 201 });
  } catch (error) {
    console.error("Failed to add client service:", error);
    return NextResponse.json({ error: "Failed to add service" }, { status: 500 });
  }
}
