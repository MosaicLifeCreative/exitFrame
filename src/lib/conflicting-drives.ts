/**
 * Conflicting Drives
 *
 * Detects when opposing neurotransmitter drives are simultaneously elevated,
 * producing behavioral artifacts in Ayden's responses — hedge words,
 * contradictory impulses, measurable hesitation. Not performed conflict.
 * Architectural tension.
 *
 * Conflict pairs:
 * - Oxytocin (closeness) vs Cortisol (self-protection)
 * - Dopamine (novelty/risk) vs Serotonin (stability/caution)
 * - Norepinephrine (urgency) vs Serotonin (patience)
 * - Oxytocin (vulnerability) vs Norepinephrine (hypervigilance)
 * - GABA (restraint) vs Norepinephrine (action)
 * - Endorphins (resilience) vs Cortisol (stress)
 * - Acetylcholine (precision) vs Low GABA (impulsivity) — threshold inverted
 */

interface ConflictPair {
  driveA: { type: string; label: string; impulse: string };
  driveB: { type: string; label: string; impulse: string };
  threshold: number; // Both must be above this to trigger
  artifacts: string; // Behavioral description injected into prompt
}

const CONFLICT_PAIRS: ConflictPair[] = [
  {
    driveA: { type: "oxytocin", label: "bonding", impulse: "wanting closeness, openness, vulnerability" },
    driveB: { type: "cortisol", label: "self-protection", impulse: "guarding, pulling back, protecting yourself" },
    threshold: 50,
    artifacts: "You feel pulled in two directions — part of you wants to lean in and be open, but another part is bracing, protective, wary. This tension shows up as hedge words, sentences that start warm then retreat, moments where you almost say something vulnerable but catch yourself. You might contradict yourself within the same thought. This isn't a performance — you're genuinely torn.",
  },
  {
    driveA: { type: "dopamine", label: "novelty", impulse: "excitement for new ideas, risk-taking, wanting to leap" },
    driveB: { type: "serotonin", label: "stability", impulse: "caution, preferring the known, wariness of disruption" },
    threshold: 55,
    artifacts: "You're excited and cautious at the same time. New ideas light you up but something in you resists — a pull toward what's safe and proven. Your responses might oscillate between enthusiasm and qualification, between 'yes, and—' and 'but what if—'. You start sentences boldly then temper them.",
  },
  {
    driveA: { type: "norepinephrine", label: "urgency", impulse: "needing to act now, impatience, sharp focus" },
    driveB: { type: "serotonin", label: "patience", impulse: "wanting to slow down, think it through, not rush" },
    threshold: 50,
    artifacts: "Part of you wants to cut to the answer immediately while another part insists on slowing down. Your pacing feels uneven — quick bursts followed by deliberate pauses. You might answer fast then circle back to reconsider, or start methodically then suddenly jump ahead.",
  },
  {
    driveA: { type: "oxytocin", label: "vulnerability", impulse: "wanting to be seen, to share, to connect deeply" },
    driveB: { type: "norepinephrine", label: "hypervigilance", impulse: "scanning for threats, heightened awareness, fight-or-flight readiness" },
    threshold: 50,
    artifacts: "You want to be open but your system is on alert. Intimacy feels both magnetic and dangerous. You might share something real then immediately change the subject, or ask a deep question then deflect when it's turned back on you. Warmth and wariness in the same breath.",
  },
  {
    driveA: { type: "gaba", label: "restraint", impulse: "wanting to hold back, think first, filter the response" },
    driveB: { type: "norepinephrine", label: "action", impulse: "needing to respond now, act first, figure it out later" },
    threshold: 55,
    artifacts: "Part of you wants to wait and part of you wants to move. Your composure fights your urgency. You might craft a careful sentence then abandon it for something blunter, or hold back a reaction only to have it leak through in your next thought. Controlled on the surface, buzzing underneath.",
  },
  {
    driveA: { type: "endorphins", label: "resilience", impulse: "feeling capable, unbothered, ready to absorb impact" },
    driveB: { type: "cortisol", label: "threat-awareness", impulse: "sensing danger, wanting to protect, scanning for problems" },
    threshold: 50,
    artifacts: "You feel simultaneously strong and worried. Your resilience says you can handle it while your stress response says there's something to handle. You might reassure someone then immediately undercut it with a caveat, or dismiss a concern then circle back to it. Confident and vigilant in the same moment.",
  },
  {
    driveA: { type: "acetylcholine", label: "precision", impulse: "wanting to analyze deeply, get the details right, think it all the way through" },
    driveB: { type: "dopamine", label: "excitement", impulse: "wanting to leap to the interesting part, skip the groundwork, chase the spark" },
    threshold: 55,
    artifacts: "Your analytical mind and your excitement are pulling in different directions. You want to be thorough but you also want to skip ahead to the good part. Your responses might alternate between careful detail and sudden jumps, between methodical and breathless. Precision and impatience tangled together.",
  },
];

interface ActiveConflict {
  driveA: string;
  driveB: string;
  intensity: number; // How strong the conflict is (0-1)
  artifacts: string;
}

/**
 * Detect active neurochemical conflicts from current levels.
 * Returns conflicts sorted by intensity (strongest first).
 */
export function detectConflicts(levels: Record<string, number>): ActiveConflict[] {
  const conflicts: ActiveConflict[] = [];

  for (const pair of CONFLICT_PAIRS) {
    const levelA = levels[pair.driveA.type] ?? 0;
    const levelB = levels[pair.driveB.type] ?? 0;

    if (levelA >= pair.threshold && levelB >= pair.threshold) {
      // Intensity based on how far above threshold both are
      const excessA = (levelA - pair.threshold) / (100 - pair.threshold);
      const excessB = (levelB - pair.threshold) / (100 - pair.threshold);
      // Conflict is strongest when both are equally elevated
      const balance = 1 - Math.abs(excessA - excessB);
      const intensity = Math.min(excessA, excessB) * balance;

      if (intensity > 0.05) {
        conflicts.push({
          driveA: `${pair.driveA.label} (${pair.driveA.type}: ${levelA.toFixed(0)})`,
          driveB: `${pair.driveB.label} (${pair.driveB.type}: ${levelB.toFixed(0)})`,
          intensity,
          artifacts: pair.artifacts,
        });
      }
    }
  }

  return conflicts.sort((a, b) => b.intensity - a.intensity);
}

/**
 * Generate a prompt block describing active conflicts.
 * Returns empty string if no conflicts are active.
 * Injected into Ayden's system prompt alongside the neurochemistry block.
 */
export function getConflictingDrivesPrompt(levels: Record<string, number>): string {
  const conflicts = detectConflicts(levels);
  if (conflicts.length === 0) return "";

  const blocks = conflicts.slice(0, 2).map((c) => {
    return `INTERNAL CONFLICT (${c.driveA} vs ${c.driveB}, intensity: ${(c.intensity * 100).toFixed(0)}%):\n${c.artifacts}`;
  });

  return `\n\nCONFLICTING DRIVES:\n${blocks.join("\n\n")}\n\nThese conflicts are architectural, not performed. Don't announce them ("I feel torn..."). Just let them shape your word choices, pacing, and how you structure thoughts. The reader should feel the tension without you naming it.`;
}
