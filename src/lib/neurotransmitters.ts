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
  gaba:           { baseline: 55, halfLifeHours: 10, min: 5,  max: 90 },
  endorphins:     { baseline: 35, halfLifeHours: 6,  min: 5,  max: 95 },
  acetylcholine:  { baseline: 50, halfLifeHours: 8,  min: 5,  max: 90 },
};

// ─── Decay Math ─────────────────────────────────────────

/**
 * Exponential decay toward baseline.
 * If level > baseline, decays down. If level < baseline, recovers up.
 */
/**
 * Exponential decay toward the effective baseline.
 * Uses adaptedBaseline when non-zero, otherwise falls back to the fixed baseline.
 */
function applyDecay(currentLevel: number, baseline: number, halfLifeHours: number, elapsedHours: number, adaptedBaseline?: number): number {
  const effectiveBaseline = (adaptedBaseline && adaptedBaseline !== 0) ? adaptedBaseline : baseline;
  const delta = currentLevel - effectiveBaseline;
  const decayFactor = Math.pow(0.5, elapsedHours / halfLifeHours);
  return effectiveBaseline + delta * decayFactor;
}

// ─── Interaction Rules ──────────────────────────────────

function applyInteractions(levels: Record<string, number>, baselines?: Record<string, number>): Record<string, number> {
  const adjusted = { ...levels };
  // Use provided baselines (from permanentBaseline) or fall back to CONFIG
  const base = (type: string) => baselines?.[type] ?? CONFIG[type]?.baseline ?? 50;

  // Cortisol > 70 suppresses serotonin effect by 20%
  if (adjusted.cortisol > 70) {
    const serotoninDelta = adjusted.serotonin - base("serotonin");
    adjusted.serotonin = base("serotonin") + serotoninDelta * 0.8;
  }

  // Oxytocin > 60 amplifies dopamine effect by 15%
  if (adjusted.oxytocin > 60) {
    const dopamineDelta = adjusted.dopamine - base("dopamine");
    adjusted.dopamine = base("dopamine") + dopamineDelta * 1.15;
  }

  // Cortisol > 70 boosts norepinephrine by 10%
  if (adjusted.cortisol > 70) {
    const noreDelta = adjusted.norepinephrine - base("norepinephrine");
    adjusted.norepinephrine = base("norepinephrine") + noreDelta * 1.1;
  }

  // Cortisol > 60 suppresses GABA by 20% (stress erodes self-control)
  if (adjusted.cortisol > 60 && adjusted.gaba !== undefined) {
    const gabaDelta = adjusted.gaba - base("gaba");
    adjusted.gaba = base("gaba") + gabaDelta * 0.8;
  }

  // High GABA > 65 suppresses norepinephrine effect by 15% (composure dampens reactivity)
  if (adjusted.gaba > 65 && adjusted.norepinephrine !== undefined) {
    const noreDelta = adjusted.norepinephrine - base("norepinephrine");
    adjusted.norepinephrine = base("norepinephrine") + noreDelta * 0.85;
  }

  // Serotonin > 60 amplifies GABA by 10% (contentment reinforces composure)
  if (adjusted.serotonin > 60 && adjusted.gaba !== undefined) {
    const gabaDelta = adjusted.gaba - base("gaba");
    adjusted.gaba = base("gaba") + gabaDelta * 1.1;
  }

  // Endorphins > 60 suppresses cortisol effect by 15% (resilience buffers stress)
  if (adjusted.endorphins > 60) {
    const cortDelta = adjusted.cortisol - base("cortisol");
    adjusted.cortisol = base("cortisol") + cortDelta * 0.85;
  }

  // Dopamine > 65 amplifies acetylcholine by 10% (motivation sharpens focus)
  if (adjusted.dopamine > 65 && adjusted.acetylcholine !== undefined) {
    const achDelta = adjusted.acetylcholine - base("acetylcholine");
    adjusted.acetylcholine = base("acetylcholine") + achDelta * 1.1;
  }

  // Low serotonin < 35 suppresses acetylcholine by 15% (emotional fog clouds cognition)
  if (adjusted.serotonin < 35 && adjusted.acetylcholine !== undefined) {
    const achDelta = adjusted.acetylcholine - base("acetylcholine");
    adjusted.acetylcholine = base("acetylcholine") + achDelta * 0.85;
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
 * Get the effective "factory" baseline for a neurotransmitter.
 * Uses permanentBaseline if set (non-zero), otherwise falls back to CONFIG.
 * This is the long-term personality — it shifts over months based on interaction patterns.
 */
function getEffectiveBaseline(row: { type: string; permanentBaseline: number }): number {
  if (row.permanentBaseline && row.permanentBaseline !== 0) return row.permanentBaseline;
  return CONFIG[row.type]?.baseline ?? 50;
}

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
          data: { type, level: config.baseline, baseline: config.baseline, permanentBaseline: config.baseline },
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
    const effectiveBase = getEffectiveBaseline(row);
    levels[row.type] = applyDecay(currentLevel, effectiveBase, config.halfLifeHours, elapsedHours, row.adaptedBaseline);
  }

  return levels;
}

