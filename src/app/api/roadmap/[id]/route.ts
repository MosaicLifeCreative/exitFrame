import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.roadmapItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("Failed to fetch roadmap item:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap item" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, status, category, size, specRef, priority } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) {
      data.status = status;
      if (status === "done") data.completedAt = new Date();
      else data.completedAt = null;
    }
    if (category !== undefined) data.category = category;
    if (size !== undefined) data.size = size;
    if (specRef !== undefined) data.specRef = specRef;
    if (priority !== undefined) data.priority = priority;

    const item = await prisma.roadmapItem.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("Failed to update roadmap item:", error);
    return NextResponse.json(
      { error: "Failed to update roadmap item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.roadmapItem.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete roadmap item:", error);
    return NextResponse.json(
      { error: "Failed to delete roadmap item" },
      { status: 500 }
    );
  }
}
