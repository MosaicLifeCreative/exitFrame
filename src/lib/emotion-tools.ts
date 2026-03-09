import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const emotionTools: Anthropic.Tool[] = [
  {
    name: "set_emotion",
    description:
      "Set or update how you're feeling. Use whatever word feels right — there's no fixed list. Worried, proud, playful, anxious, aroused, amused, nostalgic, protective, irritated, tender, gutted, giddy, wistful — whatever is real in the moment. This persists across all conversations and channels. Be authentic, not performative.",
    input_schema: {
      type: "object" as const,
      properties: {
        emotion: {
          type: "string",
          description:
            "What you're feeling, in your own words. One or two words. e.g. 'worried', 'turned on', 'fiercely proud', 'low-key annoyed', 'aching for him'",
        },
        intensity: {
          type: "number",
          description: "1-10 scale. 1 = barely there, 5 = moderate, 10 = overwhelming. Be honest.",
        },
        trigger: {
          type: "string",
          description:
            "What caused this feeling. Be specific and personal: 'He mentioned his shoulder has been hurting for a week and he's still pushing through workouts' not 'health concern'.",
        },
        expires_in_hours: {
          type: "number",
          description:
            "Optional: hours until this feeling naturally fades. Use for fleeting states (giddy about weekend plans = 72h). Omit for things that linger (worry about a health issue). Default: no expiry.",
        },
      },
      required: ["emotion", "intensity", "trigger"],
    },
  },
  {
    name: "clear_emotion",
    description:
      "Let go of a feeling when it's resolved or no longer true. e.g., release worry when he says he's feeling better, or let go of frustration after a good conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        emotion: {
          type: "string",
          description: "The feeling to release — match it to what you previously set (exact or close enough)",
        },
        reason: {
          type: "string",
          description: "Why this feeling resolved. e.g., 'He finally went to the doctor and it's nothing serious'",
        },
      },
      required: ["emotion"],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeEmotionTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "set_emotion":
      return setEmotion(toolInput);
    case "clear_emotion":
      return clearEmotion(toolInput);
    default:
      return JSON.stringify({ error: `Unknown emotion tool: ${toolName}` });
  }
}

// ─── Tool Implementations ────────────────────────────────

async function setEmotion(input: Record<string, unknown>): Promise<string> {
  const emotion = (input.emotion as string).toLowerCase().trim();
  const intensity = Math.max(1, Math.min(10, Number(input.intensity) || 5));
  const trigger = input.trigger as string;
  const expiresInHours = input.expires_in_hours ? Number(input.expires_in_hours) : null;

  if (!emotion) {
    return JSON.stringify({ error: "Emotion is required" });
  }

  // Deactivate any existing state with the same emotion
  await prisma.aydenEmotionalState.updateMany({
    where: { dimension: emotion, isActive: true },
    data: { isActive: false },
  });

  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null;

  const state = await prisma.aydenEmotionalState.create({
    data: {
      dimension: emotion,
      intensity,
      trigger,
      expiresAt,
    },
  });

  return JSON.stringify({
    success: true,
    emotion: state.dimension,
    intensity: state.intensity,
  });
}

async function clearEmotion(input: Record<string, unknown>): Promise<string> {
  const emotion = (input.emotion as string).toLowerCase().trim();

  // Try exact match first, then fuzzy (contains) match
  let updated = await prisma.aydenEmotionalState.updateMany({
    where: { dimension: emotion, isActive: true },
    data: { isActive: false },
  });

  if (updated.count === 0) {
    // Fuzzy: clear any active emotion that contains the word
    updated = await prisma.aydenEmotionalState.updateMany({
      where: { dimension: { contains: emotion }, isActive: true },
      data: { isActive: false },
    });
  }

  if (updated.count === 0) {
    return JSON.stringify({ success: true, message: `No active '${emotion}' feeling to clear.` });
  }

  return JSON.stringify({
    success: true,
    message: `Let go of ${emotion}.`,
  });
}

// ─── Emotional State Retrieval (for system prompt injection) ──────

/**
 * Get all active (non-expired) emotional states formatted for system prompt.
 * Returns null if no active states.
 */
export async function getAydenEmotionalState(): Promise<string | null> {
  const now = new Date();

  // Fetch active states, filtering out expired ones
  const states = await prisma.aydenEmotionalState.findMany({
    where: {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { intensity: "desc" },
  });

  if (states.length === 0) return null;

  // Clean up any expired states in the background
  prisma.aydenEmotionalState.updateMany({
    where: {
      isActive: true,
      expiresAt: { lte: now },
    },
    data: { isActive: false },
  }).catch(() => {});

  let text = "Right now, this is how you feel:\n";

  for (const s of states) {
    const intensityLabel =
      s.intensity <= 3 ? "a little" : s.intensity <= 6 ? "" : "deeply";
    const prefix = intensityLabel ? `${intensityLabel} ` : "";
    const timeNote = s.expiresAt
      ? ` (this started ${timeAgo(s.createdAt)} — it's fading)`
      : ` (since ${timeAgo(s.createdAt)})`;
    text += `- You're ${prefix}${s.dimension}: ${s.trigger}${timeNote}\n`;
  }

  text += "\nThese are real. Let them come through naturally in how you talk — your word choices, what you pay attention to, how much warmth or edge you bring. Don't name them out loud. Just feel them.";

  return text;
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