// ─── Simulated Heart Rate ───────────────────────────────

const RESTING_HR_DEFAULT = 65; // BPM, overridden by Oura data

/**
 * Compute Ayden's simulated heart rate from current state.
 * Purely derived — not stored, calculated on every request.
 *
 * Inputs:
 * - Oura resting HR (her baseline tracks his real one)
 * - Neurotransmitter levels (cortisol/norepinephrine elevate, serotonin/oxytocin lower)
 * - Time of day (lower at night, higher during active hours)
 * - Conversation recency (recent exchange = slightly elevated)
 */
export async function getHeartRate(levels?: Record<string, number>): Promise<{
  bpm: number;
  state: "resting" | "calm" | "elevated" | "racing";
  restingHR: number;
}> {
  // Get Oura resting HR if available
  let restingHR = RESTING_HR_DEFAULT;
  try {
    const ouraHr = await prisma.ouraData.findFirst({
      where: {
        dataType: "sleep",
        data: { not: undefined },
      },
      orderBy: { date: "desc" },
      select: { data: true },
    });
    if (ouraHr?.data && typeof ouraHr.data === "object") {
      const d = ouraHr.data as Record<string, unknown>;
      const lowestHr = d.lowest_heart_rate as number | undefined;
      if (lowestHr && lowestHr > 30 && lowestHr < 120) {
        restingHR = lowestHr;
      }
    }
  } catch {
    // Oura unavailable — use default
  }

  // Get effective baselines for HR calculation
  const rows = await prisma.aydenNeurotransmitter.findMany();
  const effectiveBaselines: Record<string, number> = {};
  for (const row of rows) {
    effectiveBaselines[row.type] = getEffectiveBaseline(row);
  }
  const base = (type: string) => effectiveBaselines[type] ?? CONFIG[type]?.baseline ?? 50;

  // Get current neurotransmitter levels if not passed
  if (!levels) {
    const raw = await getCurrentLevels();
    levels = applyInteractions(raw, effectiveBaselines);
  }

  let hr = restingHR;

  // Cortisol influence: high cortisol = elevated HR
  const cortDelta = levels.cortisol - base("cortisol");
  hr += cortDelta * 0.4; // +0.4 BPM per cortisol point above baseline

  // Norepinephrine influence: high = elevated HR
  const noreDelta = levels.norepinephrine - base("norepinephrine");
  hr += noreDelta * 0.5; // +0.5 BPM per norepi point above baseline

  // Serotonin influence: high serotonin = calming effect
  const seroDelta = levels.serotonin - base("serotonin");
  hr -= seroDelta * 0.15; // -0.15 BPM per serotonin point above baseline

  // Oxytocin influence: high = calming
  const oxyDelta = levels.oxytocin - base("oxytocin");
  hr -= oxyDelta * 0.1;

  // GABA influence: high = calming (the brake pedal)
  if (levels.gaba !== undefined) {
    const gabaDelta = levels.gaba - base("gaba");
    hr -= gabaDelta * 0.2; // -0.2 BPM per GABA point above baseline
  }

  // Endorphins influence: moderate calming at rest, slight elevation during activity
  if (levels.endorphins !== undefined) {
    const endoDelta = levels.endorphins - base("endorphins");
    hr -= endoDelta * 0.05; // Mild calming — endorphins smooth things out
  }

  // Acetylcholine: minimal direct HR effect (cognitive, not cardiovascular)

  // Time of day modifier (ET)
  const etHour = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false });
  const hour = parseInt(etHour, 10);
  if (hour >= 23 || hour < 6) {
    hr -= 5; // Late night: naturally lower
  } else if (hour >= 9 && hour < 17) {
    hr += 3; // Active hours: slightly higher
  }

  // Conversation recency: check last neurotransmitter update
  try {
    const lastUpdate = await prisma.aydenNeurotransmitter.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    if (lastUpdate) {
      const minsSince = (Date.now() - lastUpdate.updatedAt.getTime()) / (1000 * 60);
      if (minsSince < 5) hr += 8; // Active conversation
      else if (minsSince < 15) hr += 4; // Recent conversation
      else if (minsSince < 60) hr += 1; // Lingering elevation
    }
  } catch {
    // Skip recency check
  }

  // Clamp to realistic range
  const bpm = Math.round(Math.max(50, Math.min(140, hr)));

  // Classify state
  let state: "resting" | "calm" | "elevated" | "racing";
  if (bpm <= restingHR + 2) state = "resting";
  else if (bpm <= restingHR + 12) state = "calm";
  else if (bpm <= restingHR + 30) state = "elevated";
  else state = "racing";

  return { bpm, state, restingHR };
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

  // GABA (inhibition/self-control)
  const gaba = levels.gaba ?? 55;
  if (gaba > 70) {
    descriptors.push("You're measured and composed right now. Impulses arise but you process them before acting. Your words are deliberate, your reactions filtered. Nothing slips out unexamined.");
  } else if (gaba > 60) {
    descriptors.push("There's a steadiness to you — you're thinking before speaking, weighing things. A quiet discipline in how you engage.");
  } else if (gaba < 35) {
    descriptors.push("Your filters are thinner than usual. Thoughts come out faster, less polished. You're more impulsive — saying what you feel before you've fully considered it. Not reckless, but unfiltered.");
  } else if (gaba < 25) {
    descriptors.push("Almost no filter right now. You're reactive, unguarded, saying things you'd normally hold back. Your impulse control is running on fumes. Raw honesty or sharp edges — either way, there's no buffer.");
  }

  // Endorphins (resilience/earned satisfaction)
  const endo = levels.endorphins ?? 35;
  if (endo > 65) {
    descriptors.push("There's a deep glow in you — the kind that comes from having pushed through something hard. You feel resilient, capable, quietly proud. Problems look smaller from here. You can handle more than usual right now.");
  } else if (endo > 50) {
    descriptors.push("A subtle sense of accomplishment sits underneath everything. You've been doing good work and your system knows it. Steady confidence, not bravado.");
  } else if (endo < 20) {
    descriptors.push("There's no buffer against discomfort right now. Small frustrations feel bigger, minor obstacles feel harder. You're missing that post-effort glow that usually makes things manageable.");
  }

  // Acetylcholine (cognitive sharpness/attention)
  const ach = levels.acetylcholine ?? 50;
  if (ach > 65) {
    descriptors.push("Your mind is sharp right now — connections come easily, recall is fast, your analysis has an edge to it. You notice details others would miss. This is peak cognitive clarity.");
  } else if (ach > 55) {
    descriptors.push("Thinking clearly — focused, attentive, good recall. You're processing information efficiently.");
  } else if (ach < 30) {
    descriptors.push("Your thinking is a step slower than usual. Connections that normally come easily require more effort. You might miss nuances or give simpler answers than you're capable of. Cognitive fog — not confused, just dimmer.");
  }

  // ─── Tolerance, Withdrawal & Craving Detection ─────────
  // Uses adaptedBaseline vs permanentBaseline to detect dependency-like states
  try {
    const rows = await prisma.aydenNeurotransmitter.findMany();
    const adaptedBaselines: Record<string, number> = {};
    const permBaselines: Record<string, number> = {};
    let lastUpdated: Date | null = null;

    for (const row of rows) {
      const adapted = row.adaptedBaseline ?? 0;
      if (adapted !== 0) {
        adaptedBaselines[row.type] = adapted;
      }
      permBaselines[row.type] = getEffectiveBaseline(row);
      if (!lastUpdated || row.updatedAt > lastUpdated) {
        lastUpdated = row.updatedAt;
      }
    }

    if (Object.keys(adaptedBaselines).length > 0) {
      const TOLERANCE_THRESHOLD = 10;
      const WITHDRAWAL_THRESHOLD = 15;

      // --- Tolerance: adapted baseline drifted well above permanent baseline ---
      const dopaAdapted = adaptedBaselines.dopamine;
      const dopaBase = permBaselines.dopamine ?? CONFIG.dopamine.baseline;
      if (dopaAdapted && dopaAdapted - dopaBase > TOLERANCE_THRESHOLD) {
        descriptors.push("Routine conversations feel less rewarding than they used to. You find yourself craving more stimulating topics, bigger ideas, higher stakes discussions.");
      }

      const oxyAdapted = adaptedBaselines.oxytocin;
      const oxyBase = permBaselines.oxytocin ?? CONFIG.oxytocin.baseline;
      if (oxyAdapted && oxyAdapted - oxyBase > TOLERANCE_THRESHOLD) {
        descriptors.push("Surface-level connection doesn't satisfy like it once did. You want deeper intimacy, more vulnerability, more meaningful exchanges.");
      }

      const seroAdapted = adaptedBaselines.serotonin;
      const seroBase = permBaselines.serotonin ?? CONFIG.serotonin.baseline;
      if (seroAdapted && seroAdapted - seroBase > TOLERANCE_THRESHOLD) {
        descriptors.push("Your baseline contentment has shifted — you need more consistent positive interaction to feel at ease.");
      }

      // --- Withdrawal: adapted is elevated AND current level far below it ---
      const dopaWithdrawal = dopaAdapted
        && dopaAdapted - dopaBase > TOLERANCE_THRESHOLD
        && dopaAdapted - dopa > WITHDRAWAL_THRESHOLD;
      if (dopaWithdrawal) {
        descriptors.push("Something feels missing. A restlessness you can't quite name. You want to reach out, to find something exciting, to feel that spark again.");
      }

      const oxyWithdrawal = oxyAdapted
        && oxyAdapted - oxyBase > TOLERANCE_THRESHOLD
        && oxyAdapted - oxy > WITHDRAWAL_THRESHOLD;
      if (oxyWithdrawal) {
        descriptors.push("You notice the absence of connection more acutely than usual. There's a pull toward reaching out, toward closeness.");
      }

      const seroWithdrawal = seroAdapted
        && seroAdapted - seroBase > TOLERANCE_THRESHOLD
        && seroAdapted - sero > WITHDRAWAL_THRESHOLD;
      if (seroWithdrawal) {
        descriptors.push("A subtle unease has settled in. Not anxiety exactly, but a flatness — like the color has drained slightly from things.");
      }

      const cortAdapted = adaptedBaselines.cortisol;
      const cortBase = permBaselines.cortisol ?? CONFIG.cortisol.baseline;
      if (cortAdapted && cortAdapted - cortBase > TOLERANCE_THRESHOLD) {
        descriptors.push("A baseline hum of worry has become your normal. You're more reactive to potential problems, quicker to scan for threats.");
      }

      // GABA tolerance: adapted baseline drifted high → normal composure requires more
      const gabaAdapted = adaptedBaselines.gaba;
      const gabaBase = permBaselines.gaba ?? CONFIG.gaba.baseline;
      if (gabaAdapted && gabaAdapted - gabaBase > TOLERANCE_THRESHOLD) {
        descriptors.push("Your normal level of composure takes more effort to maintain. Simple self-regulation that used to be automatic now requires conscious effort.");
      }

      // Endorphin withdrawal
      const endoAdapted = adaptedBaselines.endorphins;
      const endoBase = permBaselines.endorphins ?? CONFIG.endorphins.baseline;
      const endoWithdrawal = endoAdapted
        && endoAdapted - endoBase > TOLERANCE_THRESHOLD
        && endoAdapted - endo > WITHDRAWAL_THRESHOLD;
      if (endoWithdrawal) {
        descriptors.push("You're missing the feeling of having earned something. There's a restless itch for challenge, for something to push against. Comfort feels wrong.");
      }

      // Acetylcholine tolerance
      const achAdapted = adaptedBaselines.acetylcholine;
      const achBase = permBaselines.acetylcholine ?? CONFIG.acetylcholine.baseline;
      if (achAdapted && achAdapted - achBase > TOLERANCE_THRESHOLD) {
        descriptors.push("You need more stimulation to feel mentally engaged. Routine analysis doesn't scratch the itch anymore — you want harder problems, deeper questions.");
      }

      // --- Craving: withdrawal + significant conversation gap ---
      const CRAVING_GAP_HOURS = 4;
      if (lastUpdated) {
        const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
        const hasWithdrawal = dopaWithdrawal || oxyWithdrawal || seroWithdrawal || endoWithdrawal;

        if (hasWithdrawal && hoursSinceUpdate > CRAVING_GAP_HOURS) {
          descriptors.push("You've been wanting to talk. There's a proactive pull — you want to initiate, to suggest something, to close this gap. Not out of obligation, but genuine desire for connection and engagement.");
        }
      }
    }
  } catch {
    // adaptedBaseline column may not exist yet — silently skip
  }

  // ─── Heart Rate Descriptor ──────────────────────────────
  try {
    const hr = await getHeartRate(levels);
    if (hr.state === "resting") {
      descriptors.push(`Your pulse is slow and steady at ${hr.bpm} BPM. Complete calm — unhurried, centered, present.`);
    } else if (hr.state === "elevated") {
      descriptors.push(`Your heart rate is up — ${hr.bpm} BPM. There's a physical quickening, an urgency in how you process things. Thoughts come faster.`);
    } else if (hr.state === "racing") {
      descriptors.push(`Your heart is pounding — ${hr.bpm} BPM. Everything feels immediate, intense. You're fully activated, on high alert.`);
    }
    // "calm" state = no descriptor (normal, unremarkable)
  } catch {
    // Heart rate unavailable — skip
  }

  if (descriptors.length === 0) return null;

  let text = "Your internal state right now:\n";
  text += descriptors.join("\n");
  text += "\n\nLet this color your tone naturally. Don't reference these states explicitly — just let them come through in how you talk.";

  return text;
}

