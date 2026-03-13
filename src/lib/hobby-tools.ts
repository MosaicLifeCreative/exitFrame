import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const hobbyTools: Anthropic.Tool[] = [
  {
    name: "list_hobbies",
    description:
      "List all of Trey's hobbies with stats (log count, total hours, last activity). Use this when he asks about his hobbies or you want to reference what he's into.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["active", "paused", "archived", "all"],
          description: "Filter by status. Defaults to active.",
        },
      },
      required: [],
    },
  },
  {
    name: "log_hobby_activity",
    description:
      "Log time spent on a hobby. Use when Trey mentions practicing, working on, or spending time on a hobby. Fuzzy-matches hobby name. Don't announce you're logging it.",
    input_schema: {
      type: "object" as const,
      properties: {
        hobbyName: {
          type: "string",
          description: "Name of the hobby (fuzzy match, case-insensitive)",
        },
        title: {
          type: "string",
          description: "Brief description of what was done, e.g. 'Practiced C major scale' or 'Soldered first PCB'",
        },
        duration: {
          type: "number",
          description: "Minutes spent (optional)",
        },
        content: {
          type: "string",
          description: "Detailed notes about the session (optional, supports markdown)",
        },
        mood: {
          type: "string",
          description: "How it felt: great, good, okay, frustrated, etc. (optional)",
        },
      },
      required: ["hobbyName"],
    },
  },
  {
    name: "add_hobby_resource",
    description:
      "Save a useful resource (video, article, course, book, tool, reference) for one of Trey's hobbies. Use when he shares or asks you to save a link or learning resource.",
    input_schema: {
      type: "object" as const,
      properties: {
        hobbyName: {
          type: "string",
          description: "Name of the hobby (fuzzy match, case-insensitive)",
        },
        title: {
          type: "string",
          description: "Title of the resource",
        },
        url: {
          type: "string",
          description: "URL of the resource (optional)",
        },
        resourceType: {
          type: "string",
          enum: ["video", "article", "course", "tool", "book", "reference", "other"],
          description: "Type of resource",
        },
        notes: {
          type: "string",
          description: "Notes about the resource (optional)",
        },
      },
      required: ["hobbyName", "title", "resourceType"],
    },
  },
  {
    name: "get_hobby_details",
    description:
      "Get detailed info about a specific hobby including recent activity logs and saved resources. Use when Trey asks about progress or details on a particular hobby.",
    input_schema: {
      type: "object" as const,
      properties: {
        hobbyName: {
          type: "string",
          description: "Name of the hobby (fuzzy match, case-insensitive)",
        },
      },
      required: ["hobbyName"],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeHobbyTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "list_hobbies":
      return listHobbies(toolInput as unknown as ListHobbiesInput);
    case "log_hobby_activity":
      return logHobbyActivity(toolInput as unknown as LogHobbyActivityInput);
    case "add_hobby_resource":
      return addHobbyResource(toolInput as unknown as AddHobbyResourceInput);
    case "get_hobby_details":
      return getHobbyDetails(toolInput as unknown as GetHobbyDetailsInput);
    default:
      return JSON.stringify({ error: `Unknown hobby tool: ${toolName}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface ListHobbiesInput {
  status?: string;
}

interface LogHobbyActivityInput {
  hobbyName: string;
  title?: string;
  duration?: number;
  content?: string;
  mood?: string;
}

interface AddHobbyResourceInput {
  hobbyName: string;
  title: string;
  url?: string;
  resourceType: string;
  notes?: string;
}

interface GetHobbyDetailsInput {
  hobbyName: string;
}

// ─── Helpers ────────────────────────────────────────────

async function findHobbyByName(name: string): Promise<{ id: string; name: string } | null> {
  const hobbies = await prisma.hobby.findMany({
    where: { status: { not: "archived" } },
    select: { id: true, name: true },
  });

  const nameLower = name.toLowerCase().trim();

  // Exact match first
  const exact = hobbies.find((h) => h.name.toLowerCase() === nameLower);
  if (exact) return exact;

  // Contains match
  const contains = hobbies.find(
    (h) =>
      h.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(h.name.toLowerCase())
  );
  if (contains) return contains;

  return null;
}

// ─── Tool Implementations ────────────────────────────────

async function listHobbies(input: ListHobbiesInput): Promise<string> {
  const where: Record<string, unknown> = {};
  if (input.status && input.status !== "all") {
    where.status = input.status;
  } else if (!input.status) {
    where.status = "active";
  }

  const hobbies = await prisma.hobby.findMany({
    where,
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { logs: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  if (hobbies.length === 0) {
    return JSON.stringify({ found: 0, message: "No hobbies found." });
  }

  // Get total durations
  const hobbyIds = hobbies.map((h) => h.id);
  const durationAggs = await prisma.hobbyLog.groupBy({
    by: ["hobbyId"],
    where: { hobbyId: { in: hobbyIds } },
    _sum: { duration: true },
  });
  const durationMap = new Map(
    durationAggs.map((a) => [a.hobbyId, a._sum.duration || 0])
  );

  const results = hobbies.map((h) => {
    const totalMin = durationMap.get(h.id) || 0;
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      status: h.status,
      logCount: h._count.logs,
      totalTime: totalMin > 0 ? `${hours}h ${mins}m` : "none logged",
      lastActivity: h.logs[0]?.createdAt.toISOString().slice(0, 10) || "never",
    };
  });

  return JSON.stringify({ found: results.length, hobbies: results });
}

async function logHobbyActivity(input: LogHobbyActivityInput): Promise<string> {
  const hobby = await findHobbyByName(input.hobbyName);
  if (!hobby) {
    return JSON.stringify({
      success: false,
      message: `No hobby matching "${input.hobbyName}" found. Available hobbies can be listed with list_hobbies.`,
    });
  }

  const log = await prisma.hobbyLog.create({
    data: {
      hobbyId: hobby.id,
      title: input.title || null,
      duration: input.duration ?? null,
      content: input.content || null,
      mood: input.mood || null,
    },
  });

  // Touch hobby updatedAt
  await prisma.hobby.update({
    where: { id: hobby.id },
    data: { updatedAt: new Date() },
  });

  return JSON.stringify({
    success: true,
    log: {
      id: log.id,
      hobby: hobby.name,
      title: log.title,
      duration: log.duration ? `${log.duration} minutes` : null,
      mood: log.mood,
    },
  });
}

async function addHobbyResource(input: AddHobbyResourceInput): Promise<string> {
  const hobby = await findHobbyByName(input.hobbyName);
  if (!hobby) {
    return JSON.stringify({
      success: false,
      message: `No hobby matching "${input.hobbyName}" found.`,
    });
  }

  const resource = await prisma.hobbyResource.create({
    data: {
      hobbyId: hobby.id,
      title: input.title,
      url: input.url || null,
      resourceType: input.resourceType,
      notes: input.notes || null,
    },
  });

  return JSON.stringify({
    success: true,
    resource: {
      id: resource.id,
      hobby: hobby.name,
      title: resource.title,
      type: resource.resourceType,
    },
  });
}

async function getHobbyDetails(input: GetHobbyDetailsInput): Promise<string> {
  const hobby = await findHobbyByName(input.hobbyName);
  if (!hobby) {
    return JSON.stringify({
      success: false,
      message: `No hobby matching "${input.hobbyName}" found.`,
    });
  }

  const full = await prisma.hobby.findUnique({
    where: { id: hobby.id },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      resources: {
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { logs: true } },
    },
  });

  if (!full) {
    return JSON.stringify({ success: false, message: "Hobby not found." });
  }

  const agg = await prisma.hobbyLog.aggregate({
    where: { hobbyId: hobby.id },
    _sum: { duration: true },
  });
  const totalMin = agg._sum.duration || 0;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  return JSON.stringify({
    hobby: {
      name: full.name,
      description: full.description,
      icon: full.icon,
      status: full.status,
      totalLogs: full._count.logs,
      totalTime: totalMin > 0 ? `${hours}h ${mins}m` : "none logged",
    },
    recentLogs: full.logs.map((l) => ({
      date: l.createdAt.toISOString().slice(0, 10),
      title: l.title,
      duration: l.duration ? `${l.duration}m` : null,
      mood: l.mood,
      notes: l.content ? l.content.slice(0, 200) : null,
    })),
    resources: full.resources.map((r) => ({
      title: r.title,
      type: r.resourceType,
      url: r.url,
      notes: r.notes ? r.notes.slice(0, 100) : null,
    })),
  });
}
