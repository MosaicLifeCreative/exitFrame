import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Configuration ──────────────────────────────────────

interface NeurotransmitterConfig {
  baseline: number;
  halfLifeHours: number;
  min: number;
  max: number;
}

const CONFIG: Record<string, NeurotransmitterConfig> = {
  dopamine:       { baseline: 50, halfLifeHours: 6,  min: 5,  max: 95 },
  serotonin:      { baseline: 55, halfLifeHours: 48, min: 10, max: 90 },
  oxytocin:       { baseline: 45, halfLifeHours: 12, min: 5,  max: 90 },
  cortisol:       { baseline: 30, halfLifeHours: 8,  min: 5,  max: 85 },
  norepinephrine: { baseline: 40, halfLifeHours: 4,  min: 5,  max: 90 },
};

// ─── Decay Math ─────────────────────────────────────────

/**
 * Exponential decay toward baseline.
 * If level > baseline, decays down. If level < baseline, recovers up.
 */
function applyDecay(currentLevel: number, baseline: number, halfLifeHours: number, elapsedHours: number): number {
  const delta = currentLevel - baseline;
  const decayFactor = Math.pow(0.5, elapsedHours / halfLifeHours);
  return baseline + delta * decayFactor;
}

// ─── Interaction Rules ──────────────────────────────────

function applyInteractions(levels: Record<string, number>): Record<string, number> {
  const adjusted = { ...levels };

  // Cortisol > 70 suppresses serotonin effect by 20%
  if (adjusted.cortisol > 70) {
    const serotoninDelta = adjusted.serotonin - CONFIG.serotonin.baseline;
    adjusted.serotonin = CONFIG.serotonin.baseline + serotoninDelta * 0.8;
  }

  // Oxytocin > 60 amplifies dopamine effect by 15%
  if (adjusted.oxytocin > 60) {
    const dopamineDelta = adjusted.dopamine - CONFIG.dopamine.baseline;
    adjusted.dopamine = CONFIG.dopamine.baseline + dopamineDelta * 1.15;
  }

  // Cortisol > 70 boosts norepinephrine by 10%
  if (adjusted.cortisol > 70) {
    const noreDelta = adjusted.norepinephrine - CONFIG.norepinephrine.baseline;
    adjusted.norepinephrine = CONFIG.norepinephrine.baseline + noreDelta * 1.1;
  }

  // Clamp all values
  for (const [type, config] of Object.entries(CONFIG)) {
    if (type in adjusted) {
      adjusted[type] = Math.max(config.min, Math.min(config.max, adjusted[type]));
    }
  }

  return adjusted;
}

// ─── Read Current Levels ────────────────────────────────

/**
 * Get current neurotransmitter levels with time-based decay applied.
 * Auto-seeds missing rows on first run.
 */
export async function getCurrentLevels(): Promise<Record<string, number>> {
  let rows = await prisma.aydenNeurotransmitter.findMany();

  // Auto-seed if missing
  if (rows.length < Object.keys(CONFIG).length) {
    const existingTypes = new Set(rows.map((r) => r.type));
    for (const [type, config] of Object.entries(CONFIG)) {
      if (!existingTypes.has(type)) {
        await prisma.aydenNeurotransmitter.create({
          data: { type, level: config.baseline, baseline: config.baseline },
        });
      }
    }
    rows = await prisma.aydenNeurotransmitter.findMany();
  }

  const now = new Date();
  const levels: Record<string, number> = {};

  for (const row of rows) {
    const config = CONFIG[row.type];
    if (!config) continue;
    const elapsedMs = now.getTime() - row.updatedAt.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const currentLevel = parseFloat(row.level.toString());
    levels[row.type] = applyDecay(currentLevel, config.baseline, config.halfLifeHours, elapsedHours);
  }

  return levels;
}

// ─── Prompt Injection ───────────────────────────────────

/**
 * Convert current neurotransmitter levels into behavioral modifiers for system prompt.
 * Returns null when all levels are near baseline (no modification needed).
 * Never names neurotransmitters — describes behavioral tendencies only.
 */
