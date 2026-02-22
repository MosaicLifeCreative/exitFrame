import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
export const dynamic = "force-dynamic";

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { modules: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error("Failed to get product:", error);
    return NextResponse.json({ error: "Failed to get product" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: parsed.data,
      include: { modules: true },
    });

    logActivity({
      domain: "product",
      domainRefId: product.id,
      module: "products",
      activityType: "updated",
      title: "Updated product",
      refType: "product",
      refId: product.id,
    });

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    logActivity({
      domain: "product",
      domainRefId: product.id,
      module: "products",
      activityType: "archived",
      title: "Archived product",
      refType: "product",
      refId: product.id,
    });

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error("Failed to archive product:", error);
    return NextResponse.json({ error: "Failed to archive product" }, { status: 500 });
  }
}