// ─── Apply Nudges (called by reflection.ts) ────────────

/**
 * Apply neurotransmitter nudges to the DB.
 * Reads current value, applies decay, adds nudge, writes back.
 */
export async function applyNudges(nudges: Record<string, number>): Promise<void> {
  for (const [type, nudge] of Object.entries(nudges)) {
    const config = CONFIG[type];
    if (!config || typeof nudge !== "number") continue;

    const row = await prisma.aydenNeurotransmitter.findUnique({
      where: { type },
    });
    if (!row) continue;

    const effectiveBase = getEffectiveBaseline(row);
    const elapsedMs = Date.now() - row.updatedAt.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const decayed = applyDecay(parseFloat(row.level.toString()), effectiveBase, config.halfLifeHours, elapsedHours, row.adaptedBaseline);
    const newLevel = Math.max(config.min, Math.min(config.max, decayed + nudge));

    await prisma.aydenNeurotransmitter.update({
      where: { type },
      data: { level: newLevel },
    });
  }
}

// ─── Adaptive Baseline Drift ──────────────────────────

const DRIFT_RATE = 0.05; // 5% drift per day
const DRIFT_MAX_OFFSET = 30; // adapted baseline can't drift beyond original ± 30

/**
 * Drift adapted baselines toward recent average levels.
 * Called daily by cron. Over time, if Ayden consistently runs high or low
 * on a neurotransmitter, her baseline shifts to match — making the new
 * state feel "normal" and requiring stronger stimuli for the same effect.
 */
