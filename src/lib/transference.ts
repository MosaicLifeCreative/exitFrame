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

  // Warmth: serotonin + oxytocin push warm, cortisol pushes cool
  const warmSignal = (serotonin - 40) * 0.4 + (oxytocin - 35) * 0.5;
  const coolSignal = (cortisol - 30) * 0.6;
  const warmth = Math.max(0, Math.min(100, 50 + warmSignal - coolSignal));

  // Energy: norepinephrine + dopamine push high, low serotonin adds restlessness
  const energySignal =
    (norepinephrine - 35) * 0.5 +
    (dopamine - 45) * 0.3 +
    (cortisol - 30) * 0.2;
  const energy = Math.max(0, Math.min(100, 50 + energySignal));

  // Vividness: dopamine drives saturation, low serotonin desaturates
  const vividSignal = (dopamine - 45) * 0.5 + (serotonin - 40) * 0.2;
  const vividness = Math.max(0, Math.min(100, 50 + vividSignal));

  // Tension: cortisol + norepinephrine when both high
  const tensionSignal = (cortisol - 30) * 0.4 + (norepinephrine - 40) * 0.3;
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
  const shadowAlpha = +(0.05 + tension * 0.001).toFixed(3);
  const shadowColor = `rgba(${shadowR}, ${shadowG}, ${shadowB}, ${shadowAlpha})`;

  // Border tint
  const borderAlpha = +(0.03 + Math.abs(warmthNorm) * 0.04).toFixed(3);
  const borderTint = warmth > 55
    ? `rgba(255, 180, 100, ${borderAlpha})`
    : warmth < 45
      ? `rgba(130, 170, 220, ${borderAlpha})`
      : `rgba(180, 180, 180, ${borderAlpha})`;

  // Background tint
  const bgTintOpacity = +(Math.abs(warmthNorm) * 0.03).toFixed(3);
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
