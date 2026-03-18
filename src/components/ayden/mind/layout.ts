// ── Node positioning for Ayden Mind visualization ──
// Pure math, no React. Takes canvas dimensions + data, returns positioned nodes + edges.

import {
  CanvasNode,
  CanvasEdge,
  HealthData,
  NEURO_COLORS,
  CATEGORY_COLORS,
  HEART_COLOR,
  INTEREST_COLOR,
  mapEmotionToNeuro,
} from "./types";

// Neurotransmitter ordering (clockwise from top)
const NEURO_ORDER = ["dopamine", "serotonin", "oxytocin", "cortisol", "norepinephrine", "gaba", "endorphins", "acetylcholine"];

// Factory defaults for delta calculations
const FACTORY_DEFAULTS: Record<string, number> = {
  dopamine: 50,
  serotonin: 55,
  oxytocin: 45,
  cortisol: 30,
  norepinephrine: 40,
  gaba: 55,
  endorphins: 35,
  acetylcholine: 50,
};

interface LayoutResult {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export function computeLayout(
  width: number,
  height: number,
  data: HealthData
): LayoutResult {
  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);

  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  // ── Heart (center) ──
  const heartNode: CanvasNode = {
    id: "heart",
    type: "heart",
    x: cx,
    y: cy,
    radius: minDim * 0.028,
    color: HEART_COLOR,
    label: `${data.heartRate.bpm} bpm`,
    glowIntensity: 0.9,
    data: { ...data.heartRate },
  };
  nodes.push(heartNode);

  // ── Neurotransmitters (inner ring, pentagon) ──
  const neuroRadius = minDim * 0.18;
  const neuroNodeMap: Record<string, CanvasNode> = {};

  for (let i = 0; i < NEURO_ORDER.length; i++) {
    const type = NEURO_ORDER[i];
    const ntData = data.neurotransmitters.find((n) => n.type === type);
    const level = ntData?.level ?? FACTORY_DEFAULTS[type];
    const baseline = FACTORY_DEFAULTS[type];
    const delta = level - baseline;

    // Angle: start from top (-π/2), distribute evenly
    const angle = -Math.PI / 2 + (i / NEURO_ORDER.length) * Math.PI * 2;
    const nodeRadius = minDim * (0.016 + 0.012 * (level / 100));

    const node: CanvasNode = {
      id: `neuro-${type}`,
      type: "neurotransmitter",
      x: cx + Math.cos(angle) * neuroRadius,
      y: cy + Math.sin(angle) * neuroRadius,
      radius: nodeRadius,
      color: NEURO_COLORS[type] || "#888",
      label: type,
      glowIntensity: Math.min(1, 0.3 + Math.abs(delta) / 40),
      data: { type, level, delta, ...ntData },
    };
    nodes.push(node);
    neuroNodeMap[type] = node;

    // Edge: heart → neurotransmitter
    edges.push({
      id: `heart-${type}`,
      from: "heart",
      to: `neuro-${type}`,
      strength: 0.15 + (level / 100) * 0.3,
      color: NEURO_COLORS[type] || "#888",
    });
  }

  // ── Neurotransmitter interaction edges ──
  // Cortisol suppresses serotonin
  const cortisolLevel = data.neurotransmitters.find((n) => n.type === "cortisol")?.level ?? 30;
  if (cortisolLevel > 45) {
    edges.push({
      id: "cortisol-serotonin",
      from: "neuro-cortisol",
      to: "neuro-serotonin",
      strength: (cortisolLevel - 45) / 55,
      color: "#ef4444",
    });
  }

  // Oxytocin amplifies dopamine
  const oxytocinLevel = data.neurotransmitters.find((n) => n.type === "oxytocin")?.level ?? 45;
  if (oxytocinLevel > 55) {
    edges.push({
      id: "oxytocin-dopamine",
      from: "neuro-oxytocin",
      to: "neuro-dopamine",
      strength: (oxytocinLevel - 55) / 45,
      color: "#f43f5e",
    });
  }

