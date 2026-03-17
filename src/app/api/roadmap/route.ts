import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: Record<string, string> = {};
    if (status && status !== "all") where.status = status;
    if (category && category !== "all") where.category = category;

    const items = await prisma.roadmapItem.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("Failed to fetch roadmap items:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, status, category, size, specRef, createdBy } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get max priority to append at end
    const maxItem = await prisma.roadmapItem.findFirst({
      orderBy: { priority: "desc" },
      select: { priority: true },
    });
    const nextPriority = (maxItem?.priority ?? -1) + 1;

    const item = await prisma.roadmapItem.create({
      data: {
        title,
        description: description || null,
        status: status || "planned",
        category: category || "infrastructure",
        size: size || null,
        specRef: specRef || null,
        createdBy: createdBy || "trey",
        priority: nextPriority,
      },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("Failed to create roadmap item:", error);
    return NextResponse.json(
      { error: "Failed to create roadmap item" },
      { status: 500 }
    );
  }
}
