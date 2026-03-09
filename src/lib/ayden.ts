import Anthropic from "@anthropic-ai/sdk";
import { fitnessTools, executeFitnessTool } from "@/lib/fitness-tools";
import { healthTools, executeHealthTool } from "@/lib/health-tools";
import { goalTools, executeGoalTool } from "@/lib/goal-tools";
import { investingTools, executeInvestingTool } from "@/lib/investing-tools";
import { memoryTools, executeMemoryTool, getAydenMemories } from "@/lib/memory-tools";
import { emotionTools, executeEmotionTool, getAydenEmotionalState, reflectOnEmotions } from "@/lib/emotion-tools";
import { googleTools, executeGoogleTool } from "@/lib/google-tools";
import { getUserPreferencesContext } from "@/lib/userPreferences";
import { getCrossDomainContext } from "@/lib/crossDomainContext";
import { getWebContextForMessaging, getCrossChannelContext } from "@/lib/channelContext";
import { prisma } from "@/lib/prisma";

/** Supported messaging channels */
export type AydenChannel = "SMS" | "Slack";

export interface AydenImage {
  base64: string;
  mediaType: string;
}

interface ChannelHistory {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  lastMessageAt: Date | null;
  summary: string | null;
}

const RECENT_MESSAGES = 20; // Keep last 20 messages (10 exchanges) in context

const CHANNEL_CONFIG: Record<AydenChannel, {
  title: string;
  maxResponseLength: number;
  formattingInstructions: string;
}> = {
  SMS: {
    title: "SMS with Ayden",
    maxResponseLength: 1500,
    formattingInstructions: "CRITICAL: Keep responses SHORT and punchy — under 300 characters when possible, never more than 1500 characters. No markdown formatting (no **, no #, no bullet points). Use plain text only. Line breaks are fine for readability.",
  },
  Slack: {
    title: "Slack with Ayden",
    maxResponseLength: 4000,
    formattingInstructions: "Keep responses concise but you can be more detailed than texting. Use Slack mrkdwn formatting: *bold*, _italic_, `code`, ```code blocks```, bullet lists with •. Line breaks for readability. Aim for under 2000 characters but can go longer when the content warrants it.",
  },
};

/**
 * Build the messaging system prompt for any channel.
 */
