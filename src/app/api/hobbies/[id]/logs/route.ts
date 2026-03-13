import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createLogSchema = z.object({
  title: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  duration: z.number().int().min(0).nullable().optional(),
  mood: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.hobbyLog.findMany({
        where: { hobbyId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.hobbyLog.count({ where: { hobbyId: id } }),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to list hobby logs:", error);
    return NextResponse.json({ error: "Failed to list hobby logs" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify hobby exists
    const hobby = await prisma.hobby.findUnique({ where: { id } });
    if (!hobby) {
      return NextResponse.json({ error: "Hobby not found" }, { status: 404 });
    }

    const log = await prisma.hobbyLog.create({
      data: {
        hobbyId: id,
        title: parsed.data.title || null,
        content: parsed.data.content || null,
        duration: parsed.data.duration ?? null,
        mood: parsed.data.mood || null,
      },
    });

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (error) {
    console.error("Failed to create hobby log:", error);
    return NextResponse.json({ error: "Failed to create hobby log" }, { status: 500 });
  }
}
