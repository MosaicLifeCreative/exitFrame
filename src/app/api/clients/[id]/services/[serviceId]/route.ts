import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const updateServiceSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; serviceId: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Prisma.ClientServiceUpdateInput = {};
    if (parsed.data.isActive !== undefined) {
      updateData.isActive = parsed.data.isActive;
    }
    if (parsed.data.config !== undefined) {
      updateData.config = parsed.data.config as Prisma.InputJsonValue;
    }

    const service = await prisma.clientService.update({
      where: {
        id: params.serviceId,
        clientId: params.id,
      },
      data: updateData,
    });

    return NextResponse.json({ data: service });
  } catch (error) {
    console.error("Failed to update client service:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}
