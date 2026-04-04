import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const equipment = await prisma.equipment.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ data: equipment });
  } catch (error) {
    console.error("Failed to fetch equipment:", error);
    return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, details } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }

    const equipment = await prisma.equipment.create({
      data: { name, category, details: details || null },
    });
    return NextResponse.json({ data: equipment });
  } catch (error) {
    console.error("Failed to create equipment:", error);
    return NextResponse.json({ error: "Failed to create equipment" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, details, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(details !== undefined && { details }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json({ data: equipment });
  } catch (error) {
    console.error("Failed to update equipment:", error);
    return NextResponse.json({ error: "Failed to update equipment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.equipment.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete equipment:", error);
    return NextResponse.json({ error: "Failed to delete equipment" }, { status: 500 });
  }
}
