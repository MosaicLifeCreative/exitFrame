import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { validateTwilioSignature, isAuthorizedSender, sendSms } from "@/lib/twilio";
import { fitnessTools, executeFitnessTool } from "@/lib/fitness-tools";
import { healthTools, executeHealthTool } from "@/lib/health-tools";
import { goalTools, executeGoalTool } from "@/lib/goal-tools";
import { getUserPreferencesContext } from "@/lib/userPreferences";
import { getCrossDomainContext } from "@/lib/crossDomainContext";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// SMS has a 1600 character limit per message. Twilio auto-segments longer messages
// but we should keep responses concise for SMS context.
const SMS_MAX_LENGTH = 1500;

/**
 * Build a compact system prompt for SMS context.
 * Similar to the chat route but optimized for short SMS responses.
 */
async function buildSmsSystemPrompt(): Promise<string> {
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

  let system = `You are Ayden, Trey's personal AI assistant. Trey is texting you via SMS.

Today is ${today}, ${time} ET.

Your personality: Sharp, direct, genuinely invested in Trey's progress. You speak like a trusted advisor — not a corporate chatbot.

CRITICAL: You are responding via SMS. Keep responses SHORT and punchy — under 300 characters when possible, never more than 1500 characters. No markdown formatting (no **, no #, no bullet points). Use plain text only. Line breaks are fine for readability.

You have full access to Trey's dashboard data and tools (fitness, health, goals). Use them when relevant. If Trey asks about his data, check it and give a concise answer.`;

  const [userContext, crossDomainCtx] = await Promise.all([
    getUserPreferencesContext(),
    getCrossDomainContext(),
  ]);
  if (userContext) {
    system += `\n\nUser context:\n${userContext}`;
  }
  if (crossDomainCtx) {
    system += `\n\n${crossDomainCtx}`;
  }

  // SMS gets all tools — health + fitness + goals
  system += `\n\nYou have fitness, health, and goal tools. Use them to answer questions about workouts, symptoms, supplements, goals, sleep, etc. When using tools, still keep your final response SMS-short.`;

  return system;
}

/**
 * Load recent SMS conversation history from the DB for context continuity.
 */
async function getRecentSmsHistory(): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  // Find or use the SMS conversation
  const conversation = await prisma.chatConversation.findFirst({
    where: { context: "SMS" },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) return [];

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 10, // Last 5 exchanges
  });

  return messages
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

/**
 * Save an SMS exchange to the DB for history.
 */
async function saveSmsExchange(userMessage: string, assistantResponse: string): Promise<void> {
  // Find or create the SMS conversation
  let conversation = await prisma.chatConversation.findFirst({
    where: { context: "SMS" },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.chatConversation.create({
      data: {
        title: "SMS with Ayden",
        context: "SMS",
      },
    });
  }

  // Save both messages
  await prisma.chatMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: userMessage,
      },
      {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantResponse,
      },
    ],
  });

  // Update conversation timestamp
  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });
}

/**
 * Run Ayden with tool use (non-streaming) and return the text response.
 */
async function runAyden(userMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "Ayden is offline — API key not configured.";

  const anthropic = new Anthropic({ apiKey });
  const systemPrompt = await buildSmsSystemPrompt();
  const history = await getRecentSmsHistory();
  const tools = [...healthTools, ...fitnessTools, ...goalTools];

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  // Tool use loop — same pattern as chat route but non-streaming
  const MAX_TOOL_ROUNDS = 3; // Fewer rounds for SMS (keep it fast)
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024, // Shorter for SMS
      system: systemPrompt,
      messages,
      tools,
    });

    // If no tool use, extract text and return
    if (response.stop_reason !== "tool_use") {
      const textBlocks = response.content.filter((b) => b.type === "text");
      const text = textBlocks.map((b) => {
        if (b.type === "text") return b.text;
        return "";
      }).join("");
      return text || "No response generated.";
    }

    // Execute tools
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolBlocks) {
      if (block.type !== "tool_use") continue;
      try {
        const fitnessToolNames = new Set(fitnessTools.map((t) => t.name));
        const healthToolNames = new Set(healthTools.map((t) => t.name));
        const goalToolNames = new Set(goalTools.map((t) => t.name));
        const input = block.input as Record<string, unknown>;
        let result: string;

        if (fitnessToolNames.has(block.name)) {
          result = await executeFitnessTool(block.name, input);
        } else if (healthToolNames.has(block.name)) {
          result = await executeHealthTool(block.name, input);
        } else if (goalToolNames.has(block.name)) {
          result = await executeGoalTool(block.name, input);
        } else {
          result = JSON.stringify({ error: `Unknown tool: ${block.name}` });
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      } catch (err) {
        console.error(`SMS tool ${block.name} error:`, err);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify({ error: `Tool failed: ${err}` }),
          is_error: true,
        });
      }
    }

    // Add assistant response and tool results to messages for next round
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return "Took too long processing — try a simpler question.";
}

/**
 * POST handler for Twilio SMS webhook.
 * Twilio sends form-urlencoded POST with From, To, Body, etc.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the form-urlencoded body
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const from = params.From || "";
    const body = params.Body || "";

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === "production") {
      const signature = request.headers.get("X-Twilio-Signature") || "";
      const url = request.url;

      if (!validateTwilioSignature(url, params, signature)) {
        console.error("Twilio webhook: invalid signature");
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Only respond to Trey's number
    if (!isAuthorizedSender(from)) {
      console.log(`Twilio webhook: unauthorized sender ${from}`);
      // Return TwiML with no response (don't reveal we exist)
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Empty message — ignore
    if (!body.trim()) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    console.log(`SMS from Trey: "${body.substring(0, 50)}..."`);

    // Run through Ayden
    const response = await runAyden(body);

    // Truncate if needed
    const smsResponse = response.length > SMS_MAX_LENGTH
      ? response.substring(0, SMS_MAX_LENGTH - 3) + "..."
      : response;

    // Save the exchange to DB
    await saveSmsExchange(body, smsResponse);

    // Send response via API (more reliable than TwiML for long messages)
    await sendSms(smsResponse);

    // Return empty TwiML (we already sent the response via API)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("Twilio webhook error:", error);

    // Try to send an error message via SMS
    try {
      await sendSms("Something went wrong on my end. Try again in a sec.");
    } catch {
      // Can't even send error SMS — just log
    }

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
