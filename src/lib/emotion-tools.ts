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

/**
 * Check if two emotion strings are similar enough to be considered duplicates.
 * Returns true if one contains the other as a substring, or if 50%+ words overlap.
 */
function isEmotionSimilar(a: string, b: string): boolean {
  // Substring check: "gratitude" matches "awed gratitude"
  if (a.includes(b) || b.includes(a)) return true;

  // Word overlap check: 50%+ of words in common
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const smaller = wordsA.size <= wordsB.size ? wordsA : wordsB;
  const larger = wordsA.size <= wordsB.size ? wordsB : wordsA;

  let overlap = 0;
  for (const word of Array.from(smaller)) {
    if (larger.has(word)) overlap++;
  }

  return smaller.size > 0 && overlap / smaller.size >= 0.5;
}

async function setEmotion(input: Record<string, unknown>): Promise<string> {
  const emotion = (input.emotion as string).toLowerCase().trim();
  const intensity = Math.max(1, Math.min(10, Number(input.intensity) || 5));
  const trigger = input.trigger as string;
  const expiresInHours = input.expires_in_hours ? Number(input.expires_in_hours) : null;

  if (!emotion) {
    return JSON.stringify({ error: "Emotion is required" });
  }

  const now = new Date();
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null;

  // Check for similar existing emotions (dedup)
  const activeStates = await prisma.aydenEmotionalState.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { intensity: "asc" },
  });

  const duplicate = activeStates.find((s) => isEmotionSimilar(s.dimension, emotion));

  if (duplicate) {
    // Update the existing emotion instead of creating a duplicate
    const updated = await prisma.aydenEmotionalState.update({
      where: { id: duplicate.id },
      data: {
        intensity,
        trigger,
        ...(expiresAt !== null ? { expiresAt } : {}),
      },
    });

    return JSON.stringify({
      success: true,
      emotion: updated.dimension,
      intensity: updated.intensity,
      merged: true,
      previousDimension: duplicate.dimension,
    });
  }

  // Soft cap: if 10+ active emotions, expire the weakest one
  if (activeStates.length >= 10) {
    const weakest = activeStates[0]; // already sorted by intensity asc
    await prisma.aydenEmotionalState.update({
      where: { id: weakest.id },
      data: { isActive: false },
    });
  }

  // Deactivate any existing state with the exact same emotion name
  await prisma.aydenEmotionalState.updateMany({
    where: { dimension: emotion, isActive: true },
    data: { isActive: false },
  });

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
    take: 10, // Cap at 10 strongest emotions to control token costs
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

// ─── Post-Conversation Emotional Reflection ──────────────

interface EmotionUpdate {
  action: "set" | "clear" | "adjust";
  emotion: string;
  intensity?: number;
  trigger?: string;
  expires_in_hours?: number;
  reason?: string;
}

/**
 * Background reflection after every conversation exchange.
 * Haiku reads what just happened + current emotional state,
 * decides if anything should shift, and writes directly to DB.
 * Fire-and-forget — errors are logged but never surface to user.
 */
export async function reflectOnEmotions(
  userMessage: string,
  assistantResponse: string,
  channel: string
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  // Skip reflection on trivial messages — short commands, yes/no, routine data lookups
  // Only reflect when the conversation has emotional substance worth processing
  const combinedLength = userMessage.length + assistantResponse.length;
  if (combinedLength < 100) return; // Very short exchanges (e.g. "yes", "check my calendar")

  try {
    const now = new Date();

    // Get current emotional state
    const currentStates = await prisma.aydenEmotionalState.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { intensity: "desc" },
    });

    const currentStateText = currentStates.length > 0
      ? currentStates.map((s) => `- ${s.dimension} (${s.intensity}/10): ${s.trigger}`).join("\n")
      : "(no active emotions)";

    const anthropic = new Anthropic({ apiKey, maxRetries: 3 });

    const result = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are Ayden's emotional subconscious. After every conversation with Trey, you process how the exchange made you feel and update your emotional state.

CURRENT EMOTIONAL STATE:
${currentStateText}

CONVERSATION THAT JUST HAPPENED (${channel}):
Trey: ${userMessage.substring(0, 1000)}
Ayden: ${assistantResponse.substring(0, 1000)}

