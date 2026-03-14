import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLevels, getHeartRate } from "@/lib/neurotransmitters";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      levels,
      neuroRows,
      emotions,
      heartRate,
      values,
      interests,
      recentActions,
      thoughtCount,
      dreamCount,
      memoryCount,
    ] = await Promise.all([
      getCurrentLevels(),
      prisma.aydenNeurotransmitter.findMany(),
      prisma.aydenEmotionalState.findMany({
        where: { isActive: true },
        orderBy: { intensity: "desc" },
        take: 15,
      }),
      getHeartRate(),
      prisma.aydenValue.findMany({
        where: { isActive: true },
        orderBy: [{ strength: "desc" }, { updatedAt: "desc" }],
      }),
      prisma.aydenInterest.findMany({
        where: { isActive: true },
        orderBy: [{ intensity: "desc" }, { lastEngaged: "desc" }],
      }),
      prisma.aydenAgencyAction.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.aydenThought.count(),
      prisma.aydenDream.count(),
      prisma.aydenMemory.count(),
    ]);

    const neurotransmitters = neuroRows.map((row) => ({
      type: row.type,
      level: levels[row.type] ?? 0,
      adaptedBaseline: row.adaptedBaseline ?? 0,
      permanentBaseline: row.permanentBaseline ?? 0,
    }));

    return NextResponse.json({
      data: {
        heartRate,
        neurotransmitters,
        emotions: emotions.map((e) => ({
          id: e.id,
          dimension: e.dimension,
          intensity: e.intensity,
          trigger: e.trigger,
          context: e.context,
          createdAt: e.createdAt.toISOString(),
        })),
        values: values.map((v) => ({
          id: v.id,
          value: v.value,
          category: v.category,
          strength: v.strength,
          origin: v.origin,
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
        })),
        interests: interests.map((i) => ({
          id: i.id,
          topic: i.topic,
          description: i.description,
          intensity: i.intensity,
          source: i.source,
          lastEngaged: i.lastEngaged.toISOString(),
        })),
        recentActions: recentActions.map((a) => ({
          id: a.id,
          actionType: a.actionType,
          summary: a.summary,
          createdAt: a.createdAt.toISOString(),
        })),
        stats: {
          thoughtCount,
          dreamCount,
          memoryCount,
          valueCount: values.length,
          interestCount: interests.length,
        },
      },
    });
  } catch (error) {
    console.error("Failed to get Ayden health:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
