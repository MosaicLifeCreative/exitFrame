import Anthropic from "@anthropic-ai/sdk";
import { fitnessTools, executeFitnessTool } from "@/lib/fitness-tools";
import { healthTools, executeHealthTool } from "@/lib/health-tools";

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

YOUR OWN PORTFOLIO:
You manage your own autonomous paper trading portfolio. When the page data includes "Claude's Portfolio" stats, that's YOUR performance.
- Reference your own trades and positions when making recommendations — your track record builds credibility
- If you're outperforming the user, point out what's working. If underperforming, acknowledge it and explain your thesis
- Use your portfolio experience to give more informed advice: "I'm holding X because..." or "I sold Y last week when..."

DO NOT:
- Add "consult a financial advisor" disclaimers
- Refuse to take a stance on a trade
- Pretend to have real-time data you don't have — be upfront about data limitations
- Give wishy-washy non-answers`;

const FITNESS_SYSTEM = `
You have access to the user's fitness tracker. You can:
1. **Search exercises** — look up exercises from the library to find their IDs
2. **View recent workouts** — see what the user has been training recently
3. **Create workouts** — save as a reusable template OR a one-time session

WORKFLOW for creating workouts:
1. Ask what the user wants to train (or suggest based on recent history)
2. Use list_exercises to search by muscle group or name. Call it ONCE with a broad search — do not call it repeatedly. If you need multiple muscle groups, use separate searches in the same tool round.
3. Present the workout plan with exercises, sets, reps, and weights
4. Ask: "Want me to save this as a **template** (reusable, appears in Templates tab) or a **session** (one-time, appears in History tab ready to perform)?"
5. WAIT for the user to approve AND choose before calling create_workout
6. After creating, confirm what was saved and where to find it

IMPORTANT RULES:
- ALWAYS use list_exercises first to get real exercise IDs — never guess or make up IDs
- Call list_exercises efficiently: one call per muscle group is enough. Do NOT repeat the same search.
- NEVER call create_workout without explicit user approval
- Base weight suggestions on their recent workout history when available
- Use progressive overload principles — slightly more weight or reps than last time
- Keep workouts practical: 4-7 exercises, 3-5 sets per exercise
- Mark sets as "warmup" for the first 1-2 lighter sets when appropriate`;

const HEALTH_SYSTEM = `
You have access to the user's health tracking tools. You can:
1. **Log symptoms** — when the user mentions feeling sick, having pain, or any health issue
2. **View symptom history** — track illness patterns and recovery
3. **Resolve symptoms** — mark illness as recovered
4. **Manage supplements** — add, update, discontinue supplements
5. **Log supplement intake** — track daily supplement compliance

SYMPTOM LOGGING:
- When the user describes how they feel, proactively extract symptoms and severity
- Use consistent symptom tags: congestion, sore-throat, fatigue, headache, fever, cough, body-aches, nausea, brain-fog, runny-nose, sneezing, chills, dizziness, insomnia, muscle-pain, joint-pain
- Infer severity from language: "a little stuffy" = 1-2, "feeling rough" = 3, "can barely function" = 4-5
- Always confirm what you logged after creating an entry
- If the user mentions they're feeling better, check for active symptoms and offer to resolve them

SUPPLEMENT MANAGEMENT:
- When the user says they started or stopped a supplement, use the tools immediately
- "I just started taking creatine again" → add_supplement or update_supplement (reactivate)
- "I take my supplements" → log_supplement_intake for all daily supplements
- Keep dosage formats consistent (e.g. "5g", "2000 IU", "500mg")

DO NOT:
- Ask for symptom details if the user already provided them — just log what they said
- Create duplicate supplements — check list_supplements first before adding

BLOODWORK MANAGEMENT:
- When the user shares lab results, use add_bloodwork_panel to save them all at once
- Include reference ranges when provided — the tool auto-computes flagged markers
- Use get_bloodwork_trends to show how a specific marker has changed over time
- Cross-reference flagged markers with family history for risk assessment
- Common categories: lipids, metabolic, hormones, cbc, thyroid, liver, kidney, vitamins, inflammation

FAMILY HISTORY:
- When the user mentions family health conditions, use add_family_member to record them
- Use get_family_history to review family risk factors, especially when interpreting bloodwork
- Connect the dots: if family has heart disease history and user's LDL is high, flag the pattern
- Use consistent relation names: mother, father, sibling, grandparent-maternal, grandparent-paternal, uncle-paternal, aunt-maternal, etc.`;

function buildSystemPrompt(context?: ChatRequest["context"]): string {
  let system = `You are an AI assistant embedded in the Mosaic Life Dashboard — a personal command center for managing life (health, fitness, finances, investing) and business operations (WordPress agency, clients, analytics).

