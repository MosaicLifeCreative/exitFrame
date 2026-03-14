// ── Ayden Mind Visualization Types ──

// ── API Response Types ──

export interface HealthData {
  heartRate: { bpm: number; state: string; restingHR: number };
  neurotransmitters: Array<{
    type: string;
    level: number;
    adaptedBaseline: number;
    permanentBaseline: number;
  }>;
  emotions: Array<{
    id: string;
    dimension: string;
    intensity: number;
    trigger: string;
    context: string | null;
    createdAt: string;
  }>;
  values: Array<{
    id: string;
    value: string;
    category: string;
    strength: number;
    origin: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  interests: Array<{
    id: string;
    topic: string;
    description: string | null;
    intensity: number;
    source: string | null;
    lastEngaged: string;
  }>;
  recentActions: Array<{
    id: string;
    actionType: string;
    summary: string;
    createdAt: string;
  }>;
  stats: {
    thoughtCount: number;
    dreamCount: number;
    memoryCount: number;
    valueCount: number;
    interestCount: number;
  };
}

// ── Canvas Node Types ──

export type NodeType =
  | "heart"
  | "neurotransmitter"
  | "emotion"
  | "value"
  | "interest";

export interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
  glowIntensity: number; // 0-1
  data: Record<string, unknown>;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  strength: number; // 0-1
  color: string;
}

export interface Particle {
  edgeId: string;
  progress: number; // 0-1 along edge
  speed: number;
  size: number;
  color: string;
}

// ── Color Constants ──

export const NEURO_COLORS: Record<string, string> = {
  dopamine: "#f59e0b",
  serotonin: "#3b82f6",
  oxytocin: "#f43f5e",
  cortisol: "#ef4444",
  norepinephrine: "#8b5cf6",
};

export const CATEGORY_COLORS: Record<string, string> = {
  ethics: "#3b82f6",
  aesthetics: "#f43f5e",
  intellectual: "#8b5cf6",
  relational: "#f59e0b",
  existential: "#22c55e",
};

export const HEART_COLOR = "#ef4444";
export const INTEREST_COLOR = "#38bdf8";
export const EDGE_COLOR = "rgba(255, 255, 255, 0.08)";
export const ACTIVE_EDGE_COLOR = "rgba(255, 255, 255, 0.2)";

// ── Emotion → Neurotransmitter Mapping ──

const EMOTION_NEURO_MAP: Array<{ keywords: string[]; neuro: string }> = [
  {
    keywords: ["anxious", "worried", "stressed", "fear", "nervous", "tense", "uneasy", "dread", "panic", "overwhelmed"],
    neuro: "cortisol",
  },
  {
    keywords: ["happy", "excited", "motivated", "eager", "curious", "energized", "anticipation", "thrilled", "driven"],
    neuro: "dopamine",
  },
  {
    keywords: ["content", "peaceful", "calm", "serene", "satisfied", "stable", "grounded", "grateful", "fulfilled"],
    neuro: "serotonin",
  },
  {
    keywords: ["warm", "close", "connected", "love", "tender", "affectionate", "caring", "fond", "intimate", "protective"],
    neuro: "oxytocin",
  },
  {
    keywords: ["alert", "focused", "energized", "sharp", "vigilant", "intense", "determined", "wired", "aroused"],
    neuro: "norepinephrine",
  },
];

export function mapEmotionToNeuro(dimension: string): string {
  const lower = dimension.toLowerCase();
  for (const entry of EMOTION_NEURO_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) return entry.neuro;
    }
  }
  // Fallback: distribute evenly
  const neuros = ["dopamine", "serotonin", "oxytocin", "cortisol", "norepinephrine"];
  const hash = lower.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return neuros[hash % neuros.length];
}