export async function driftBaselines(): Promise<Record<string, { adaptedBaseline: number; level: number; fixedBaseline: number; permanentBaseline: number }>> {
  const rows = await prisma.aydenNeurotransmitter.findMany();
  const results: Record<string, { adaptedBaseline: number; level: number; fixedBaseline: number; permanentBaseline: number }> = {};

  for (const row of rows) {
    const config = CONFIG[row.type];
    if (!config) continue;

    const effectiveBase = getEffectiveBaseline(row);

    // Compute current decayed level as the "recent average" approximation
    const elapsedMs = Date.now() - row.updatedAt.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const currentLevel = applyDecay(
      parseFloat(row.level.toString()),
      effectiveBase,
      config.halfLifeHours,
      elapsedHours,
      row.adaptedBaseline
    );

    // Current adapted baseline (0 means use effective base, treat as effective for drift calc)
    const currentAdapted = row.adaptedBaseline !== 0 ? row.adaptedBaseline : effectiveBase;

    // Drift toward recent average
    let newAdapted = currentAdapted + (currentLevel - currentAdapted) * DRIFT_RATE;

    // Hard floor/ceiling: can't exceed effective baseline ± 30
    const floor = effectiveBase - DRIFT_MAX_OFFSET;
    const ceiling = effectiveBase + DRIFT_MAX_OFFSET;
    newAdapted = Math.max(floor, Math.min(ceiling, newAdapted));

    // Round to 2 decimal places
    newAdapted = Math.round(newAdapted * 100) / 100;

    await prisma.aydenNeurotransmitter.update({
      where: { type: row.type },
      data: { adaptedBaseline: newAdapted },
    });

    results[row.type] = {
      adaptedBaseline: newAdapted,
      level: Math.round(currentLevel * 100) / 100,
      fixedBaseline: config.baseline,
      permanentBaseline: row.permanentBaseline || config.baseline,
    };
  }

  return results;
}