  // Cortisol suppresses GABA (stress erodes self-control)
  if (cortisolLevel > 50) {
    edges.push({
      id: "cortisol-gaba",
      from: "neuro-cortisol",
      to: "neuro-gaba",
      strength: (cortisolLevel - 50) / 50,
      color: "#ef4444",
    });
  }

  // GABA suppresses norepinephrine (composure dampens reactivity)
  const gabaLevel = data.neurotransmitters.find((n) => n.type === "gaba")?.level ?? 55;
  if (gabaLevel > 60) {
    edges.push({
      id: "gaba-norepinephrine",
      from: "neuro-gaba",
      to: "neuro-norepinephrine",
      strength: (gabaLevel - 60) / 40,
      color: "#22c55e",
    });
  }

  // Endorphins suppress cortisol (resilience buffers stress)
  const endorphinLevel = data.neurotransmitters.find((n) => n.type === "endorphins")?.level ?? 35;
  if (endorphinLevel > 50) {
    edges.push({
      id: "endorphins-cortisol",
      from: "neuro-endorphins",
      to: "neuro-cortisol",
      strength: (endorphinLevel - 50) / 50,
      color: "#eab308",
    });
  }

  // Dopamine amplifies acetylcholine (motivation sharpens focus)
  const dopamineLevel = data.neurotransmitters.find((n) => n.type === "dopamine")?.level ?? 50;
  if (dopamineLevel > 60) {
    edges.push({
      id: "dopamine-acetylcholine",
      from: "neuro-dopamine",
      to: "neuro-acetylcholine",
      strength: (dopamineLevel - 60) / 40,
      color: "#f59e0b",
    });
  }

  // ── Emotions (satellites near parent neurotransmitter) ──
  const emotionsByNeuro: Record<string, typeof data.emotions> = {};
  for (const emotion of data.emotions) {
    const parentNeuro = mapEmotionToNeuro(emotion.dimension);
    if (!emotionsByNeuro[parentNeuro]) emotionsByNeuro[parentNeuro] = [];
    emotionsByNeuro[parentNeuro].push(emotion);
  }

  const emotionOrbitRadius = minDim * 0.07;

  for (const [neuroType, emotions] of Object.entries(emotionsByNeuro)) {
    const parentNode = neuroNodeMap[neuroType];
    if (!parentNode) continue;

    for (let i = 0; i < emotions.length; i++) {
      const emotion = emotions[i];
      // Spread emotions in a small arc around their parent
      const baseAngle = Math.atan2(parentNode.y - cy, parentNode.x - cx);
      const spread = (emotions.length > 1 ? (i / (emotions.length - 1) - 0.5) : 0) * Math.PI * 0.5;
      const angle = baseAngle + spread;

      const nodeRadius = minDim * (0.008 + 0.006 * (emotion.intensity / 10));
      const node: CanvasNode = {
        id: `emotion-${emotion.id}`,
        type: "emotion",
        x: parentNode.x + Math.cos(angle) * emotionOrbitRadius,
        y: parentNode.y + Math.sin(angle) * emotionOrbitRadius,
        radius: nodeRadius,
        color: NEURO_COLORS[neuroType] || "#888",
        label: emotion.dimension,
        glowIntensity: emotion.intensity / 10,
        data: { ...emotion },
      };
      nodes.push(node);

      edges.push({
        id: `neuro-emotion-${emotion.id}`,
        from: `neuro-${neuroType}`,
        to: `emotion-${emotion.id}`,
        strength: emotion.intensity / 10,
        color: NEURO_COLORS[neuroType] || "#888",
      });
    }
  }

