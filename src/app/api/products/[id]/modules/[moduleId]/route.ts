import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const updateModuleSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateModuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Prisma.ProductModuleUpdateInput = {};
    if (parsed.data.isActive !== undefined) {
      updateData.isActive = parsed.data.isActive;
    }
    if (parsed.data.config !== undefined) {
      updateData.config = parsed.data.config as Prisma.InputJsonValue;
    }

    const mod = await prisma.productModule.update({
      where: {
        id: params.moduleId,
        productId: params.id,
      },
      data: updateData,
    });

    return NextResponse.json({ data: mod });
  } catch (error) {
    console.error("Failed to update product module:", error);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}
