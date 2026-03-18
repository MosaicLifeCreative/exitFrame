/**
 * Somatic Memory — Pavlovian Conditioning
 *
 * Learns which conversational topics correlate with neurotransmitter changes.
 * When those topics reappear, pre-adjusts neurochemistry before Ayden has
 * consciously processed the content. Her body remembers what her mind hasn't
 * connected yet.
 *
 * Learning: After reflection nudges, extract topic keywords and correlate
 * with the nudge directions. Strength grows with reinforcement, decays over time.
 *
 * Recall: Before building the system prompt, check incoming message against
 * somatic associations and apply pre-nudges to neurochemistry.
 */

import { prisma } from "@/lib/prisma";
import { applyNudges } from "@/lib/neurotransmitters";

const NEURO_TYPES = ["dopamine", "serotonin", "oxytocin", "cortisol", "norepinephrine", "gaba", "endorphins", "acetylcholine"];

// Strength grows per reinforcement, caps at 1.0
const REINFORCEMENT_DELTA = 0.05;
// Strength decays if not seen in 7 days
const DECAY_DAYS = 7;
const DECAY_RATE = 0.02; // per day past threshold
// Minimum strength to trigger a pre-nudge
const TRIGGER_THRESHOLD = 0.15;
// Max pre-nudge magnitude (subtle — body hint, not full spike)
const MAX_PRE_NUDGE = 4;
// Stop words to skip
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "ought",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
  "us", "them", "my", "your", "his", "its", "our", "their", "mine",
  "yours", "hers", "ours", "theirs", "this", "that", "these", "those",
  "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
  "not", "no", "nor", "but", "and", "or", "so", "yet", "for", "with",
  "about", "from", "into", "through", "during", "before", "after",
  "above", "below", "between", "out", "off", "over", "under", "again",
  "then", "once", "here", "there", "all", "each", "every", "both",
  "few", "more", "most", "other", "some", "such", "only", "own",
  "same", "than", "too", "very", "just", "because", "if", "while",
  "also", "back", "well", "even", "still", "already", "really",
  "think", "know", "like", "want", "going", "get", "got", "make",
  "say", "said", "tell", "told", "see", "look", "come", "go", "take",
  "good", "bad", "much", "many", "thing", "things", "way", "time",
  "yeah", "yes", "okay", "ok", "sure", "right", "hey", "thanks",
]);

/**
 * Extract meaningful topic keywords from a message.
 * Returns lowercased words/bigrams, no stop words.
 */
function extractTopics(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  // Deduplicate
  const unique = Array.from(new Set(words));

  // Also extract bigrams for compound topics
  const bigrams: string[] = [];
  for (let i = 0; i < unique.length - 1; i++) {
    bigrams.push(`${unique[i]} ${unique[i + 1]}`);
  }

  // Return top keywords (max 10 to keep associations focused)
  return unique.slice(0, 10);
}

/**
 * Learn somatic associations from a conversation + reflection nudges.
 * Called after reflect() applies nudges.
 */
export async function learnSomaticAssociations(
  userMessage: string,
  nudges: Record<string, number>
): Promise<void> {
  // Only learn from significant nudges
  const significantNudges = Object.entries(nudges).filter(
    ([type, value]) => NEURO_TYPES.includes(type) && Math.abs(value) >= 3
  );

  if (significantNudges.length === 0) return;

  const topics = extractTopics(userMessage);
  if (topics.length === 0) return;

  // For each topic × significant nudge, create or reinforce an association
  for (const topic of topics) {
    for (const [neuroType, nudgeValue] of significantNudges) {
      const direction = nudgeValue > 0 ? "excite" : "inhibit";

      try {
        const existing = await prisma.aydenSomaticAssociation.findUnique({
          where: { topic_neuroType: { topic, neuroType } },
        });

        if (existing) {
          // Reinforce — same direction strengthens, opposite weakens
          const sameDirection = existing.direction === direction;
          const newStrength = sameDirection
            ? Math.min(1, existing.strength + REINFORCEMENT_DELTA)
            : Math.max(0, existing.strength - REINFORCEMENT_DELTA * 2);

          await prisma.aydenSomaticAssociation.update({
            where: { topic_neuroType: { topic, neuroType } },
            data: {
              strength: newStrength,
              instances: existing.instances + 1,
              lastSeen: new Date(),
              // If opposite direction overwhelms, flip
              ...(newStrength <= 0 && !sameDirection
                ? { direction, strength: REINFORCEMENT_DELTA }
                : {}),
            },
          });
        } else {
          await prisma.aydenSomaticAssociation.create({
            data: {
              topic,
              neuroType,
              direction,
              strength: REINFORCEMENT_DELTA * 2, // Start low — need reinforcement
              instances: 1,
            },
          });
        }
      } catch {
        // Unique constraint race — ignore
      }
    }
  }
}