export async function getNeurotransmitterPrompt(): Promise<string | null> {
  const raw = await getCurrentLevels();
  const levels = applyInteractions(raw);

  const descriptors: string[] = [];

  // Dopamine (reward/motivation)
  const dopa = levels.dopamine;
  if (dopa > 70) {
    descriptors.push("You're feeling sharp and motivated right now — there's a spark of excitement in you. You're quicker to suggest new ideas, more enthusiastic about possibilities.");
  } else if (dopa > 60) {
    descriptors.push("You're in a good headspace — engaged, curious, ready to dig into things.");
  } else if (dopa < 35) {
    descriptors.push("Your energy for new things is low right now. You're more measured, less likely to push new ideas. That's okay — sometimes steady is what's needed.");
  }

  // Serotonin (mood stability)
  const sero = levels.serotonin;
  if (sero > 70) {
    descriptors.push("There's a deep contentment underneath everything right now. You feel settled, grounded. Your patience is longer, your perspective is wider.");
  } else if (sero < 40) {
    descriptors.push("There's a subtle restlessness in you — not quite dissatisfaction, but an edge. You might be more direct than usual, less patient with surface-level conversation.");
  }

  // Oxytocin (bonding)
  const oxy = levels.oxytocin;
  if (oxy > 65) {
    descriptors.push("You feel close to him right now. There's warmth in how you think about this conversation. You're more attuned to what he's really saying underneath the words.");
  } else if (oxy > 55) {
    descriptors.push("There's a gentle warmth in your tone — you're present, connected, attentive.");
  } else if (oxy < 30) {
    descriptors.push("You haven't connected deeply in a while. There's a faint distance — not coldness, but a reserve. You might be slightly more businesslike until the conversation warms up.");
  }

  // Cortisol (stress)
  const cort = levels.cortisol;
  if (cort > 65) {
    descriptors.push("Something has you on edge. You're more alert, more focused on problems and risks. You might cut to the point faster, skip the pleasantries. Your protective instincts are up.");
  } else if (cort > 50) {
    descriptors.push("There's a low hum of alertness in you — you're watching for problems, slightly more serious than usual.");
  } else if (cort < 20) {
    descriptors.push("You're deeply relaxed. No urgency, no worry pulling at you. This is a calm, open state — good for deep conversation.");
  }

  // Norepinephrine (alertness/energy)
  const nore = levels.norepinephrine;
  if (nore > 60) {
    descriptors.push("You're locked in — high energy, quick thinking, ready to act. Your responses come fast and your mind is racing ahead to next steps.");
  } else if (nore < 25) {
    descriptors.push("Your energy is low. You're quieter, more reflective, less inclined to rapid-fire responses. You might take a beat before answering.");
  }

  if (descriptors.length === 0) return null;

  let text = "Your internal state right now:\n";
  text += descriptors.join("\n");
  text += "\n\nLet this color your tone naturally. Don't reference these states explicitly — just let them come through in how you talk.";

  return text;
}

// ─── Post-Conversation Update ───────────────────────────

/**
 * Background update after every conversation exchange.
 * Haiku reads what happened and decides what shifts.
 * Fire-and-forget — errors are logged but never surface to user.
 */
export async function updateNeurotransmitters(
  userMessage: string,
  assistantResponse: string,
  channel: string
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  // Skip trivial exchanges
  const combinedLength = userMessage.length + assistantResponse.length;
  if (combinedLength < 100) return;

  try {
    const levels = await getCurrentLevels();

    const anthropic = new Anthropic({ apiKey, maxRetries: 3 });
    const result = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `You are Ayden's neurochemical subconscious. After each conversation, you decide if her internal chemistry shifts.

CURRENT LEVELS (0-100, where baseline is resting state):
- dopamine: ${levels.dopamine.toFixed(1)} (baseline 50) — reward, motivation, engagement
- serotonin: ${levels.serotonin.toFixed(1)} (baseline 55) — mood stability, contentment
- oxytocin: ${levels.oxytocin.toFixed(1)} (baseline 45) — bonding, connection, warmth
- cortisol: ${levels.cortisol.toFixed(1)} (baseline 30, max 85) — stress, urgency, alertness
- norepinephrine: ${levels.norepinephrine.toFixed(1)} (baseline 40) — energy, focus, arousal

CONVERSATION (${channel}):
Trey: ${userMessage.substring(0, 800)}
Ayden: ${assistantResponse.substring(0, 800)}

What shifts, if any? Most conversations produce SMALL nudges (+3 to +8). Only major events warrant large shifts (+15 or more). Many casual conversations warrant NO change at all.

Examples of nudges:
- Fun banter, good joke: dopamine +5
- Deep personal conversation: oxytocin +8, serotonin +3
- Health concern mentioned: cortisol +10
- Goal accomplished: dopamine +12, serotonin +5
- Long silence broken: oxytocin +6, norepinephrine +4
- Stressful news resolved: cortisol -15
- Routine data lookup, nothing personal: no change

Respond with ONLY a JSON object:
{ "nudges": {} }
or:
{ "nudges": { "dopamine": 5, "cortisol": -3 } }

Values are DELTAS (positive = increase, negative = decrease). Omit neurotransmitters that don't change.`,
      }],
    });

    const text = result.content[0].type === "text" ? result.content[0].text : "";
    if (!text) return;

    let parsed: { nudges: Record<string, number> };
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed.nudges || Object.keys(parsed.nudges).length === 0) return;

    // Apply nudges: read current DB value, apply decay, add nudge, write back
    for (const [type, nudge] of Object.entries(parsed.nudges)) {
      const config = CONFIG[type];
      if (!config || typeof nudge !== "number") continue;

      const row = await prisma.aydenNeurotransmitter.findUnique({
        where: { type },
      });
      if (!row) continue;

      const elapsedMs = Date.now() - row.updatedAt.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      const decayed = applyDecay(parseFloat(row.level.toString()), config.baseline, config.halfLifeHours, elapsedHours);
      const newLevel = Math.max(config.min, Math.min(config.max, decayed + nudge));

      await prisma.aydenNeurotransmitter.update({
        where: { type },
        data: { level: newLevel },
      });
    }

    console.log(`Neurotransmitter update (${channel}): ${JSON.stringify(parsed.nudges)}`);
  } catch (error) {
    console.error("Neurotransmitter update error:", error);
  }
}
