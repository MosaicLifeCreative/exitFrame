import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createHobbySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const hobbies = await prisma.hobby.findMany({
      where,
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // Compute total hours per hobby
    const hobbyIds = hobbies.map((h) => h.id);
    const durationAggs = await prisma.hobbyLog.groupBy({
      by: ["hobbyId"],
      where: { hobbyId: { in: hobbyIds } },
      _sum: { duration: true },
    });
    const durationMap = new Map(
      durationAggs.map((a) => [a.hobbyId, a._sum.duration || 0])
    );

    const data = hobbies.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      icon: h.icon,
      status: h.status,
      sortOrder: h.sortOrder,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
      logCount: h._count.logs,
      totalMinutes: durationMap.get(h.id) || 0,
      lastLogDate: h.logs[0]?.createdAt || null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to list hobbies:", error);
    return NextResponse.json({ error: "Failed to list hobbies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createHobbySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const hobby = await prisma.hobby.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        icon: parsed.data.icon || null,
        status: parsed.data.status || "active",
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });

    return NextResponse.json({ data: hobby }, { status: 201 });
  } catch (error) {
    console.error("Failed to create hobby:", error);
    return NextResponse.json({ error: "Failed to create hobby" }, { status: 500 });
  }
}
