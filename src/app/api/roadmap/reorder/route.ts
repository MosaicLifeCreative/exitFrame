import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: { id: string; priority: number }[] };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    // Batch update priorities
    await prisma.$transaction(
      items.map(({ id, priority }) =>
        prisma.roadmapItem.update({
          where: { id },
          data: { priority },
        })
      )
    );

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to reorder roadmap items:", error);
    return NextResponse.json(
      { error: "Failed to reorder roadmap items" },
      { status: 500 }
    );
  }
}
