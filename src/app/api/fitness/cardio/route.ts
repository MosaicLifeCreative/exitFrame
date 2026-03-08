import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createCardioSchema = z.object({
  activityType: z.enum(["swim", "run", "bike"]),
  performedAt: z.string(),
  durationMinutes: z.number().optional(),
  distanceValue: z.number().optional(),
  distanceUnit: z.enum(["yards", "meters", "miles", "km"]).optional(),
  calories: z.number().optional(),
  avgHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  notes: z.string().optional(),
  source: z.enum(["manual", "claude", "suunto", "oura"]).default("manual"),
  details: z.record(z.string(), z.unknown()).optional(),
});

// GET: List cardio sessions with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityType = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (activityType) where.activityType = activityType;

    const sessions = await prisma.cardioSession.findMany({
      where,
      orderBy: { performedAt: "desc" },
      take: limit,
    });

    const data = sessions.map((s) => ({
      ...s,
      distanceValue: s.distanceValue ? Number(s.distanceValue) : null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Cardio GET error:", error);
    return NextResponse.json({ error: "Failed to fetch cardio sessions" }, { status: 500 });
  }
}

// POST: Log a new cardio session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCardioSchema.parse(body);

    const session = await prisma.cardioSession.create({
      data: {
        activityType: parsed.activityType,
        performedAt: new Date(parsed.performedAt),
        durationMinutes: parsed.durationMinutes,
        distanceValue: parsed.distanceValue,
        distanceUnit: parsed.distanceUnit,
        calories: parsed.calories,
        avgHeartRate: parsed.avgHeartRate,
        maxHeartRate: parsed.maxHeartRate,
        notes: parsed.notes,
        source: parsed.source,
        details: (parsed.details ?? {}) as unknown as Record<string, never>,
      },
    });

    return NextResponse.json(
      { data: { ...session, distanceValue: session.distanceValue ? Number(session.distanceValue) : null } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Cardio POST error:", error);
    return NextResponse.json({ error: "Failed to create cardio session" }, { status: 500 });
  }
}
