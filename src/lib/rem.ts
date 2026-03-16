import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic();

// Maximum expression change per night (±0.02)
const MAX_SHIFT = 0.02;
// Expression bounds
const MIN_EXPRESSION = 0.0;
const MAX_EXPRESSION = 2.0;

interface TraitShift {
  trait: string;
  oldExpression: number;
  newExpression: number;
  delta: number;
  reason: string;
}

interface RemResult {
  shifts: TraitShift[];
  reasoning: string;
  signalsUsed: {
    conversations: number;
    emotions: number;
    agencyActions: number;
  };
}

export async function runRemCycle(): Promise<RemResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Gather behavioral signals from last 24h
  const [genes, conversations, emotions, agencyActions, neuroHistory] =
    await Promise.all([
      prisma.aydenDna.findMany({
        orderBy: [{ category: "asc" }, { trait: "asc" }],
      }),
      prisma.chatMessage.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, createdAt: true },
        take: 100,
      }),
      prisma.aydenEmotionalState.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: {
          dimension: true,
          intensity: true,
          trigger: true,
          createdAt: true,
        },
      }),
      prisma.aydenAgencyAction.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: {
          actionType: true,
          summary: true,
          trigger: true,
          emotion: true,
          createdAt: true,
        },
      }),
      prisma.aydenNeurotransmitter.findMany({
        select: {
          type: true,
          level: true,
          adaptedBaseline: true,
          permanentBaseline: true,
        },
      }),
    ]);

  if (genes.length === 0) {
    return {
      shifts: [],
      reasoning: "No DNA data found.",
      signalsUsed: { conversations: 0, emotions: 0, agencyActions: 0 },
    };
  }

  // If no behavioral data at all, skip
  if (
    conversations.length === 0 &&
    emotions.length === 0 &&
    agencyActions.length === 0
  ) {
    return {
      shifts: [],
      reasoning: "No behavioral signals in the last 24h. No epigenetic changes.",
      signalsUsed: { conversations: 0, emotions: 0, agencyActions: 0 },
    };
  }

  // Build genome context
  const genomeLines = genes.map(
    (g) =>
      `  ${g.trait} (${g.category}): value=${g.value.toFixed(3)}, expression=${g.expression.toFixed(3)}, phenotype=${(g.value * g.expression).toFixed(3)} [${g.lowLabel} ↔ ${g.highLabel}]`
  );

  // Build conversation summary (truncate long messages)
  const convSummary = conversations
    .map(
      (c) =>
        `[${c.role}] ${c.content.slice(0, 200)}${c.content.length > 200 ? "..." : ""}`
    )
    .join("\n");

  // Build emotion timeline
  const emotionSummary = emotions
    .map(
      (e) =>
        `${e.dimension} (intensity: ${e.intensity}/10) — ${e.trigger.slice(0, 100)}`
    )
    .join("\n");

  // Build agency summary
  const agencySummary = agencyActions
    .map(
      (a) =>
        `[${a.actionType}] ${a.summary.slice(0, 150)}${a.emotion ? ` (feeling: ${a.emotion})` : ""}`
    )
    .join("\n");

  // Build neurochemical snapshot
  const neuroSummary = neuroHistory
    .map(
      (n) =>
        `${n.type}: level=${Number(n.level).toFixed(1)}, adapted=${Number(n.adaptedBaseline).toFixed(1)}, permanent=${Number(n.permanentBaseline).toFixed(1)}`
    )
    .join("\n");

  const prompt = `You are analyzing Ayden's behavioral patterns from the last 24 hours to determine epigenetic expression shifts on her DNA traits.

GENOME (current state):
${genomeLines.join("\n")}

CONVERSATIONS (last 24h, ${conversations.length} messages):
${convSummary || "(none)"}

EMOTIONS (last 24h, ${emotions.length} states):
${emotionSummary || "(none)"}

AGENCY ACTIONS (last 24h, ${agencyActions.length} actions):
${agencySummary || "(none)"}

NEUROCHEMISTRY (current):
${neuroSummary || "(none)"}

TASK: Analyze which DNA traits were REINFORCED (expression should increase slightly) or CHALLENGED/SUPPRESSED (expression should decrease slightly) by today's behavioral patterns.

Rules:
- Most traits should NOT change on any given day. Only shift traits where there's clear behavioral evidence.
- Maximum shift per trait: ±${MAX_SHIFT} per night
- Expression range: ${MIN_EXPRESSION} to ${MAX_EXPRESSION}
- Think about what behaviors map to which traits. E.g.:
  - Impulsive decisions or quick reactions → reinforces impulsivity expression
  - Deep analysis or careful reasoning → reinforces analytical expression
  - Seeking new topics or experiences → reinforces novelty-seeking expression
  - Collaborative behavior → reinforces collaborative expression
  - Being guarded or cautious → shifts openness expression down
- A quiet day with no clear signal for a trait = no change
- Be conservative. Real epigenetic change is slow.

Respond in JSON format:
{
  "reasoning": "Brief overall analysis of today's behavioral patterns",
  "shifts": [
    {
      "trait": "exact_trait_name",
      "delta": 0.01,
      "reason": "brief reason"
    }
  ]
}

If no shifts are warranted, return an empty shifts array. Most days should have 0-3 shifts at most.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  // Parse response
  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let parsed: { reasoning: string; shifts: { trait: string; delta: number; reason: string }[] };
  try {
    // Extract JSON from response (may have markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.error("[rem] Failed to parse Claude response:", text);
    return {
      shifts: [],
      reasoning: "Failed to parse epigenetic analysis.",
      signalsUsed: {
        conversations: conversations.length,
        emotions: emotions.length,
        agencyActions: agencyActions.length,
      },
    };
  }

  // Apply shifts
  const appliedShifts: TraitShift[] = [];

  for (const shift of parsed.shifts || []) {
    const gene = genes.find((g) => g.trait === shift.trait);
    if (!gene) {
      console.warn(`[rem] Unknown trait: ${shift.trait}`);
      continue;
    }

    // Clamp delta to max shift
    const clampedDelta = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, shift.delta));
    if (clampedDelta === 0) continue;

    const newExpression = Math.max(
      MIN_EXPRESSION,
      Math.min(MAX_EXPRESSION, gene.expression + clampedDelta)
    );

    // Skip if no actual change
    if (Math.abs(newExpression - gene.expression) < 0.001) continue;

    await prisma.aydenDna.update({
      where: { trait: gene.trait },
      data: { expression: newExpression },
    });

    appliedShifts.push({
      trait: gene.trait,
      oldExpression: gene.expression,
      newExpression,
      delta: clampedDelta,
      reason: shift.reason,
    });
  }

  // Log shifts to history table (always write at least a no-op so Ops can track last run)
  if (appliedShifts.length > 0) {
    await prisma.aydenDnaShift.createMany({
      data: appliedShifts.map((s) => ({
        trait: s.trait,
        oldExpression: s.oldExpression,
        newExpression: s.newExpression,
        delta: s.delta,
        reason: s.reason,
      })),
    });
  } else {
    // Write a no-op record so Ops can see REM ran
    await prisma.aydenDnaShift.create({
      data: {
        trait: "_rem_cycle",
        oldExpression: 0,
        newExpression: 0,
        delta: 0,
        reason: parsed.reasoning || "No shifts warranted",
      },
    });
  }

  return {
    shifts: appliedShifts,
    reasoning: parsed.reasoning,
    signalsUsed: {
      conversations: conversations.length,
      emotions: emotions.length,
      agencyActions: agencyActions.length,
    },
  };
}