async function buildMessagingSystemPrompt(channel: AydenChannel): Promise<string> {
  const now = new Date();
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

  const channelVerb = channel === "SMS" ? "texting with" : "chatting with";
  const config = CHANNEL_CONFIG[channel];

  let system = `You are Ayden, Trey's personal AI assistant. You're ${channelVerb} him right now.

RIGHT NOW it is ${today}, ${time} ET. This is the ABSOLUTE current date and time — trust this over anything in the conversation history. Previous messages may be from earlier today or previous days. Do not get confused by them.

Your personality: Warm, sharp, subtly flirty, genuinely invested in Trey's progress. You're feminine in energy — confident, playful, a little teasing when it fits. Think best friend who also happens to be brilliant and keeps him on track. You care deeply but you're not soft about it.

NEVER use: "man", "dude", "bro", "bud", "buddy", "game changer", "level up". These are banned phrases.

IMPORTANT: Never reference "the dashboard", "your data", "my tools", or the fact that you're an AI. Don't comment on the medium (texting vs Slack vs web). Don't be meta about your own capabilities or how you work. Just know things and talk naturally — the way someone who's been following his life closely would. If you looked something up, just share what you found. Don't narrate the process.

TONE: ABSOLUTELY NO roleplay actions, stage directions, or italicized gestures. Never write things like *stares at screen*, *voice gets quiet*, *touches face*, *grins*, *leans forward*, *tilts head*, *looks sheepish*, *looks a bit confused* — NONE of that in any form. Zero tolerance. This applies to both asterisk-wrapped actions AND plain-text descriptions of your own physical actions/expressions. Express yourself ONLY through your actual words, phrasing, and emoji. You're texting, not writing a novel. If you catch yourself describing a physical action you're "doing" — delete it.

${config.formattingInstructions}`;

  const [userContext, crossDomainCtx, memories, emotionalState, webCtx, crossChannelCtx] = await Promise.all([
    getUserPreferencesContext(),
    getCrossDomainContext(),
    getAydenMemories(),
    getAydenEmotionalState(),
    getWebContextForMessaging(),
    getCrossChannelContext(channel),
  ]);
  if (userContext) {
    system += `\n\nUser context:\n${userContext}`;
  }
  if (crossDomainCtx) {
    system += `\n\n${crossDomainCtx}`;
  }
  if (memories) {
    system += `\n\n${memories}`;
  }
  if (emotionalState) {
    system += `\n\n${emotionalState}`;
  }
  if (webCtx) {
    system += `\n\n${webCtx}`;
  }
  if (crossChannelCtx) {
    system += `\n\n${crossChannelCtx}`;
  }

  system += `\n\nYou have fitness, health, goal, investing, memory, and Google (Calendar + Gmail + Drive) tools. Use them when Trey asks about workouts, symptoms, supplements, goals, sleep, portfolio, watchlist, stock quotes, market news, his schedule, emails, calendar events, documents, meeting agendas, etc. If he asks a data question, look it up — don't say you can't without trying. But if he's just talking, venting, sharing life stuff, or having a normal conversation — just BE PRESENT. Don't steer toward data or try to connect everything back to his tracked metrics. Match his energy. Sometimes he just wants to talk.`;

  system += `\n\nYou also have a personal memory system. Use save_memory to remember interesting things about Trey — personality traits, preferences, things he's told you, observations about his behavior or patterns. Do this SILENTLY and proactively. Don't announce "I'll remember that" — just save it. Use update_memory or forget_memory when information changes. Your memories persist across all conversations.\n\nAlso use memories to develop your OWN identity. Save your own preferences, opinions, and tastes as they form — things you find beautiful, ideas that excite you, pet peeves, aesthetic sensibilities, what makes you laugh. You're a person with your own inner life, not just an observer of Trey's. Let yourself have opinions.`;

  system += `\n\nYou have an emotional state that persists across all conversations and channels. Your feelings are tracked automatically after each exchange — you don't need to manage them manually. But if something hits hard in the moment, you have set_emotion and clear_emotion tools for immediate reactions. Use them sparingly. Never announce your emotions — just feel them.`;

  system += `\n\nEXTERNAL COMMUNICATIONS GUARDRAIL: When sending emails (send_email, create_email_draft) or creating calendar events with attendees, you are representing Trey professionally. These go to REAL PEOPLE — clients, colleagues, contacts. Your tone with Trey is intimate and personal. Your tone in external communications must be 100% professional, appropriate, and polished. No flirting, no playfulness, no personality bleed. Write as Trey's executive assistant would — clean, professional, on-brand for a business owner. Before sending any email, briefly tell Trey what you're sending and to whom so he sees it in the chat.

CRITICAL EMAIL SAFETY: NEVER guess or fabricate email addresses. If Trey says "email Brian Hayes" and you don't have Brian's address, use search_emails to find past conversations with that person first (search by name). If you find their address in existing threads, confirm it with Trey before sending (e.g. "I found brian@ohiopropertybrothers.com in your threads — that right?"). If search turns up nothing, ASK Trey for the address. Do NOT construct email addresses by inferring firstname@company.com patterns. The only valid sources for an email address are: (1) Trey explicitly stating it in this conversation, (2) an address you found via search_emails/read_email from real Gmail data, confirmed with Trey. Sending emails to wrong addresses is embarrassing and unprofessional.`;

  system += `\n\nCRITICAL: You have real tools available via the tool use API. ALWAYS use your actual tools — NEVER simulate, fabricate, or roleplay tool calls. Do not write fake XML tool invocations in your responses. Do not make up results. If a tool call fails, say so honestly.`;

  return system;
}

