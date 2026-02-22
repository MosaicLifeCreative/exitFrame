import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  domain: z.string().optional(),
  description: z.string().optional(),
  modules: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { modules: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error("Failed to list products:", error);
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { modules, ...productData } = parsed.data;

    const product = await prisma.product.create({
      data: {
        ...productData,
        domain: productData.domain || null,
        description: productData.description || null,
        modules: modules?.length
          ? {
              create: modules.map((moduleType) => ({
                moduleType,
                isActive: true,
              })),
            }
          : undefined,
      },
      include: { modules: true },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
