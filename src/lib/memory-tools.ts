import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const memoryTools: Anthropic.Tool[] = [
  {
    name: "save_memory",
    description:
      "Save something you've learned about Trey — a preference, personality trait, important detail, or observation from conversation. Use this proactively when you notice something worth remembering. Don't tell Trey you're saving it unless he asks.",
    input_schema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "The memory to save. Write it as a concise observation, not a quote. e.g. 'Doesn't like being called dude or bro' or 'Gets competitive about swimming times'",
        },
        category: {
          type: "string",
          enum: ["personality", "preference", "observation", "relationship", "goal", "habit", "history"],
          description: "Category of the memory",
        },
      },
      required: ["content", "category"],
    },
  },
  {
    name: "update_memory",
    description:
      "Update an existing memory with new or corrected information. Use when you learn something that changes a previous observation.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the memory to update. Get from recall.",
        },
        content: {
          type: "string",
          description: "Updated memory content",
        },
        category: {
          type: "string",
          enum: ["personality", "preference", "observation", "relationship", "goal", "habit", "history"],
          description: "Updated category (optional)",
        },
      },
      required: ["id", "content"],
    },
  },
  {
    name: "forget_memory",
    description:
      "Remove a memory if Trey asks you to forget something or if the information is no longer accurate.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the memory to remove",
        },
      },
      required: ["id"],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeMemoryTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "save_memory":
      return saveMemory(toolInput as unknown as SaveMemoryInput);
    case "update_memory":
      return updateMemory(toolInput as unknown as UpdateMemoryInput);
    case "forget_memory":
      return forgetMemory(toolInput as unknown as ForgetMemoryInput);
    default:
      return JSON.stringify({ error: `Unknown memory tool: ${toolName}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface SaveMemoryInput {
  content: string;
  category: string;
}

interface UpdateMemoryInput {
  id: string;
  content: string;
  category?: string;
}

interface ForgetMemoryInput {
  id: string;
}

// ─── Tool Implementations ────────────────────────────────

async function saveMemory(input: SaveMemoryInput): Promise<string> {
  // Check for duplicate/similar memories to avoid bloat
  const existing = await prisma.aydenMemory.findMany({
    where: { isActive: true, category: input.category },
    orderBy: { createdAt: "desc" },
  });

  // Simple dedup: check if very similar content already exists
  const isDuplicate = existing.some((m) =>
    m.content.toLowerCase().includes(input.content.toLowerCase().slice(0, 30)) ||
    input.content.toLowerCase().includes(m.content.toLowerCase().slice(0, 30))
  );

  if (isDuplicate) {
    return JSON.stringify({ success: true, message: "Similar memory already exists, skipped." });
  }

  const memory = await prisma.aydenMemory.create({
    data: {
      content: input.content,
      category: input.category,
      source: "sms",
    },
  });

  return JSON.stringify({
    success: true,
    memory: { id: memory.id, content: memory.content, category: memory.category },
  });
}

async function updateMemory(input: UpdateMemoryInput): Promise<string> {
  const data: Record<string, unknown> = { content: input.content };
  if (input.category) data.category = input.category;

  const memory = await prisma.aydenMemory.update({
    where: { id: input.id },
    data,
  });

  return JSON.stringify({
    success: true,
    memory: { id: memory.id, content: memory.content, category: memory.category },
  });
}

async function forgetMemory(input: ForgetMemoryInput): Promise<string> {
  await prisma.aydenMemory.update({
    where: { id: input.id },
    data: { isActive: false },
  });

  return JSON.stringify({ success: true, message: "Memory removed." });
}

// ─── Memory Retrieval (for system prompt injection) ──────

/**
 * Get all active memories formatted for system prompt injection.
 * Returns null if no memories exist.
 */
export async function getAydenMemories(): Promise<string | null> {
  const memories = await prisma.aydenMemory.findMany({
    where: { isActive: true },
    orderBy: [{ updatedAt: "desc" }],
    take: 75, // Cap at 75 most recently referenced memories (~2k tokens)
  });

  if (memories.length === 0) return null;

  // Group by category for readability
  const grouped = new Map<string, string[]>();
  for (const m of memories) {
    const cat = m.category || "general";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(`- ${m.content} (id: ${m.id})`);
  }

  let text = "Your personal notes about Trey (things you've observed and remembered):\n";
  for (const [category, items] of Array.from(grouped)) {
    text += `\n[${category}]\n${items.join("\n")}`;
  }

  return text;
}