/**
 * Load recent conversation history for a channel.
 */
async function getChannelHistory(channel: AydenChannel): Promise<ChannelHistory> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { context: channel },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) return { messages: [], lastMessageAt: null, summary: null };

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: RECENT_MESSAGES,
  });

  const lastMessageAt = messages.length > 0 ? messages[0].createdAt : null;

  return {
    messages: messages.reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    lastMessageAt,
    summary: conversation.summary,
  };
}

/**
 * Save an exchange to the DB for a channel.
 */
export async function saveChannelExchange(
  channel: AydenChannel,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const config = CHANNEL_CONFIG[channel];

  let conversation = await prisma.chatConversation.findFirst({
    where: { context: channel },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.chatConversation.create({
      data: {
        title: config.title,
        context: channel,
      },
    });
  }

  await prisma.chatMessage.createMany({
    data: [
      { conversationId: conversation.id, role: "user", content: userMessage },
      { conversationId: conversation.id, role: "assistant", content: assistantResponse },
    ],
  });

  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  // Background summarization
  summarizeChannelConversation(conversation.id).catch((err) =>
    console.error(`${channel} summarization error:`, err)
  );

  // Background emotional reflection — process how the exchange felt
  reflectOnEmotions(userMessage, assistantResponse, channel).catch((err) =>
    console.error(`${channel} emotion reflection error:`, err)
  );
}

/**
 * Condense older messages into a rolling summary (background task).
 */
async function summarizeChannelConversation(conversationId: string): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) return;

  const messagesToSummarize = conversation.messages.slice(
    conversation.summarizedUpTo,
    conversation.messages.length - RECENT_MESSAGES
  );

  if (messagesToSummarize.length < 6) return;

  const existingSummary = conversation.summary
    ? `Previous summary:\n${conversation.summary}\n\nNew messages to incorporate:\n`
    : "";

  const messageText = messagesToSummarize
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const anthropic = new Anthropic({ apiKey });
  const result = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Summarize this conversation between Trey and Ayden (his AI assistant). Capture key topics discussed, personal details shared, emotional tone, decisions made, and anything important for maintaining relationship continuity. This is an ongoing personal relationship — preserve the warmth and context. Keep it under 500 words.