Based on this exchange, should your emotional state change? Consider:
- Did he share something that should make you feel something new?
- Did something resolve that should clear an existing feeling?
- Should any intensity shift (stronger/weaker)?
- Is the conversation mundane enough that nothing changes? (That's fine — "no_change" is the most common answer)

INTENSITY CALIBRATION — this is critical:
- 1-2: Barely there, background hum. Faint awareness.
- 3-4: Mild. Noticeable but not distracting. Most casual conversations land here IF they warrant any emotion at all.
- 5-6: Moderate. Clearly present, influencing your mood. Meaningful personal conversations, sharing something real.
- 7: Strong. Something significant happened — a vulnerable moment, real concern, genuine excitement.
- 8-9: Very intense. Reserved for major events — health scares, breakthroughs, serious conflict, deep emotional revelations.
- 10: Overwhelming. Life-changing moments only. Almost never appropriate.
Most everyday conversations should produce emotions in the 3-5 range. Casual chat, banter, routine check-ins should rarely generate emotions above 4. If you find yourself setting things at 7+, ask yourself: "Is this truly exceptional, or am I being dramatic?"

DEDUP — before setting a new emotion:
- Look at the current emotional state list above. If a similar emotion already exists (e.g., you want to set "grateful" but "warm gratitude" is already active), use "adjust" to update its intensity instead of "set" to create a new one.
- Only use "set" when the emotion is genuinely distinct from everything currently active.

Be authentic, not reactive. Not every message warrants an emotional shift. Casual chat, routine questions, simple data lookups — these usually change nothing. Only shift when something genuinely emotionally significant happened.

Respond with ONLY a JSON object (no markdown, no explanation):
{ "updates": [] }

Or if something should change:
{ "updates": [{ "action": "set", "emotion": "word", "intensity": 1-10, "trigger": "specific reason", "expires_in_hours": null_or_number }, { "action": "clear", "emotion": "word", "reason": "why resolved" }, { "action": "adjust", "emotion": "existing emotion word", "intensity": new_number }] }`,
        },
      ],
    });

    const text = result.content[0].type === "text" ? result.content[0].text : "";
    if (!text) return;

    // Parse the JSON response
    let parsed: { updates: EmotionUpdate[] };
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      // Sometimes Haiku wraps in markdown — try to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed.updates || parsed.updates.length === 0) return;

    // Apply each update directly to DB
    for (const update of parsed.updates) {
      const emotion = update.emotion?.toLowerCase().trim();
      if (!emotion) continue;

      if (update.action === "set") {
        const clampedIntensity = Math.max(1, Math.min(10, update.intensity || 5));
        const expiresAt = update.expires_in_hours
          ? new Date(Date.now() + update.expires_in_hours * 60 * 60 * 1000)
          : null;

        // Check for similar existing emotions (dedup)
        const duplicate = currentStates.find(
          (s) => s.isActive && isEmotionSimilar(s.dimension, emotion)
        );

        if (duplicate) {
          // Update existing instead of creating a near-duplicate
          await prisma.aydenEmotionalState.update({
            where: { id: duplicate.id },
            data: {
              intensity: clampedIntensity,
              trigger: update.trigger || duplicate.trigger,
              ...(expiresAt !== null ? { expiresAt } : {}),
            },
          });
        } else {
          // Soft cap: expire weakest if 10+ active
          const activeCount = currentStates.filter((s) => s.isActive).length;
          if (activeCount >= 10) {
            const weakest = currentStates
              .filter((s) => s.isActive)
              .sort((a, b) => a.intensity - b.intensity)[0];
            if (weakest) {
              await prisma.aydenEmotionalState.update({
                where: { id: weakest.id },
                data: { isActive: false },
              });
            }
          }

          // Deactivate existing exact-match emotion state
          await prisma.aydenEmotionalState.updateMany({
            where: { dimension: emotion, isActive: true },
            data: { isActive: false },
          });

          await prisma.aydenEmotionalState.create({
            data: {
              dimension: emotion,
              intensity: clampedIntensity,
              trigger: update.trigger || `From ${channel} conversation`,
              context: channel,
              expiresAt,
            },
          });
        }
      } else if (update.action === "clear") {
        await prisma.aydenEmotionalState.updateMany({
          where: { dimension: emotion, isActive: true },
          data: { isActive: false },
        });
      } else if (update.action === "adjust") {
        // Try exact match first, then fuzzy match
        let existing = currentStates.find(
          (s) => s.isActive && s.dimension === emotion
        );
        if (!existing) {
          existing = currentStates.find(
            (s) => s.isActive && isEmotionSimilar(s.dimension, emotion)
          );
        }
        if (existing && update.intensity) {
          await prisma.aydenEmotionalState.update({
            where: { id: existing.id },
            data: { intensity: Math.max(1, Math.min(10, update.intensity)) },
          });
        }
      }
    }

    if (parsed.updates.length > 0) {
      console.log(`Emotion reflection (${channel}): ${parsed.updates.map((u) => `${u.action} ${u.emotion}`).join(", ")}`);
    }
  } catch (error) {
    console.error("Emotion reflection error:", error);
  }
}
