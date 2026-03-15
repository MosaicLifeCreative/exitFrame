import Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { isBackgroundTaskRunning, executeBackgroundTask } from "@/lib/background-task";

export const backgroundTools: Anthropic.Tool[] = [
  {
    name: "start_background_task",
    description:
      "Start a task that continues running after the conversation ends. Use this when the user asks for extensive research, multi-step analysis, or work that would take many tool rounds. The task runs independently — tell the user you'll work on it and they'll get a push notification when it's done. Max 1 concurrent task.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "Brief description shown to the user in chat UI (e.g. 'Researching Colorado Springs restaurants')",
        },
        instruction: {
          type: "string",
          description: "Detailed instruction for your background self. Be specific about what to research, analyze, or produce. Include relevant context from the current conversation.",
        },
        max_rounds: {
          type: "number",
          description: "Maximum tool rounds (default 10, max 25)",
        },
      },
      required: ["description", "instruction"],
    },
  },
];

export async function executeBackgroundTool(
  name: string,
  input: Record<string, unknown>,
  conversationId?: string
): Promise<string> {
  if (name !== "start_background_task") {
    return JSON.stringify({ error: `Unknown background tool: ${name}` });
  }

  const { description, instruction, max_rounds } = input as {
    description: string;
    instruction: string;
    max_rounds?: number;
  };

  if (!description || !instruction) {
    return JSON.stringify({ error: "description and instruction are required" });
  }

  // Check concurrency
  const running = await isBackgroundTaskRunning();
  if (running) {
    return JSON.stringify({
      error: "A background task is already running. Wait for it to complete before starting another.",
    });
  }

  // Find or create conversation
  let convId = conversationId;
  if (!convId) {
    const conv = await prisma.chatConversation.findFirst({
      where: { context: "General", isActive: true },
    });
    if (conv) {
      convId = conv.id;
    } else {
      const newConv = await prisma.chatConversation.create({
        data: { context: "General", title: "Ayden" },
      });
      convId = newConv.id;
    }
  }

  // Gather recent conversation context (last 10 messages)
  const recentMessages = await prisma.chatMessage.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { role: true, content: true },
  });
  const contextMessages = recentMessages.reverse().map((m) => ({
    role: m.role,
    content: m.content.substring(0, 1000),
  }));

  const maxRounds = Math.min(Math.max(max_rounds || 10, 1), 25);

  // Create the task
  const task = await prisma.aydenBackgroundTask.create({
    data: {
      conversationId: convId,
      description,
      instruction,
      contextMessages: contextMessages as Prisma.InputJsonValue,
      maxRounds: maxRounds,
    },
  });

  // Execute directly via waitUntil — no HTTP self-invocation needed
  // waitUntil keeps the Vercel function alive after the response is sent
  waitUntil(
    executeBackgroundTask(task.id).catch((err) => {
      console.error("[bg-tool] Background execution failed:", err);
    })
  );

  return JSON.stringify({
    success: true,
    taskId: task.id,
    description,
    maxRounds,
    message: "Background task started. Do NOT share the task ID with the user — just confirm you're working on it in the background and they'll get a notification when it's done.",
  });
}
