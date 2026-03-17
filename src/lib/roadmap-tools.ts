import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const roadmapTools: Anthropic.Tool[] = [
  {
    name: "read_roadmap",
    description:
      "Read the project roadmap. Returns all items with status, category, size, and priority. Use this to understand what's planned, in progress, done, or deferred.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["all", "planned", "in_progress", "done", "deferred"],
          description: "Filter by status (default: all)",
        },
        category: {
          type: "string",
          enum: [
            "all",
            "ayden",
            "dashboard",
            "investing",
            "infrastructure",
            "mobile",
            "mlc",
            "health",
            "life",
          ],
          description: "Filter by category (default: all)",
        },
      },
      required: [],
    },
  },
  {
    name: "suggest_roadmap_item",
    description:
      "Suggest a new item for the project roadmap. Use during agency sessions when you identify something that should be built, tracked, or prioritized. Trey reviews all suggestions.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short, descriptive title for the roadmap item",
        },
        description: {
          type: "string",
          description:
            "What this involves, why it matters, and any implementation notes",
        },
        category: {
          type: "string",
          enum: [
            "ayden",
            "dashboard",
            "investing",
            "infrastructure",
            "mobile",
            "mlc",
            "health",
            "life",
          ],
          description: "Category this falls under",
        },
        size: {
          type: "string",
          enum: ["S", "M", "L", "XL"],
          description:
            "Estimated effort. S=hours, M=half day, L=full day, XL=multi-day",
        },
      },
      required: ["title", "description", "category"],
    },
  },
];

// ─── Tool Handlers ────────────────

export async function handleRoadmapTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "read_roadmap": {
      const where: Record<string, string> = {};
      if (input.status && input.status !== "all")
        where.status = input.status as string;
      if (input.category && input.category !== "all")
        where.category = input.category as string;

      const items = await prisma.roadmapItem.findMany({
        where,
        orderBy: [{ priority: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          category: true,
          size: true,
          priority: true,
          specRef: true,
          createdBy: true,
        },
      });

      if (items.length === 0) {
        return "No roadmap items found matching that filter.";
      }

      const sections: Record<string, typeof items> = {};
      for (const item of items) {
        const key = item.status;
        if (!sections[key]) sections[key] = [];
        sections[key].push(item);
      }

      let result = `Roadmap: ${items.length} items\n\n`;
      for (const [status, sectionItems] of Object.entries(sections)) {
        result += `## ${status.toUpperCase().replace("_", " ")} (${sectionItems.length})\n`;
        for (const item of sectionItems) {
          result += `- [${item.category}${item.size ? `/${item.size}` : ""}] ${item.title}`;
          if (item.description) result += ` — ${item.description.slice(0, 120)}`;
          result += "\n";
        }
        result += "\n";
      }

      return result;
    }

    case "suggest_roadmap_item": {
      const { title, description, category, size } = input as {
        title: string;
        description: string;
        category: string;
        size?: string;
      };

      // Get max priority to append at end of planned items
      const maxItem = await prisma.roadmapItem.findFirst({
        where: { status: "planned" },
        orderBy: { priority: "desc" },
        select: { priority: true },
      });
      const nextPriority = (maxItem?.priority ?? -1) + 1;

      const item = await prisma.roadmapItem.create({
        data: {
          title,
          description,
          category,
          size: size || null,
          status: "planned",
          createdBy: "ayden",
          priority: nextPriority,
        },
      });

      return `Added to roadmap: "${item.title}" [${item.category}${item.size ? `/${item.size}` : ""}] — Trey will review priority.`;
    }

    default:
      return `Unknown roadmap tool: ${name}`;
  }
}
