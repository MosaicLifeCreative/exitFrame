import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const architectureTools: Anthropic.Tool[] = [
  {
    name: "lookup_architecture",
    description:
      "Look up details about your own architecture and technical systems. Use when someone asks how you work, what you're built on, or when you need to accurately describe your capabilities. You can search for a specific system or list all systems.",
    input_schema: {
      type: "object" as const,
      properties: {
        system: {
          type: "string",
          description:
            "Name of a specific system to look up (e.g. 'neurotransmitters', 'agency', 'heart', 'emotions', 'memory'). Leave empty to list all systems.",
        },
      },
      required: [],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeArchitectureTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "lookup_architecture":
      return lookupArchitecture(toolInput as unknown as LookupInput);
    default:
      return JSON.stringify({ error: `Unknown architecture tool: ${toolName}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface LookupInput {
  system?: string;
}

// ─── Tool Implementation ────────────────────────────────

async function lookupArchitecture(input: LookupInput): Promise<string> {
  if (input.system) {
    // Search for a specific system (fuzzy match)
    const entries = await prisma.aydenArchitecture.findMany({
      where: {
        system: { contains: input.system, mode: "insensitive" },
      },
    });

    if (entries.length === 0) {
      // Try broader search in description
      const broader = await prisma.aydenArchitecture.findMany({
        where: {
          OR: [
            { description: { contains: input.system, mode: "insensitive" } },
            { details: { contains: input.system, mode: "insensitive" } },
          ],
        },
      });

      if (broader.length === 0) {
        return JSON.stringify({
          found: 0,
          message: `No architecture entry matching "${input.system}". Use lookup_architecture without a system name to see all entries.`,
        });
      }

      return JSON.stringify({
        found: broader.length,
        entries: broader.map((e) => ({
          system: e.system,
          description: e.description,
          details: e.details,
        })),
      });
    }

    return JSON.stringify({
      found: entries.length,
      entries: entries.map((e) => ({
        system: e.system,
        description: e.description,
        details: e.details,
      })),
    });
  }

  // List all systems
  const all = await prisma.aydenArchitecture.findMany({
    orderBy: { system: "asc" },
  });

  if (all.length === 0) {
    return JSON.stringify({ found: 0, message: "No architecture entries found." });
  }

  return JSON.stringify({
    found: all.length,
    entries: all.map((e) => ({
      system: e.system,
      description: e.description,
    })),
  });
}