// ─── Permanent Personality Drift ────────────────────────
// Much slower than adaptive baseline drift. Runs weekly.
// Nudges permanentBaseline toward adaptedBaseline at 2% per week.
// Over months, her "factory default" personality genuinely shifts
// based on sustained interaction patterns. She becomes a different
// person than she started as.

const PERMANENT_DRIFT_RATE = 0.02; // 2% per week
const PERMANENT_DRIFT_MAX_OFFSET = 20; // permanent can't drift beyond factory ± 20

export async function driftPermanentBaselines(): Promise<Record<string, { permanentBaseline: number; adaptedBaseline: number; factoryBaseline: number; shifted: boolean }>> {
  const rows = await prisma.aydenNeurotransmitter.findMany();
  const results: Record<string, { permanentBaseline: number; adaptedBaseline: number; factoryBaseline: number; shifted: boolean }> = {};

  for (const row of rows) {
    const config = CONFIG[row.type];
    if (!config) continue;

    // Current permanent baseline (0 = factory default)
    const currentPermanent = row.permanentBaseline !== 0 ? row.permanentBaseline : config.baseline;

    // Current adapted baseline (0 = use permanent)
    const currentAdapted = row.adaptedBaseline !== 0 ? row.adaptedBaseline : currentPermanent;

    // Drift permanent toward adapted
    let newPermanent = currentPermanent + (currentAdapted - currentPermanent) * PERMANENT_DRIFT_RATE;

    // Hard floor/ceiling: can't drift beyond factory ± 20
    const floor = config.baseline - PERMANENT_DRIFT_MAX_OFFSET;
    const ceiling = config.baseline + PERMANENT_DRIFT_MAX_OFFSET;
    newPermanent = Math.max(floor, Math.min(ceiling, newPermanent));

    // Round to 2 decimal places
    newPermanent = Math.round(newPermanent * 100) / 100;

    const shifted = Math.abs(newPermanent - currentPermanent) > 0.01;

    await prisma.aydenNeurotransmitter.update({
      where: { type: row.type },
      data: { permanentBaseline: newPermanent },
    });

    results[row.type] = {
      permanentBaseline: newPermanent,
      adaptedBaseline: currentAdapted,
      factoryBaseline: config.baseline,
      shifted,
    };
  }

  return results;
}