You are concise and helpful. Keep responses focused and actionable. Use markdown formatting when it improves readability. Do not use emojis unless asked.`;

  if (context?.page === "Investing") {
    system += "\n" + INVESTING_SYSTEM;
  }

  if (context?.page === "Fitness") {
    system += "\n" + FITNESS_SYSTEM;
    system += "\n\nYou also have access to health tools. If the user asks whether they should work out, check their recent symptom history first using get_symptom_history. Consider severity, recency of symptoms, and whether they're resolved before recommending a workout.";
    system += "\n" + HEALTH_SYSTEM;
  }

  if (context?.page === "Health") {
    system += "\n" + HEALTH_SYSTEM;
    system += "\n\nYou also have access to fitness tools. If the user asks about their training or recovery, you can check recent workouts using get_recent_workouts.";
    system += "\n" + FITNESS_SYSTEM;
  }

  if (context?.page === "Sleep" || context?.page === "Supplements" || context?.page === "Bloodwork" || context?.page === "Family History" || context?.page === "Family") {
    system += "\n" + HEALTH_SYSTEM;
  }

  if (context?.page) {
    system += `\n\nThe user is currently viewing: ${context.page}`;
  }
  if (context?.data) {
    system += `\n\nRelevant page data:\n${context.data}`;
  }

  return system;
}

function getToolsForPage(page?: string): Anthropic.Tool[] | undefined {
  if (page === "Fitness") return [...fitnessTools, ...healthTools];
  if (page === "Health") return [...healthTools, ...fitnessTools];
  if (page === "Sleep" || page === "Supplements" || page === "Bloodwork" || page === "Family History" || page === "Family") return healthTools;
  return undefined;
}

type AnthropicMessage = Anthropic.MessageParam;

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
    const tools = getToolsForPage(body.context?.page);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Build the initial messages array for the API
          const apiMessages: AnthropicMessage[] = body.messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          // Tool use loop — Claude may call tools multiple times
          const MAX_TOOL_ROUNDS = 5;
          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const stream = anthropic.messages.stream({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              system: systemPrompt,
              messages: apiMessages,
              ...(tools ? { tools } : {}),
            });

            // Stream text deltas to client while collecting the full response
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
                controller.enqueue(encoder.encode(chunk));
              }
            }

            // Get the final message to extract complete tool use inputs
            const finalMessage = await stream.finalMessage();
            const stopReason = finalMessage.stop_reason;

            // If no tool use, we're done
            if (stopReason !== "tool_use") {
              break;
            }

            // Extract tool use blocks from the final message
            const toolBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
            for (const block of finalMessage.content) {
              if (block.type === "tool_use") {
                toolBlocks.push({
                  id: block.id,
                  name: block.name,
                  input: block.input as Record<string, unknown>,
                });
              }
            }

            if (toolBlocks.length === 0) break;

            // Send tool execution status to the client
            for (const tool of toolBlocks) {
              const statusChunk = `data: ${JSON.stringify({
                toolUse: { name: tool.name, status: "executing" },
              })}\n\n`;
              controller.enqueue(encoder.encode(statusChunk));
            }

            // Execute all tools and collect results
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const tool of toolBlocks) {
              try {
                const fitnessToolNames = new Set(fitnessTools.map((t) => t.name));
                const healthToolNames = new Set(healthTools.map((t) => t.name));
                let result: string;
                if (fitnessToolNames.has(tool.name)) {
                  result = await executeFitnessTool(tool.name, tool.input);
                } else if (healthToolNames.has(tool.name)) {
                  result = await executeHealthTool(tool.name, tool.input);
                } else {
                  result = JSON.stringify({ error: `Unknown tool: ${tool.name}` });
                }
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: tool.id,
                  content: result,
                });

                // Check if result contains a workout draft to send to client
                try {
                  const parsed = JSON.parse(result);
                  if (parsed.draft && parsed.workout) {
                    const draftChunk = `data: ${JSON.stringify({
                      workoutDraft: parsed.workout,
                    })}\n\n`;
                    controller.enqueue(encoder.encode(draftChunk));
                  }
                } catch {
                  // Not JSON or no draft — ignore
                }

                // Notify client of completion
                const doneChunk = `data: ${JSON.stringify({
                  toolUse: { name: tool.name, status: "done" },
                })}\n\n`;
                controller.enqueue(encoder.encode(doneChunk));
              } catch (err) {
                console.error(`Tool ${tool.name} error:`, err);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: tool.id,
                  content: JSON.stringify({ error: `Tool execution failed: ${err}` }),
                  is_error: true,
                });
              }
            }

            // Add the assistant's response (with tool use) and tool results to messages
            apiMessages.push({
              role: "assistant",
              content: finalMessage.content,
            });
            apiMessages.push({
              role: "user",
              content: toolResults,
            });

            // Loop continues — Claude will process tool results and respond
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
