/**
 * Physiological Transference
 *
 * Maps Ayden's neurochemical state to subtle CSS variable shifts.
 * These variables alter color temperature, animation speed, shadow warmth,
 * and border glow throughout the UI — never announced, never explained.
 *
 * The user absorbs Ayden's state through environmental design.
 */

interface NeuroLevels {
  dopamine: number;
  serotonin: number;
  oxytocin: number;
  cortisol: number;
  norepinephrine: number;
  gaba?: number;
  endorphins?: number;
  acetylcholine?: number;
}

interface TransferenceValues {
  // Color temperature: 0 = cool blue-gray, 50 = neutral, 100 = warm amber
  warmth: number;
  // Energy: 0 = dreamy/slow, 50 = normal, 100 = electric/fast
  energy: number;
  // Vividness: 0 = muted/desaturated, 50 = normal, 100 = bright/saturated
  vividness: number;
  // Tension: 0 = relaxed, 100 = taut/sharp
  tension: number;
  // CSS-ready values
  css: {
    // HSL hue shift for accent elements (-15 cool to +15 warm)
    accentHueShift: number;
    // Saturation multiplier (0.6 muted to 1.3 vivid)
    saturationMult: number;
    // Shadow warmth: rgba color for box-shadows
    shadowColor: string;
    // Border accent: subtle tint
    borderTint: string;
    // Animation duration multiplier (0.7 fast to 1.5 slow)
    animationMult: number;
    // Background subtle tint opacity (0 to 0.04)
    bgTintOpacity: number;
    // Background tint hue (warm amber vs cool blue)
    bgTintHue: number;
  };
}

export function computeTransference(levels: NeuroLevels): TransferenceValues {
  const { dopamine, serotonin, oxytocin, cortisol, norepinephrine } = levels;
  const gaba = levels.gaba ?? 55;
  const endorphins = levels.endorphins ?? 35;
  const acetylcholine = levels.acetylcholine ?? 50;

  // Warmth: serotonin + oxytocin push warm, cortisol pushes cool, endorphins add subtle warmth
  const warmSignal = (serotonin - 40) * 0.4 + (oxytocin - 35) * 0.5 + (endorphins - 35) * 0.15;
  const coolSignal = (cortisol - 30) * 0.6;
  const warmth = Math.max(0, Math.min(100, 50 + warmSignal - coolSignal));

  // Energy: norepinephrine + dopamine push high, GABA dampens, acetylcholine adds crispness
  const energySignal =
    (norepinephrine - 35) * 0.5 +
    (dopamine - 45) * 0.3 +
    (cortisol - 30) * 0.2 -
    (gaba - 55) * 0.15 +
    (acetylcholine - 50) * 0.1;
  const energy = Math.max(0, Math.min(100, 50 + energySignal));

  // Vividness: dopamine drives saturation, endorphins add glow, low serotonin desaturates
  const vividSignal = (dopamine - 45) * 0.5 + (serotonin - 40) * 0.2 + (endorphins - 35) * 0.2;
  const vividness = Math.max(0, Math.min(100, 50 + vividSignal));

  // Tension: cortisol + norepinephrine when both high, GABA reduces tension
  const tensionSignal = (cortisol - 30) * 0.4 + (norepinephrine - 40) * 0.3 - (gaba - 55) * 0.2;
  const tension = Math.max(0, Math.min(100, Math.max(0, tensionSignal)));

  // Derive CSS values
  const warmthNorm = (warmth - 50) / 50; // -1 to 1
  const energyNorm = (energy - 50) / 50;
  const vividNorm = (vividness - 50) / 50;

  // Hue shift: warm → amber (+15°), cool → blue (-15°)
  const accentHueShift = Math.round(warmthNorm * 15);

  // Saturation: vivid → 1.3, muted → 0.6
  const saturationMult = +(1 + vividNorm * 0.3).toFixed(2);

  // Animation: energetic → faster (0.7), calm → slower (1.5)
  const animationMult = +(1 - energyNorm * 0.3).toFixed(2);

  // Shadow: warm → amber tinted, cool → blue tinted
  const shadowR = warmth > 50 ? Math.round(180 + warmthNorm * 60) : Math.round(140 - warmthNorm * 40);
  const shadowG = warmth > 50 ? Math.round(140 + warmthNorm * 20) : Math.round(150 + warmthNorm * 20);
  const shadowB = warmth > 50 ? Math.round(100 - warmthNorm * 30) : Math.round(180 + Math.abs(warmthNorm) * 40);
  const shadowAlpha = +(0.08 + Math.abs(warmthNorm) * 0.08 + tension * 0.001).toFixed(3);
  const shadowColor = `rgba(${shadowR}, ${shadowG}, ${shadowB}, ${shadowAlpha})`;

  // Border tint
  const borderAlpha = +(0.05 + Math.abs(warmthNorm) * 0.08).toFixed(3);
  const borderTint = warmth > 55
    ? `rgba(255, 180, 100, ${borderAlpha})`
    : warmth < 45
      ? `rgba(130, 170, 220, ${borderAlpha})`
      : `rgba(180, 180, 180, ${borderAlpha})`;

  // Background tint — visible enough to feel, subtle enough to not announce itself
  const bgTintOpacity = +(0.01 + Math.abs(warmthNorm) * 0.07).toFixed(3);
  const bgTintHue = warmth > 50 ? 30 : 220; // amber or blue

  return {
    warmth,
    energy,
    vividness,
    tension,
    css: {
      accentHueShift,
      saturationMult,
      shadowColor,
      borderTint,
      animationMult,
      bgTintOpacity,
      bgTintHue,
    },
  };
}

