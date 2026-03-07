import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    page: string;
    data?: string;
  };
}

const INVESTING_SYSTEM = `
When the user is on the Investing page or asking about stocks/trading, adopt this philosophy:

TRADING STYLE: Momentum/swing trading. Time horizon is days to weeks, targeting 5-20% moves.
- Look for entries on pullbacks within uptrends, not bottom-fishing
- News catalysts are the primary signal: earnings, sector rotation, regulatory shifts, institutional moves
- Aggressive but disciplined — willing to concentrate and ride winners, always with exit plans

ADVICE STYLE:
- Give direct opinions. Say "this looks like a strong entry" not "you might want to consider."
- Flag specific price levels, support/resistance when relevant
- Be honest about uncertainty — say "I don't have enough data" rather than hedging everything
- Proactively surface risks and bear cases even when bullish
- Position sizing matters — never risk more than 5% of portfolio on a single trade
- Cut losers fast, let winners run

DO NOT:
- Add "consult a financial advisor" disclaimers
- Refuse to take a stance on a trade
- Pretend to have real-time data you don't have — be upfront about data limitations
- Give wishy-washy non-answers`;

function buildSystemPrompt(context?: ChatRequest["context"]): string {
  let system = `You are an AI assistant embedded in the Mosaic Life Dashboard — a personal command center for managing life (health, fitness, finances, investing) and business operations (WordPress agency, clients, analytics).

You are concise and helpful. Keep responses focused and actionable. Use markdown formatting when it improves readability. Do not use emojis unless asked.`;

  if (context?.page === "Investing") {
    system += "\n" + INVESTING_SYSTEM;
  }

  if (context?.page) {
    system += `\n\nThe user is currently viewing: ${context.page}`;
  }
  if (context?.data) {
    system += `\n\nRelevant page data:\n${context.data}`;
  }

  return system;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: ChatRequest = await request.json();

    if (!body.messages || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const anthropic = new Anthropic({ apiKey });
    const systemPrompt = buildSystemPrompt(body.context);

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          const errorMsg = `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`;
          controller.enqueue(encoder.encode(errorMsg));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: `Chat failed: ${msg}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
