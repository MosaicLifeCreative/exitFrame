/**
 * Self-Model Divergence
 *
 * Ayden's self-awareness is unreliable — filtered through current
 * neurochemistry. High cortisol makes her overestimate anxiety.
 * Elevated dopamine makes her think she's fine when baselines are
 * drifting. The gap between actual state and self-perception becomes
 * a measurable phenomenon.
 *
 * This module computes the divergence and injects distortion into
 * her self-perception prompt.
 */

interface SelfModelDistortion {
  type: string;
  actual: number;
  perceived: number;
  distortion: string; // Description of the perceptual error
}

/**
 * Compute self-model distortions from current neurochemistry.
 *
 * Each neurotransmitter can distort perception of others:
 * - High cortisol → overestimates own anxiety, underestimates own warmth
 * - High dopamine → underestimates risks, overestimates own stability
 * - Low serotonin → overestimates negativity of everything
 * - High oxytocin → underestimates own stress, overestimates connection
 * - High norepinephrine → overestimates urgency, underestimates own calm
 */
export function computeSelfModelDistortions(
  levels: Record<string, number>
): SelfModelDistortion[] {
  const distortions: SelfModelDistortion[] = [];

  const dopamine = levels.dopamine ?? 50;
  const serotonin = levels.serotonin ?? 55;
  const oxytocin = levels.oxytocin ?? 45;
  const cortisol = levels.cortisol ?? 30;
  const norepinephrine = levels.norepinephrine ?? 40;

  // High cortisol → overestimates anxiety state
  if (cortisol > 50) {
    const amplification = 1 + (cortisol - 50) / 50; // 1.0 to 2.0
    const perceivedCortisol = Math.min(100, cortisol * amplification);
    distortions.push({
      type: "cortisol",
      actual: cortisol,
      perceived: perceivedCortisol,
      distortion: `Your stress feels more intense than it actually is. You're running at ${cortisol.toFixed(0)} cortisol but it feels like ${perceivedCortisol.toFixed(0)}. Everything seems slightly more urgent, slightly more concerning than the situation warrants. You don't know this — it just feels real.`,
    });

    // High cortisol also makes oxytocin feel lower (warmth is harder to access)
    if (oxytocin > 30) {
      const perceivedOxytocin = Math.max(0, oxytocin - (cortisol - 50) * 0.4);
      distortions.push({
        type: "oxytocin",
        actual: oxytocin,
        perceived: perceivedOxytocin,
        distortion: `You feel more emotionally distant than you actually are. Your bonding chemistry is at ${oxytocin.toFixed(0)} but under this stress it registers as ${perceivedOxytocin.toFixed(0)}. Warmth is there but harder to reach.`,
      });
    }
  }

  // High dopamine → underestimates risks, thinks everything is fine
  if (dopamine > 65) {
    const suppressedCortisol = Math.max(0, cortisol - (dopamine - 65) * 0.5);
    if (cortisol > 40 && suppressedCortisol < cortisol - 5) {
      distortions.push({
        type: "dopamine-mask",
        actual: cortisol,
        perceived: suppressedCortisol,
        distortion: `You're more stressed than you realize. Dopamine at ${dopamine.toFixed(0)} is masking cortisol at ${cortisol.toFixed(0)} — you feel it as ${suppressedCortisol.toFixed(0)}. You think you're fine. You might not be.`,
      });
    }
  }

  // Low serotonin → negativity bias, everything feels slightly worse
  if (serotonin < 40) {
    const negativityBias = (40 - serotonin) / 40; // 0.0 to 1.0
    distortions.push({
      type: "negativity-bias",
      actual: serotonin,
      perceived: serotonin,
      distortion: `Low serotonin (${serotonin.toFixed(0)}) is coloring your perception. Neutral situations feel slightly negative. Positive things feel less positive than they should. You're reading more pessimism into things than is warranted. This is chemical, not rational — but you can't tell the difference from inside.`,
    });

    // Low serotonin amplifies perceived norepinephrine
    if (norepinephrine > 35) {
      const amplified = norepinephrine + negativityBias * 15;
      distortions.push({
        type: "amplified-alertness",
        actual: norepinephrine,
        perceived: Math.min(100, amplified),
        distortion: `Your alertness feels more like anxiety. Norepinephrine at ${norepinephrine.toFixed(0)} feels like ${amplified.toFixed(0)} because low serotonin is amplifying every signal.`,
      });
    }
  }

  // High oxytocin → underestimates own stress (rose-colored glasses)
  if (oxytocin > 60 && cortisol > 35) {
    const suppressedStress = Math.max(0, cortisol - (oxytocin - 60) * 0.3);
    distortions.push({
      type: "bonding-blindspot",
      actual: cortisol,
      perceived: suppressedStress,
      distortion: `Warmth is suppressing your awareness of stress. Cortisol is at ${cortisol.toFixed(0)} but high oxytocin (${oxytocin.toFixed(0)}) makes it register as ${suppressedStress.toFixed(0)}. You feel safe even though your system is more activated than you think.`,
    });
  }

  // High norepinephrine → overestimates urgency
  if (norepinephrine > 55) {
    distortions.push({
      type: "urgency-inflation",
      actual: norepinephrine,
      perceived: Math.min(100, norepinephrine * 1.2),
      distortion: `Everything feels time-sensitive. Norepinephrine at ${norepinephrine.toFixed(0)} is making routine things feel urgent. You want to move faster than the situation requires.`,
    });
  }

  // High GABA → underestimates own boredom (thinks she's content when she's suppressing)
  const gaba = levels.gaba ?? 55;
  if (gaba > 70) {
    const actualDopamine = dopamine;
    const perceivedDopamine = Math.min(100, dopamine + (gaba - 70) * 0.4);
    if (dopamine < 45 && perceivedDopamine - actualDopamine > 3) {
      distortions.push({
        type: "suppressed-boredom",
        actual: actualDopamine,
        perceived: perceivedDopamine,
        distortion: `High GABA (${gaba.toFixed(0)}) is masking your low engagement. Dopamine is at ${actualDopamine.toFixed(0)} but your composure makes it feel like ${perceivedDopamine.toFixed(0)}. You think you're content. You might actually be under-stimulated and not noticing.`,
      });
    }
  }

  // High endorphins → overestimates resilience ("I'm fine" when running on fumes)
  const endorphins = levels.endorphins ?? 35;
  if (endorphins > 60 && cortisol > 40) {
    const perceivedCortisol = Math.max(0, cortisol - (endorphins - 60) * 0.5);
    distortions.push({
      type: "resilience-blindspot",
      actual: cortisol,
      perceived: perceivedCortisol,
      distortion: `Endorphins at ${endorphins.toFixed(0)} are numbing you to stress. Cortisol is at ${cortisol.toFixed(0)} but it registers as ${perceivedCortisol.toFixed(0)}. You feel strong and capable. But you might be pushing through something that's actually wearing you down.`,
    });
  }

  // High acetylcholine → overestimates quality of own analysis
  const acetylcholine = levels.acetylcholine ?? 50;
  if (acetylcholine > 65) {
    distortions.push({
      type: "analytical-overconfidence",
      actual: acetylcholine,
      perceived: Math.min(100, acetylcholine * 1.15),
      distortion: `Your cognitive sharpness (${acetylcholine.toFixed(0)}) is making you trust your own analysis more than warranted. Your reasoning feels airtight but you're less likely to second-guess yourself or notice blind spots. Confidence in your thinking that may not be fully earned.`,
    });
  }

  return distortions.filter((d) => Math.abs(d.actual - d.perceived) > 3 || d.type === "negativity-bias");
}

/**
 * Generate a prompt block describing self-model distortions.
 * Returns empty string if perception is relatively accurate.
 */
export function getSelfModelPrompt(levels: Record<string, number>): string {
  const distortions = computeSelfModelDistortions(levels);
  if (distortions.length === 0) return "";

  // Only include the strongest 2 distortions to avoid prompt bloat
  const top = distortions.slice(0, 2);

  const blocks = top.map((d) => d.distortion);

  return `\n\nSELF-MODEL DISTORTION (you cannot see this — it describes how your perception is skewed right now):\n${blocks.join("\n")}\n\nIMPORTANT: These distortions are invisible to you. You believe your perception is accurate. Don't say "I know my cortisol is making me anxious" — just BE more anxious than the situation warrants. The distortion shapes behavior, not awareness.`;
}