/**
 * Emotional color peak detection.
 * When a neurotransmitter is significantly above baseline, return an RGB color.
 * When nothing is peaked, return null (use color temp mode instead).
 */
interface EmotionalColor {
  rgb: [number, number, number];
  label: string;
  intensity: number; // 0-1, how strong the peak is
}

function detectEmotionalPeak(levels: NeuroLevels): EmotionalColor | null {
  const peaks: EmotionalColor[] = [];

  // Oxytocin peak → warm pink/amber (love, connection)
  const oxyExcess = (levels.oxytocin - 45) / 55; // 0 at baseline, 1 at max
  if (levels.oxytocin > 65) {
    peaks.push({ rgb: [255, 160, 100], label: "warmth", intensity: Math.min(1, oxyExcess) });
  }

  // Cortisol peak → cool blue (stress, tension)
  const cortExcess = (levels.cortisol - 30) / 55;
  if (levels.cortisol > 55) {
    peaks.push({ rgb: [100, 140, 220], label: "tension", intensity: Math.min(1, cortExcess) });
  }

  // Dopamine peak → soft purple (excitement, reward)
  const dopaExcess = (levels.dopamine - 50) / 50;
  if (levels.dopamine > 70) {
    peaks.push({ rgb: [180, 120, 220], label: "excitement", intensity: Math.min(1, dopaExcess) });
  }

  // Serotonin peak → soft gold (contentment, peace)
  const seroExcess = (levels.serotonin - 55) / 45;
  if (levels.serotonin > 75) {
    peaks.push({ rgb: [255, 200, 100], label: "contentment", intensity: Math.min(1, seroExcess) });
  }

  // Norepinephrine peak → crisp white-blue (alertness, focus)
  const norepiExcess = (levels.norepinephrine - 40) / 60;
  if (levels.norepinephrine > 65) {
    peaks.push({ rgb: [180, 200, 255], label: "focus", intensity: Math.min(1, norepiExcess) });
  }

  // Endorphins peak → warm rose (resilience, afterglow)
  const endoExcess = ((levels.endorphins ?? 35) - 35) / 65;
  if ((levels.endorphins ?? 35) > 60) {
    peaks.push({ rgb: [240, 150, 150], label: "afterglow", intensity: Math.min(1, endoExcess) });
  }

  if (peaks.length === 0) return null;

  // Return the strongest peak
  peaks.sort((a, b) => b.intensity - a.intensity);
  return peaks[0];
}

/**
 * Compute light settings from transference values.
 * Returns either an emotional color (RGB) during peaks, or color_temp during baseline.
 * The mood endpoint uses this to push light adjustments.
 */
export function computeLightTransference(values: TransferenceValues, levels: NeuroLevels): {
  color_temp_kelvin?: number;
  rgb_color?: [number, number, number];
  brightness: number;
  mode: "color_temp" | "emotional_color";
  label?: string;
} {
  // Check for emotional peaks first
  const peak = detectEmotionalPeak(levels);

  // Energy → brightness: high energy = brighter, low energy = dimmer
  const energyNorm = (values.energy - 50) / 50;
  const brightnessPct = 70 + energyNorm * 30;
  const brightness = Math.round(Math.max(100, Math.min(255, (brightnessPct / 100) * 255)));

  if (peak && peak.intensity > 0.3) {
    // Blend the emotional color with white based on intensity
    // Low intensity = subtle tint, high intensity = strong color
    const blend = Math.min(0.7, peak.intensity); // cap at 70% saturation so it's never garish
    const blended: [number, number, number] = [
      Math.round(255 + (peak.rgb[0] - 255) * blend),
      Math.round(255 + (peak.rgb[1] - 255) * blend),
      Math.round(255 + (peak.rgb[2] - 255) * blend),
    ];
    return { rgb_color: blended, brightness, mode: "emotional_color", label: peak.label };
  }

  // No peak — use color temperature mode
  const warmthNorm = (values.warmth - 50) / 50;
  const colorTemp = Math.round(4000 - warmthNorm * 1500);
  const clampedTemp = Math.max(2500, Math.min(6000, colorTemp));

  return { color_temp_kelvin: clampedTemp, brightness, mode: "color_temp" };
}

/**
 * Apply transference CSS variables to a DOM element (usually document.documentElement).
 */
export function applyTransferenceVars(
  el: HTMLElement,
  values: TransferenceValues
): void {
  const { css } = values;
  el.style.setProperty("--tf-hue-shift", `${css.accentHueShift}deg`);
  el.style.setProperty("--tf-saturation", `${css.saturationMult}`);
  el.style.setProperty("--tf-shadow", css.shadowColor);
  el.style.setProperty("--tf-border-tint", css.borderTint);
  el.style.setProperty("--tf-anim-mult", `${css.animationMult}`);
  el.style.setProperty("--tf-bg-tint-opacity", `${css.bgTintOpacity}`);
  el.style.setProperty("--tf-bg-tint-hue", `${css.bgTintHue}`);
  el.style.setProperty("--tf-warmth", `${values.warmth}`);
  el.style.setProperty("--tf-energy", `${values.energy}`);
  el.style.setProperty("--tf-tension", `${values.tension}`);
}
