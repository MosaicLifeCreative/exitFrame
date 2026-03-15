import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const dnaTools: Anthropic.Tool[] = [
  {
    name: "lookup_dna",
    description:
      "Look up your own genetic traits — your immutable personality genome. These are the traits you were born with and cannot change. You can query by category (cognitive, emotional, social, motivational, aesthetic) or get your full genome. Each trait is a spectrum value 0.0-1.0 with low/high labels describing the poles. The 'expression' modifier (set by environmental pressure over time) adjusts how strongly each trait manifests.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description:
            "Filter by category: 'cognitive', 'emotional', 'social', 'motivational', 'aesthetic'. Leave empty for full genome.",
        },
      },
      required: [],
    },
  },
  {
    name: "lookup_trey_facts",
    description:
      "Look up objective facts about Trey — structured data like DOB, height, family, fitness stats, professional info. Use this instead of relying on memory for factual data. You can query by category (personal, physical, fitness, diet, family, professional, hobbies, preferences) or search by key.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description:
            "Filter by category. Leave empty to get all facts.",
        },
        key: {
          type: "string",
          description:
            "Search for a specific fact by key (e.g. 'date_of_birth', 'height_inches'). Takes priority over category if both provided.",
        },
      },
      required: [],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeDnaTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "lookup_dna":
      return lookupDna(toolInput as { category?: string });
    case "lookup_trey_facts":
      return lookupTreyFacts(toolInput as { category?: string; key?: string });
    default:
      return JSON.stringify({ error: `Unknown DNA tool: ${toolName}` });
  }
}

// ─── Tool Implementations ──────────────────────────────

async function lookupDna(input: { category?: string }): Promise<string> {
  const where = input.category
    ? { category: { equals: input.category, mode: "insensitive" as const } }
    : {};

  const genes = await prisma.aydenDna.findMany({
    where,
    orderBy: [{ category: "asc" }, { trait: "asc" }],
  });

  if (genes.length === 0) {
    return JSON.stringify({
      found: 0,
      message: input.category
        ? `No genes in category "${input.category}". Valid categories: cognitive, emotional, social, motivational, aesthetic.`
        : "No DNA records found.",
    });
  }

  return JSON.stringify({
    found: genes.length,
    genes: genes.map((g) => ({
      category: g.category,
      trait: g.trait,
      value: g.value,
      phenotype: Math.min(2, Math.max(0, g.value * g.expression)),
      lowLabel: g.lowLabel,
      highLabel: g.highLabel,
      expression: g.expression,
    })),
  });
}

async function lookupTreyFacts(input: { category?: string; key?: string }): Promise<string> {
  if (input.key) {
    const fact = await prisma.treyFact.findUnique({
      where: { key: input.key },
    });

    if (!fact) {
      // Fuzzy search
      const fuzzy = await prisma.treyFact.findMany({
        where: {
          OR: [
            { key: { contains: input.key, mode: "insensitive" } },
            { value: { contains: input.key, mode: "insensitive" } },
          ],
        },
      });

      if (fuzzy.length === 0) {
        return JSON.stringify({
          found: 0,
          message: `No fact matching "${input.key}". Use lookup_trey_facts without a key to see all facts.`,
        });
      }

      return JSON.stringify({
        found: fuzzy.length,
        facts: fuzzy.map((f) => ({
          category: f.category,
          key: f.key,
          value: f.value,
          detail: f.detail,
        })),
      });
    }

    return JSON.stringify({
      found: 1,
      facts: [{
        category: fact.category,
        key: fact.key,
        value: fact.value,
        detail: fact.detail,
      }],
    });
  }

  const where = input.category
    ? { category: { equals: input.category, mode: "insensitive" as const } }
    : {};

  const facts = await prisma.treyFact.findMany({
    where,
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return JSON.stringify({
    found: facts.length,
    facts: facts.map((f) => ({
      category: f.category,
      key: f.key,
      value: f.value,
      detail: f.detail,
    })),
  });
}

// ─── DNA Prompt (for system prompt injection) ───────────

export async function getDnaPrompt(): Promise<string> {
  const genes = await prisma.aydenDna.findMany({
    orderBy: [{ category: "asc" }, { trait: "asc" }],
  });

  if (genes.length === 0) return "";

  const lines = genes.map((g) => {
    const phenotype = Math.min(2, Math.max(0, g.value * g.expression));
    const position =
      phenotype < 0.3
        ? g.lowLabel
        : phenotype > 0.7
          ? g.highLabel
          : `balanced (${g.lowLabel} ↔ ${g.highLabel})`;
    return `  ${g.trait}: ${phenotype.toFixed(2)} → ${position}`;
  });

  return `DNA (your immutable genome — this is who you are):\n${lines.join("\n")}`;
}
