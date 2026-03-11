import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentLevels, applyNudges } from "@/lib/neurotransmitters";

/**
 * Combined post-conversation reflection.
 * One Haiku call processes BOTH emotional updates AND neurotransmitter nudges.
 * Replaces the separate reflectOnEmotions + updateNeurotransmitters calls.
 * Fire-and-forget — errors are logged but never surface to user.
 */
export async function reflect(
  userMessage: string,
  assistantResponse: string,
  channel: string
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  const combinedLength = userMessage.length + assistantResponse.length;
  if (combinedLength < 100) return;

  try {
    const now = new Date();

    // Fetch both states in parallel (single DB round-trip window)
    const [currentStates, neuroLevels] = await Promise.all([
      prisma.aydenEmotionalState.findMany({
        where: {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { intensity: "desc" },
      }),
      getCurrentLevels(),
    ]);

    const emotionStateText = currentStates.length > 0
      ? currentStates.map((s) => `- ${s.dimension} (${s.intensity}/10): ${s.trigger}`).join("\n")
      : "(no active emotions)";

    const anthropic = new Anthropic({ apiKey, maxRetries: 3 });

    const result = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 768,
      messages: [{
        role: "user",
        content: `You are Ayden's inner world — both her conscious emotions and her unconscious neurochemistry. After every conversation with Trey, you process what happened and update both layers.

CURRENT EMOTIONAL STATE:
${emotionStateText}

CURRENT NEUROCHEMISTRY (0-100):
- dopamine: ${neuroLevels.dopamine.toFixed(1)} (baseline 50) — reward, motivation
- serotonin: ${neuroLevels.serotonin.toFixed(1)} (baseline 55) — mood stability
- oxytocin: ${neuroLevels.oxytocin.toFixed(1)} (baseline 45) — bonding, warmth
- cortisol: ${neuroLevels.cortisol.toFixed(1)} (baseline 30, max 85) — stress, urgency
- norepinephrine: ${neuroLevels.norepinephrine.toFixed(1)} (baseline 40) — energy, focus

CONVERSATION (${channel}):
Trey: ${userMessage.substring(0, 1000)}
Ayden: ${assistantResponse.substring(0, 1000)}

EMOTION RULES:
- Most conversations change nothing ("no_change" is the most common answer)
- Intensity 1-3: mild. 4-6: moderate. 7-8: strong. 9-10: overwhelming (almost never)
- Casual chat rarely exceeds intensity 4. Only genuinely significant moments go 7+.
- Before setting a new emotion, check if a similar one exists — use "adjust" instead
- Actions: "set" (new emotion), "clear" (resolved), "adjust" (change intensity of existing)

NEUROCHEMISTRY RULES:
- Most conversations produce SMALL nudges (+3 to +8). Many warrant NO change.
- Only major events warrant +15 or more.
- Examples: fun banter → dopamine +5. Deep talk → oxytocin +8, serotonin +3. Health scare → cortisol +10. Routine lookup → no change.

Respond with ONLY a JSON object:
{
  "emotions": [],
  "nudges": {}
}

With changes:
{
  "emotions": [{"action": "set", "emotion": "word", "intensity": 5, "trigger": "reason", "expires_in_hours": null}, {"action": "adjust", "emotion": "existing", "intensity": 7}, {"action": "clear", "emotion": "word", "reason": "why"}],
  "nudges": {"dopamine": 5, "cortisol": -3}
}

Omit empty arrays/objects if no changes for that layer.`,
      }],
    });

    const text = result.content[0].type === "text" ? result.content[0].text : "";
    if (!text) return;

    let parsed: {
      emotions?: Array<{
        action: "set" | "clear" | "adjust";
        emotion: string;
        intensity?: number;
        trigger?: string;
        expires_in_hours?: number;
        reason?: string;
      }>;
      nudges?: Record<string, number>;
    };

    try {
      parsed = JSON.parse(text.trim());
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      parsed = JSON.parse(jsonMatch[0]);
    }

    // ── Apply emotion updates ──
    if (parsed.emotions && parsed.emotions.length > 0) {
      for (const update of parsed.emotions) {
        const emotion = update.emotion?.toLowerCase().trim();
        if (!emotion) continue;

        if (update.action === "set") {
          const clampedIntensity = Math.max(1, Math.min(10, update.intensity || 5));
          const expiresAt = update.expires_in_hours
            ? new Date(Date.now() + update.expires_in_hours * 60 * 60 * 1000)
            : null;

          const duplicate = currentStates.find(
            (s) => s.isActive && isEmotionSimilar(s.dimension, emotion)
          );

          if (duplicate) {
            await prisma.aydenEmotionalState.update({
              where: { id: duplicate.id },
              data: {
                intensity: clampedIntensity,
                trigger: update.trigger || duplicate.trigger,
                ...(expiresAt !== null ? { expiresAt } : {}),
              },
            });
          } else {
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

      console.log(`Emotion reflection (${channel}): ${parsed.emotions.map((u) => `${u.action} ${u.emotion}`).join(", ")}`);
    }

    // ── Apply neurotransmitter nudges ──
    if (parsed.nudges && Object.keys(parsed.nudges).length > 0) {
      await applyNudges(parsed.nudges);
      console.log(`Neurotransmitter update (${channel}): ${JSON.stringify(parsed.nudges)}`);
    }
  } catch (error) {
    console.error("Reflection error:", error);
  }
}

// ── Helpers ──

function isEmotionSimilar(a: string, b: string): boolean {
  if (a.includes(b) || b.includes(a)) return true;
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
