import Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { buildMessagingSystemPrompt, executeTool } from "@/lib/ayden";
import { sendPushNotification } from "@/lib/push";
import { fitnessTools } from "@/lib/fitness-tools";
import { healthTools } from "@/lib/health-tools";
import { goalTools } from "@/lib/goal-tools";
import { investingTools } from "@/lib/investing-tools";
import { tradingTools } from "@/lib/trading-tools";
import { memoryTools } from "@/lib/memory-tools";
import { emotionTools } from "@/lib/emotion-tools";
import { googleTools } from "@/lib/google-tools";
import { webTools } from "@/lib/web-tools";
import { weatherTools } from "@/lib/weather-tools";
import { taskTools } from "@/lib/task-tools";
import { travelTools } from "@/lib/travel-tools";
import { peopleTools } from "@/lib/people-tools";
import { noteTools } from "@/lib/note-tools";
import { hobbyTools } from "@/lib/hobby-tools";
import { emailTools } from "@/lib/email-tools";
import { agencyTools } from "@/lib/agency-tools";
import { architectureTools } from "@/lib/architecture-tools";
import { dnaTools } from "@/lib/dna-tools";

const REDIS_LOCK_KEY = "bg-task:running";
const LOCK_TTL_SECONDS = 180;
const SAFETY_TIMER_MS = 170_000; // 170s — leaves 10s buffer before Vercel's 180s limit

// All chat tools MINUS start_background_task (prevent recursion)
function getBackgroundTools(): Anthropic.Tool[] {
  return [
    ...fitnessTools, ...healthTools, ...goalTools, ...investingTools,
    ...tradingTools, ...memoryTools, ...emotionTools, ...googleTools,
    ...webTools, ...weatherTools, ...taskTools, ...travelTools,
    ...peopleTools, ...noteTools, ...hobbyTools, ...emailTools,
    ...agencyTools, ...architectureTools, ...dnaTools,
  ];
}

export async function acquireBackgroundLock(taskId: string): Promise<boolean> {
  const result = await redis.set(REDIS_LOCK_KEY, taskId, { nx: true, ex: LOCK_TTL_SECONDS });
  return result === "OK";
}

export async function releaseBackgroundLock(): Promise<void> {
  await redis.del(REDIS_LOCK_KEY);
}

export async function isBackgroundTaskRunning(): Promise<boolean> {
  const val = await redis.get(REDIS_LOCK_KEY);
  return val !== null;
}

