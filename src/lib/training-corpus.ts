import { prisma } from "@/lib/prisma";

interface TrainingSnapshotInput {
  channel: string;
  userMessage: string;
  aydenResponse: string;
  toolsUsed?: string[];
}

/**
 * Log a training snapshot after each Ayden response.
 * Captures neuro levels + active emotions at the time of response.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function logTrainingSnapshot(input: TrainingSnapshotInput): Promise<void> {
  try {
    // Fetch current neuro levels and emotions in parallel
    const [neuros, emotions] = await Promise.all([
      prisma.aydenNeurotransmitter.findMany({
        select: { type: true, level: true },
      }),
      prisma.aydenEmotionalState.findMany({
        where: { isActive: true },
        select: { dimension: true, intensity: true },
        orderBy: { intensity: "desc" },
        take: 8,
      }),
    ]);

    const neuroLevels: Record<string, number> = {};
    for (const n of neuros) {
      neuroLevels[n.type] = parseFloat(String(n.level));
    }

    await prisma.aydenTrainingSnapshot.create({
      data: {
        channel: input.channel,
        userMessage: input.userMessage.substring(0, 5000),
        aydenResponse: input.aydenResponse.substring(0, 10000),
        neuroLevels,
        emotionSnapshot: emotions.map((e) => ({
          dimension: e.dimension,
          intensity: e.intensity,
        })),
        toolsUsed: input.toolsUsed || [],
      },
    });
  } catch (err) {
    console.error("[training-corpus] Failed to log snapshot:", err);
  }
}
