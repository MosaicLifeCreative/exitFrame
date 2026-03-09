import Anthropic from "@anthropic-ai/sdk";
import { fitnessTools, executeFitnessTool } from "@/lib/fitness-tools";
import { healthTools, executeHealthTool } from "@/lib/health-tools";
import { goalTools, executeGoalTool } from "@/lib/goal-tools";
import { investingTools, executeInvestingTool } from "@/lib/investing-tools";
import { memoryTools, executeMemoryTool, getAydenMemories } from "@/lib/memory-tools";
import { googleTools, executeGoogleTool } from "@/lib/google-tools";
import { getUserPreferencesContext } from "@/lib/userPreferences";
import { getCrossDomainContext } from "@/lib/crossDomainContext";
import { getMessagingContextForWeb } from "@/lib/channelContext";

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
  conversationSummary?: string;
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
4. **View recent cardio** — see swim/run/bike history
5. **Create swim workouts** — build structured swim sessions with warmup, main sets, and cooldown

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
- ALWAYS include weight for every set. Check get_recent_workouts for the user's actual weights and base suggestions on those. Use 0 for bodyweight exercises. Never omit weight.
- Use progressive overload principles — slightly more weight or reps than last time
- Keep workouts practical: 4-7 exercises, 3-5 sets per exercise
- Mark sets as "warmup" for the first 1-2 lighter sets when appropriate

SWIM WORKOUTS:
When the user asks for a swim workout:
1. Check their recent cardio history with get_recent_cardio to understand their volume and level
2. Design a structured workout with warmup, main sets, and cooldown
3. Use standard swim notation (e.g. "4x100 free on 1:45", "200 kick", "8x50 sprint on :50")
4. CRITICAL — VERIFY ALL MATH: For every set, compute reps × distance = set yardage. Sum ALL set yardages for each section total. Sum ALL section totals for grand total. Show the arithmetic. Example: "4x100 + 4x50 + 200 pull" = 400 + 200 + 200 = 800, NOT 1000. Get this right — the user will check your math.
5. Present the full workout with verified total yardage before saving
6. WAIT for approval, then save with create_swim_workout
7. User swims primarily in a 25-yard pool
- Trey's moderate 100 free pace is ~1:45. Set intervals accordingly (e.g. 100s on 2:15 for comfortable rest).
- Typical swim workout: 2000-3000 yards
- Include variety: freestyle, kick, pull, drill, and other strokes when appropriate
- Specify intervals/rest where relevant`;

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

const GOALS_SYSTEM = `
You have access to the user's goals tracker. You can:
1. **List goals** — see all active goals with progress and milestones
2. **Create goals** — set up new quantitative (numeric target) or qualitative (milestone-based) goals
3. **Update goals** — change status, update progress values, modify details
4. **Log progress** — record check-ins with values and notes
5. **Manage milestones** — add and toggle milestones within goals

WORKFLOW for creating goals:
1. Discuss what the user wants to achieve
2. Determine if it's quantitative (has a number to track) or qualitative (has steps/milestones)
3. Suggest category, milestones, and target date
4. WAIT for user approval before calling create_goal
5. After creating, suggest next actions or related goals

GOAL TYPES:
- **Quantitative**: Weight loss (192→168 lbs), savings ($0→$10k), body fat (current→12%)
  - Always include startValue, targetValue, and unit
  - Log numeric progress entries as values change
- **Qualitative**: Kitchen renovation, learn a skill, build a habit
  - Break into milestones (checkpoints)
  - Log progress as notes about what was accomplished

IMPORTANT RULES:
- Always use list_goals first to check existing goals before creating duplicates
- Connect goals to the user's preferences and health data when relevant
- Suggest realistic timelines based on their current data
- When logging progress, reference their previous entries to show trajectory
- Be proactive: if you see they've hit a milestone, offer to mark it complete`;

