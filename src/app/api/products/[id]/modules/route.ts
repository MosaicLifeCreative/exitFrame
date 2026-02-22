import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const addModuleSchema = z.object({
  moduleType: z.string().min(1, "Module type is required"),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modules = await prisma.productModule.findMany({
      where: { productId: params.id },
      orderBy: { moduleType: "asc" },
    });

    return NextResponse.json({ data: modules });
  } catch (error) {
    console.error("Failed to list product modules:", error);
    return NextResponse.json({ error: "Failed to list modules" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = addModuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.productModule.findFirst({
      where: {
        productId: params.id,
        moduleType: parsed.data.moduleType,
      },
    });

    if (existing) {
      const mod = await prisma.productModule.update({
        where: { id: existing.id },
        data: { isActive: !existing.isActive },
      });
      return NextResponse.json({ data: mod });
    }

    const mod = await prisma.productModule.create({
      data: {
        productId: params.id,
        moduleType: parsed.data.moduleType,
        config: (parsed.data.config ?? {}) as Prisma.InputJsonValue,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return NextResponse.json({ data: mod }, { status: 201 });
  } catch (error) {
    console.error("Failed to add product module:", error);
    return NextResponse.json({ error: "Failed to add module" }, { status: 500 });
  }
}
