import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLevels } from "@/lib/neurotransmitters";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [levels, rows, emotionCount, thoughtCount, dreamCount, memoryCount] = await Promise.all([
      getCurrentLevels(),
      prisma.aydenNeurotransmitter.findMany(),
      prisma.aydenEmotionalState.count({ where: { isActive: true } }),
      prisma.aydenThought.count(),
      prisma.aydenDream.count(),
      prisma.aydenMemory.count(),
    ]);

    const neurotransmitters = rows.map((row) => {
      const perm = row.permanentBaseline ?? 0;
      return {
        type: row.type,
        level: levels[row.type] ?? 0,
        adaptedBaseline: row.adaptedBaseline || perm,
        permanentBaseline: perm,
      };
    });

    return NextResponse.json({
      data: {
        neurotransmitters,
        emotionCount,
        thoughtCount,
        dreamCount,
        memoryCount,
      },
    });
  } catch (error) {
    console.error("Failed to get system status:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