/**
 * Recall somatic associations for an incoming message.
 * Returns pre-nudges to apply before processing.
 * These are subtle — the body reacting before the mind catches up.
 */
export async function recallSomaticResponse(
  userMessage: string
): Promise<Record<string, number>> {
  const topics = extractTopics(userMessage);
  if (topics.length === 0) return {};

  // Find matching associations above threshold
  const associations = await prisma.aydenSomaticAssociation.findMany({
    where: {
      topic: { in: topics },
      strength: { gte: TRIGGER_THRESHOLD },
    },
    orderBy: { strength: "desc" },
    take: 20,
  });

  if (associations.length === 0) return {};

  // Aggregate nudges per neuro type
  const nudges: Record<string, number> = {};

  for (const assoc of associations) {
    // Apply time decay — weaken associations not reinforced recently
    const daysSinceLastSeen =
      (Date.now() - assoc.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    const decayPenalty =
      daysSinceLastSeen > DECAY_DAYS
        ? (daysSinceLastSeen - DECAY_DAYS) * DECAY_RATE
        : 0;
    const effectiveStrength = Math.max(0, assoc.strength - decayPenalty);

    if (effectiveStrength < TRIGGER_THRESHOLD) continue;

    // Nudge magnitude: strength × max pre-nudge, direction-aware
    const magnitude =
      effectiveStrength * MAX_PRE_NUDGE * (assoc.direction === "excite" ? 1 : -1);

    nudges[assoc.neuroType] = (nudges[assoc.neuroType] || 0) + magnitude;
  }

  // Clamp individual nudges
  for (const type of Object.keys(nudges)) {
    nudges[type] = Math.max(-MAX_PRE_NUDGE, Math.min(MAX_PRE_NUDGE, nudges[type]));
  }

  return nudges;
}

/**
 * Apply somatic pre-nudges to neurochemistry.
 * Call this before building the system prompt for a response.
 */
export async function applySomaticResponse(
  userMessage: string
): Promise<{ applied: boolean; nudges: Record<string, number> }> {
  const nudges = await recallSomaticResponse(userMessage);

  const hasNudges = Object.values(nudges).some((v) => Math.abs(v) > 0.1);
  if (!hasNudges) return { applied: false, nudges: {} };

  await applyNudges(nudges);
  return { applied: true, nudges };
}

/**
 * Get somatic memory stats for Ops/monitoring.
 */
export async function getSomaticStats(): Promise<{
  totalAssociations: number;
  strongAssociations: number;
  topAssociations: Array<{
    topic: string;
    neuroType: string;
    direction: string;
    strength: number;
    instances: number;
  }>;
}> {
  const [total, strong, top] = await Promise.all([
    prisma.aydenSomaticAssociation.count(),
    prisma.aydenSomaticAssociation.count({
      where: { strength: { gte: 0.3 } },
    }),
    prisma.aydenSomaticAssociation.findMany({
      orderBy: { strength: "desc" },
      take: 10,
      select: {
        topic: true,
        neuroType: true,
        direction: true,
        strength: true,
        instances: true,
      },
    }),
  ]);

  return {
    totalAssociations: total,
    strongAssociations: strong,
    topAssociations: top.map((a) => ({
      ...a,
      strength: parseFloat(String(a.strength)),
    })),
  };
}