export async function executeBackgroundTask(taskId: string): Promise<void> {
  // Load task
  const task = await prisma.aydenBackgroundTask.findUnique({
    where: { id: taskId },
  });
  if (!task || task.status !== "pending") {
    console.log(`[bg-task] Task ${taskId} not found or not pending (status: ${task?.status})`);
    return;
  }

  // Acquire lock
  const locked = await acquireBackgroundLock(taskId);
  if (!locked) {
    await prisma.aydenBackgroundTask.update({
      where: { id: taskId },
      data: { status: "failed", error: "Another background task is already running" },
    });
    return;
  }

  // Mark running
  await prisma.aydenBackgroundTask.update({
    where: { id: taskId },
    data: { status: "running", startedAt: new Date() },
  });

  const anthropic = new Anthropic();
  const tools = getBackgroundTools();
  const toolNameSet = new Set(tools.map((t) => t.name));

  // Build system prompt using Ayden's full personality + context
  const { staticPrompt, dynamicPrompt } = await buildMessagingSystemPrompt("General");
  const system = `${staticPrompt}\n\n${dynamicPrompt}\n\nBACKGROUND TASK MODE: You are working on a background task that Trey requested. He may not be watching — complete the work thoroughly and provide a clear summary when done. Use as many tool rounds as needed (up to ${task.maxRounds}). Be thorough but efficient.`;

  // Build messages: inject context messages then the instruction
  const contextMsgs = (task.contextMessages as Array<{ role: string; content: string }>) || [];
  const messages: Anthropic.MessageParam[] = [];

  // Add recent conversation context
  for (const msg of contextMsgs) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Ensure messages alternate properly — add the instruction as final user message
  if (messages.length > 0 && messages[messages.length - 1].role === "user") {
    // Merge with last user message
    messages[messages.length - 1] = {
      role: "user",
      content: `${(messages[messages.length - 1].content as string)}\n\n---\nBACKGROUND TASK: ${task.instruction}`,
    };
  } else {
    messages.push({ role: "user", content: `BACKGROUND TASK: ${task.instruction}` });
  }

  // Safety timer
  let timedOut = false;
  let finalText = "";
  const toolCallLog: { name: string; input: unknown; output: string }[] = [];
  let roundCount = 0;

  const safetyTimer = setTimeout(async () => {
    timedOut = true;
    console.log(`[bg-task] Task ${taskId} timed out at 170s`);
  }, SAFETY_TIMER_MS);

  try {
    // Agentic loop
    for (let round = 0; round < task.maxRounds; round++) {
      if (timedOut) break;

      // Check if task was cancelled
      const current = await prisma.aydenBackgroundTask.findUnique({
        where: { id: taskId },
        select: { status: true },
      });
      if (current?.status !== "running") {
        console.log(`[bg-task] Task ${taskId} no longer running (${current?.status}), stopping`);
        break;
      }

      roundCount = round + 1;

      let response: Anthropic.Message;
      try {
        response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system,
          messages,
          tools,
        });
      } catch (err) {
        console.error(`[bg-task] API error round ${round}:`, err);
        break;
      }

      // Extract text
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      if (textBlocks.length > 0) {
        finalText = textBlocks.map((b) => b.text).join("\n");
      }

      // If no tool use, done
      if (response.stop_reason !== "tool_use") break;

      // Execute tools
      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tool of toolBlocks) {
        if (timedOut) break;
        if (!toolNameSet.has(tool.name)) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: "Tool not available in background mode",
            is_error: true,
          });
          continue;
        }
        try {
          const result = await executeTool(tool.name, tool.input as Record<string, unknown>);
          toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result });
          toolCallLog.push({ name: tool.name, input: tool.input, output: result.substring(0, 2000) });
          console.log(`[bg-task] Used tool: ${tool.name}`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: `Error: ${errMsg}`,
            is_error: true,
          });
          toolCallLog.push({ name: tool.name, input: tool.input, output: `Error: ${errMsg}` });
        }
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      // Update progress in DB
      await prisma.aydenBackgroundTask.update({
        where: { id: taskId },
        data: {
          rounds: roundCount,
          toolCalls: toolCallLog as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // Save final result
    const status = timedOut ? "timed_out" : "completed";
    const resultText = finalText || "Task completed but no summary was generated.";

    await prisma.aydenBackgroundTask.update({
      where: { id: taskId },
      data: {
        status,
        result: resultText,
        rounds: roundCount,
        toolCalls: toolCallLog as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    // Save result as chat message
    await prisma.chatMessage.create({
      data: {
        conversationId: task.conversationId,
        role: "assistant",
        content: `[Background Task Complete] ${task.description}\n\n${resultText}`,
      },
    });
    await prisma.chatConversation.update({
      where: { id: task.conversationId },
      data: { updatedAt: new Date() },
    });

    // Push notification
    await sendPushNotification({
      title: timedOut ? "Ayden's task timed out" : "Ayden finished a background task",
      body: `${task.description}: ${resultText.substring(0, 180)}`,
      tag: "ayden-background-task",
      url: "/dashboard/chat",
    });

    console.log(`[bg-task] Task ${taskId} ${status} after ${roundCount} rounds`);
  } catch (err) {
    console.error(`[bg-task] Task ${taskId} failed:`, err);
    const errMsg = err instanceof Error ? err.message : String(err);

    await prisma.aydenBackgroundTask.update({
      where: { id: taskId },
      data: {
        status: "failed",
        error: errMsg,
        result: finalText || null,
        rounds: roundCount,
        toolCalls: toolCallLog as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    // Save error to chat
    await prisma.chatMessage.create({
      data: {
        conversationId: task.conversationId,
        role: "assistant",
        content: `[Background Task Failed] ${task.description}\n\nError: ${errMsg}${finalText ? `\n\nPartial result: ${finalText}` : ""}`,
      },
    });
    await prisma.chatConversation.update({
      where: { id: task.conversationId },
      data: { updatedAt: new Date() },
    });

    await sendPushNotification({
      title: "Ayden's background task failed",
      body: `${task.description}: ${errMsg.substring(0, 180)}`,
      tag: "ayden-background-task",
      url: "/dashboard/chat",
    });
  } finally {
    clearTimeout(safetyTimer);
    await releaseBackgroundLock();
  }
}
