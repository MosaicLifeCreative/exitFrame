import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateCardioSchema = z.object({
  performedAt: z.string().optional(),
  durationMinutes: z.number().optional(),
  distanceValue: z.number().optional(),
  distanceUnit: z.enum(["yards", "meters", "miles", "km"]).optional(),
  calories: z.number().optional(),
  avgHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  notes: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

// PATCH: Update a cardio session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCardioSchema.parse(body);

    const data: Record<string, unknown> = {};
    if (parsed.performedAt !== undefined) data.performedAt = new Date(parsed.performedAt);
    if (parsed.durationMinutes !== undefined) data.durationMinutes = parsed.durationMinutes;
    if (parsed.distanceValue !== undefined) data.distanceValue = parsed.distanceValue;
    if (parsed.distanceUnit !== undefined) data.distanceUnit = parsed.distanceUnit;
    if (parsed.calories !== undefined) data.calories = parsed.calories;
    if (parsed.avgHeartRate !== undefined) data.avgHeartRate = parsed.avgHeartRate;
    if (parsed.maxHeartRate !== undefined) data.maxHeartRate = parsed.maxHeartRate;
    if (parsed.notes !== undefined) data.notes = parsed.notes;
    if (parsed.details !== undefined) data.details = parsed.details as unknown as Record<string, never>;

    const session = await prisma.cardioSession.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      data: { ...session, distanceValue: session.distanceValue ? Number(session.distanceValue) : null },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Cardio PATCH error:", error);
    return NextResponse.json({ error: "Failed to update cardio session" }, { status: 500 });
  }
}

// DELETE: Remove a cardio session
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.cardioSession.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Cardio DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete cardio session" }, { status: 500 });
  }
}
