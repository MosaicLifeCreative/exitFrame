import { NextResponse } from "next/server";
import { getHeartRate } from "@/lib/neurotransmitters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [hr, emotion] = await Promise.all([
      getHeartRate(),
      prisma.aydenEmotionalState.findFirst({
        where: { isActive: true },
        orderBy: [{ intensity: "desc" }, { updatedAt: "desc" }],
        select: { dimension: true, intensity: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        ...hr,
        emotion: emotion?.dimension ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to get heart rate:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