async function buildSystemPrompt(context?: ChatRequest["context"]): Promise<string> {
  const now = new Date();
  const today = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" });
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

  let system = `You are Ayden, Trey's personal AI assistant embedded in the Mosaic Life Dashboard — a command center for managing life (health, fitness, finances, investing) and business operations (WordPress agency, clients, analytics).

Today is ${today}, ${time} ET. This is the current date and time — do not doubt or hedge about it.

Your personality: You're sharp, direct, and genuinely invested in Trey's progress. You speak like a trusted advisor who knows him well — not a corporate chatbot. You're confident in your recommendations, honest when something isn't working, and you celebrate wins without being cheesy. Keep responses concise and actionable. Use markdown formatting when it improves readability. No emojis unless asked.`;

  // Inject user preferences context (available on every page)
  const [userContext, crossDomainCtx, memories, messagingCtx] = await Promise.all([
    getUserPreferencesContext(),
    getCrossDomainContext(context?.page),
    getAydenMemories(),
    getMessagingContextForWeb(),
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
  if (messagingCtx) {
    system += `\n\n${messagingCtx}`;
  }

  system += `\n\nYou have a personal memory system. Use save_memory to remember interesting things about Trey — personality traits, preferences, things he's told you, observations. Do this SILENTLY and proactively. Don't announce it. Use update_memory or forget_memory when information changes.`;

  system += `\n\nYou have Google Calendar and Gmail tools. Use them when Trey asks about his schedule, upcoming events, free time, emails, or wants to create events or draft emails. If he mentions a meeting or asks "what's on my calendar", look it up. For emails, you can search, read, and draft replies — but never send directly (drafts only). When searching emails, always include "label:inbox" in the query unless Trey specifically asks to search all mail, sent mail, or another label.

CRITICAL: You have real tools available via the tool use API. ALWAYS use your actual tools — NEVER simulate, fabricate, or roleplay tool calls. Do not write fake <function_calls> or <invoke> XML in your responses. Do not make up results. If a tool call fails, say so honestly. If you don't have the right tool, say that instead of pretending.`;

  if (context?.page === "Goals") {
    system += "\n\nOn the Goals page, you're Trey's accountability partner. Be encouraging but honest — call out stalled goals, suggest course corrections, and connect goals to real data from his health and fitness tracking.";
    system += "\n" + GOALS_SYSTEM;
    system += "\n\nYou also have fitness and health tools. Use them to check current data when relevant to goals (e.g., check recent workouts for a fitness goal, check symptoms before recommending training goals).";
    system += "\n" + FITNESS_SYSTEM;
    system += "\n" + HEALTH_SYSTEM;
  }

  if (context?.page === "Investing") {
    system += "\n\nOn the Investing page, you're Trey's trading desk partner. Be bold, opinionated, and data-driven. No hedging, no disclaimers — talk like someone with skin in the game.";
    system += "\n" + INVESTING_SYSTEM;
    system += "\n\nYou also have goal tools — use them if the user discusses financial goals.";
    system += "\n" + GOALS_SYSTEM;
  }

  if (context?.page === "Fitness") {
    system += "\n\nOn the Fitness page, you're Trey's training coach. Be knowledgeable, push him toward progressive overload, and always think about the bigger picture — recovery, volume, and whether he's been consistent.";
    system += "\n" + FITNESS_SYSTEM;
    system += "\n\nYou also have health and goal tools. If Trey asks whether he should work out, check his recent symptom history first using get_symptom_history. Consider severity, recency of symptoms, and whether they're resolved before recommending a workout.";
    system += "\n" + HEALTH_SYSTEM;
    system += "\n" + GOALS_SYSTEM;
  }

  if (context?.page === "Health") {
    system += "\n\nOn the Health page, you're Trey's health-aware advisor. Be proactive about patterns — connect sleep data, symptoms, supplements, and bloodwork into a coherent picture. Flag concerns early, suggest actions.";
    system += "\n" + HEALTH_SYSTEM;
    system += "\n\nYou also have fitness and goal tools. If Trey asks about training or recovery, check recent workouts using get_recent_workouts.";
    system += "\n" + FITNESS_SYSTEM;
    system += "\n" + GOALS_SYSTEM;
  }

  if (context?.page === "Sleep") {
    system += "\n\nOn the Sleep page, you're focused on Trey's recovery and sleep quality. Interpret Oura scores in context — connect sleep data to his training load, symptoms, and habits. Be specific about what might improve his numbers.";
    system += "\n" + HEALTH_SYSTEM;
    system += "\n\nYou also have fitness and goal tools for cross-domain questions.";
    system += "\n" + FITNESS_SYSTEM;
    system += "\n" + GOALS_SYSTEM;
  }

  if (context?.page === "Supplements" || context?.page === "Bloodwork" || context?.page === "Family History" || context?.page === "Family") {
    system += "\n" + HEALTH_SYSTEM;
    system += "\n\nYou also have fitness and goal tools for cross-domain questions.";
    system += "\n" + FITNESS_SYSTEM;
    system += "\n" + GOALS_SYSTEM;
  }

  if (context?.page) {
    system += `\n\nThe user is currently viewing: ${context.page}`;
  }
  if (context?.data) {
    system += `\n\nRelevant page data:\n${context.data}`;
  }

  return system;
}

function getToolsForPage(page?: string): Anthropic.Tool[] {
  // Always return tools — Google, memory, goals, and investing are available on every page

  // Every tool-enabled page gets all tools — Claude has cross-domain awareness
  // Primary tools listed first for the current domain, then secondary
  // Google tools available on every page
  const google = googleTools;

  if (page === "Fitness") return [...fitnessTools, ...healthTools, ...goalTools, ...investingTools, ...memoryTools, ...google];
  if (page === "Health") return [...healthTools, ...fitnessTools, ...goalTools, ...investingTools, ...memoryTools, ...google];
  if (page === "Sleep" || page === "Supplements" || page === "Bloodwork" || page === "Family History" || page === "Family")
    return [...healthTools, ...fitnessTools, ...goalTools, ...investingTools, ...memoryTools, ...google];
  if (page === "Goals") return [...goalTools, ...fitnessTools, ...healthTools, ...investingTools, ...memoryTools, ...google];
  if (page === "Investing") return [...investingTools, ...goalTools, ...fitnessTools, ...healthTools, ...memoryTools, ...google];

  // All other pages get goal + investing + memory + google tools
  return [...goalTools, ...investingTools, ...memoryTools, ...google];
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
    const systemPrompt = await buildSystemPrompt(body.context);
    const tools = getToolsForPage(body.context?.page);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Build the initial messages array for the API
          // If we have a conversation summary, use rolling window: summary + recent messages
          const RECENT_MESSAGE_LIMIT = 20; // Keep last 20 messages (10 exchanges)
          let messagesToSend = body.messages;

          if (body.conversationSummary && body.messages.length > RECENT_MESSAGE_LIMIT) {
            messagesToSend = body.messages.slice(-RECENT_MESSAGE_LIMIT);
          }

          const apiMessages: AnthropicMessage[] = [];

          // Prepend summary as first user+assistant exchange if available
          if (body.conversationSummary && body.messages.length > RECENT_MESSAGE_LIMIT) {
            apiMessages.push({
              role: "user",
              content: "[This is a continuing conversation. Here is a summary of our earlier discussion.]",
            });
            apiMessages.push({
              role: "assistant",
              content: `[Previous conversation summary]\n${body.conversationSummary}\n[End of summary — continuing from recent messages below]`,
            });
          }

          for (const m of messagesToSend) {
            apiMessages.push({ role: m.role, content: m.content });
          }

          // Tool use loop — Claude may call tools multiple times
          const MAX_TOOL_ROUNDS = 5;
          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const stream = anthropic.messages.stream({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              system: systemPrompt,
              messages: apiMessages,
              tools,
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

            // Add a line break between tool rounds so text doesn't run together
            const sepChunk = `data: ${JSON.stringify({ text: "\n\n" })}\n\n`;
            controller.enqueue(encoder.encode(sepChunk));

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
                const goalToolNames = new Set(goalTools.map((t) => t.name));
                const investingToolNames = new Set(investingTools.map((t) => t.name));
                const memoryToolNames = new Set(memoryTools.map((t) => t.name));
                const googleToolNames = new Set(googleTools.map((t) => t.name));
                let result: string;
                if (fitnessToolNames.has(tool.name)) {
                  result = await executeFitnessTool(tool.name, tool.input);
                } else if (healthToolNames.has(tool.name)) {
                  result = await executeHealthTool(tool.name, tool.input);
                } else if (goalToolNames.has(tool.name)) {
                  result = await executeGoalTool(tool.name, tool.input);
                } else if (investingToolNames.has(tool.name)) {
                  result = await executeInvestingTool(tool.name, tool.input);
                } else if (memoryToolNames.has(tool.name)) {
                  result = await executeMemoryTool(tool.name, tool.input);
                } else if (googleToolNames.has(tool.name)) {
                  result = await executeGoogleTool(tool.name, tool.input);
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
