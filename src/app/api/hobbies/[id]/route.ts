import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateHobbySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const hobby = await prisma.hobby.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        resources: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { logs: true },
        },
      },
    });

    if (!hobby) {
      return NextResponse.json({ error: "Hobby not found" }, { status: 404 });
    }

    // Get total minutes
    const agg = await prisma.hobbyLog.aggregate({
      where: { hobbyId: id },
      _sum: { duration: true },
    });

    return NextResponse.json({
      data: {
        ...hobby,
        totalMinutes: agg._sum.duration || 0,
      },
    });
  } catch (error) {
    console.error("Failed to get hobby:", error);
    return NextResponse.json({ error: "Failed to get hobby" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateHobbySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const hobby = await prisma.hobby.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ data: hobby });
  } catch (error) {
    console.error("Failed to update hobby:", error);
    return NextResponse.json({ error: "Failed to update hobby" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.hobby.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete hobby:", error);
    return NextResponse.json({ error: "Failed to delete hobby" }, { status: 500 });
  }
}