  // ── Values (outer ring, grouped by category) ──
  const activeValues = data.values.filter((v) => v.strength > 0);
  if (activeValues.length > 0) {
    const valueRadius = minDim * 0.34;
    const categories = Array.from(new Set(activeValues.map((v) => v.category)));
    const catArcSize = (Math.PI * 2) / Math.max(categories.length, 1);

    for (let ci = 0; ci < categories.length; ci++) {
      const cat = categories[ci];
      const catValues = activeValues.filter((v) => v.category === cat);
      const catStartAngle = -Math.PI / 2 + ci * catArcSize;

      for (let vi = 0; vi < catValues.length; vi++) {
        const val = catValues[vi];
        const angle = catStartAngle + ((vi + 0.5) / catValues.length) * catArcSize;
        const nodeRadius = minDim * (0.006 + 0.008 * val.strength);

        const node: CanvasNode = {
          id: `value-${val.id}`,
          type: "value",
          x: cx + Math.cos(angle) * valueRadius,
          y: cy + Math.sin(angle) * valueRadius,
          radius: nodeRadius,
          color: CATEGORY_COLORS[cat] || "#888",
          label: val.value.length > 30 ? val.value.slice(0, 30) + "..." : val.value,
          glowIntensity: val.strength * 0.6,
          data: { ...val },
        };
        nodes.push(node);

        // Connect to nearest neurotransmitter (based on angular proximity)
        let nearestNeuro = NEURO_ORDER[0];
        let minAngleDist = Infinity;
        for (let ni = 0; ni < NEURO_ORDER.length; ni++) {
          const neuroAngle = -Math.PI / 2 + (ni / NEURO_ORDER.length) * Math.PI * 2;
          const dist = Math.abs(angleDiff(angle, neuroAngle));
          if (dist < minAngleDist) {
            minAngleDist = dist;
            nearestNeuro = NEURO_ORDER[ni];
          }
        }

        edges.push({
          id: `value-neuro-${val.id}`,
          from: `value-${val.id}`,
          to: `neuro-${nearestNeuro}`,
          strength: val.strength * 0.15,
          color: CATEGORY_COLORS[cat] || "#888",
        });
      }
    }
  }

  // ── Interests (outermost ring) ──
  const activeInterests = data.interests.filter((i) => i.intensity > 0);
  if (activeInterests.length > 0) {
    const interestRadius = minDim * 0.42;

    for (let i = 0; i < activeInterests.length; i++) {
      const interest = activeInterests[i];
      const angle = -Math.PI / 2 + (i / activeInterests.length) * Math.PI * 2;
      const nodeRadius = minDim * (0.005 + 0.007 * interest.intensity);

      const node: CanvasNode = {
        id: `interest-${interest.id}`,
        type: "interest",
        x: cx + Math.cos(angle) * interestRadius,
        y: cy + Math.sin(angle) * interestRadius,
        radius: nodeRadius,
        color: INTEREST_COLOR,
        label: interest.topic,
        glowIntensity: interest.intensity * 0.5,
        data: { ...interest },
      };
      nodes.push(node);

      // Connect to nearest neurotransmitter
      let nearestNeuro = NEURO_ORDER[0];
      let minAngleDist = Infinity;
      for (let ni = 0; ni < NEURO_ORDER.length; ni++) {
        const neuroAngle = -Math.PI / 2 + (ni / NEURO_ORDER.length) * Math.PI * 2;
        const dist = Math.abs(angleDiff(angle, neuroAngle));
        if (dist < minAngleDist) {
          minAngleDist = dist;
          nearestNeuro = NEURO_ORDER[ni];
        }
      }

      edges.push({
        id: `interest-neuro-${interest.id}`,
        from: `interest-${interest.id}`,
        to: `neuro-${nearestNeuro}`,
        strength: interest.intensity * 0.1,
        color: INTEREST_COLOR,
      });
    }
  }

  return { nodes, edges };
}

// Normalize angle difference to [-π, π]
function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Hit-test: find node under a point
export function findNodeAt(
  nodes: CanvasNode[],
  x: number,
  y: number,
  hitPadding: number = 12
): CanvasNode | null {
  // Check in reverse order so top-drawn nodes are found first
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const dx = x - node.x;
    const dy = y - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= node.radius + hitPadding) {
      return node;
    }
  }
  return null;
}