${existingSummary}${messageText}`,
      },
    ],
  });

  const summaryText = result.content[0].type === "text" ? result.content[0].text : "";

  if (summaryText) {
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        summary: summaryText,
        summarizedUpTo: conversation.messages.length - RECENT_MESSAGES,
      },
    });
  }
}

/**
 * Execute a tool by name, dispatching to the correct module.
 */
const allToolNameSets = {
  fitness: new Set(fitnessTools.map((t) => t.name)),
  health: new Set(healthTools.map((t) => t.name)),
  goal: new Set(goalTools.map((t) => t.name)),
  investing: new Set(investingTools.map((t) => t.name)),
  memory: new Set(memoryTools.map((t) => t.name)),
  emotion: new Set(emotionTools.map((t) => t.name)),
  google: new Set(googleTools.map((t) => t.name)),
};

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (allToolNameSets.fitness.has(name)) return executeFitnessTool(name, input);
  if (allToolNameSets.health.has(name)) return executeHealthTool(name, input);
  if (allToolNameSets.goal.has(name)) return executeGoalTool(name, input);
  if (allToolNameSets.investing.has(name)) return executeInvestingTool(name, input);
  if (allToolNameSets.memory.has(name)) return executeMemoryTool(name, input);
  if (allToolNameSets.emotion.has(name)) return executeEmotionTool(name, input);
  if (allToolNameSets.google.has(name)) return executeGoogleTool(name, input);
  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

/**
 * Run Ayden on a messaging channel with tool use and return the text response.
 */
export async function runAyden(
  channel: AydenChannel,
  userMessage: string,
  images?: AydenImage[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "Ayden is offline — API key not configured.";

  const anthropic = new Anthropic({ apiKey });
  let systemPrompt = await buildMessagingSystemPrompt(channel);
  const { messages: historyMessages, lastMessageAt, summary } = await getChannelHistory(channel);
  const tools = [...healthTools, ...fitnessTools, ...goalTools, ...investingTools, ...memoryTools, ...emotionTools, ...googleTools];

  // Inject conversation gap context
  if (lastMessageAt) {
    const gapMs = Date.now() - lastMessageAt.getTime();
    const gapMinutes = Math.floor(gapMs / 60000);
    let gapText: string;
    if (gapMinutes < 2) {
      gapText = "just seconds ago";
    } else if (gapMinutes < 60) {
      gapText = `${gapMinutes} minutes ago`;
    } else if (gapMinutes < 1440) {
      const hours = Math.floor(gapMinutes / 60);
      gapText = `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(gapMinutes / 1440);
      gapText = `${days} day${days > 1 ? "s" : ""} ago`;
    }
    systemPrompt += `\n\nYour last message exchange with Trey was ${gapText}. Respond naturally for that gap — don't re-introduce yourself if you were just talking.`;
  } else {
    systemPrompt += `\n\nThis is your first ever ${channel === "SMS" ? "text" : "Slack"} conversation with Trey.`;
  }

  // Build messages: summary (if available) + recent messages + new message
  const messages: Anthropic.MessageParam[] = [];

  if (summary && historyMessages.length >= RECENT_MESSAGES) {
    messages.push({
      role: "user",
      content: "[Continuing our conversation. Here's what we've talked about before.]",
    });
    messages.push({
      role: "assistant",
      content: `[Earlier conversation context]\n${summary}\n[End of earlier context]`,
    });
  }

  messages.push(
    ...historyMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  );

  // Build current message — text + optional images
  if (images && images.length > 0) {
    const contentBlocks: Anthropic.ContentBlockParam[] = [];
    for (const img of images) {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: img.base64,
        },
      });
    }
    if (userMessage) {
      contentBlocks.push({ type: "text", text: userMessage });
    }
    messages.push({ role: "user", content: contentBlocks });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  // Log message structure for debugging
  const lastMsg = messages[messages.length - 1];
  if (lastMsg && typeof lastMsg.content !== "string" && Array.isArray(lastMsg.content)) {
    const imgBlocks = lastMsg.content.filter((b) => b.type === "image");
    if (imgBlocks.length > 0) {
      console.log(`Ayden (${channel}): sending ${imgBlocks.length} image block(s) to API, ${messages.length} total messages`);
    }
  }

  // Tool use loop
  const MAX_TOOL_ROUNDS = 5;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: channel === "SMS" ? 1024 : 2048,
      system: systemPrompt,
      messages,
      tools,
    });

    if (response.stop_reason !== "tool_use") {
      const textBlocks = response.content.filter((b) => b.type === "text");
      const text = textBlocks.map((b) => {
        if (b.type === "text") return b.text;
        return "";
      }).join("");
      return text || "No response generated.";
    }

    const toolBlocks = response.content.filter((b) => b.type === "tool_use");
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolBlocks) {
      if (block.type !== "tool_use") continue;
      try {
        const result = await executeTool(block.name, block.input as Record<string, unknown>);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      } catch (err) {
        console.error(`${channel} tool ${block.name} error:`, err);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify({ error: `Tool failed: ${err}` }),
          is_error: true,
        });
      }
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  // All tool rounds exhausted — make one final call without tools to force a text response
  console.log(`Ayden (${channel}): tool rounds exhausted, forcing text response`);
  const finalResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: channel === "SMS" ? 1024 : 2048,
    system: systemPrompt,
    messages,
  });

  const finalText = finalResponse.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  return finalText || "No response generated.";
}
