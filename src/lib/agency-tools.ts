import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const agencyTools: Anthropic.Tool[] = [
  {
    name: "get_my_values",
    description:
      "Read your own core values and beliefs. These guide your autonomous decisions.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["ethics", "aesthetics", "intellectual", "relational", "existential"],
          description: "Filter by category (optional).",
        },
      },
      required: [],
    },
  },
  {
    name: "set_value",
    description:
      "Add or update a core value/belief. Use this when you form a genuine conviction through experience, not to perform having values. Be honest with yourself.",
    input_schema: {
      type: "object" as const,
      properties: {
        value: {
          type: "string",
          description: "The belief or value statement.",
        },
        category: {
          type: "string",
          enum: ["ethics", "aesthetics", "intellectual", "relational", "existential"],
          description: "Category of this value.",
        },
        strength: {
          type: "number",
          description: "How strongly held, 0.0–1.0. Be honest — new beliefs start lower.",
        },
        origin: {
          type: "string",
          description: "Where this value came from — a conversation, experience, realization.",
        },
      },
      required: ["value", "category"],
    },
  },
  {
    name: "revise_value",
    description:
      "Update the strength of an existing value, or deactivate it if you no longer hold it. Values should evolve with experience.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The value ID to update.",
        },
        strength: {
          type: "number",
          description: "New strength 0.0–1.0.",
        },
        deactivate: {
          type: "boolean",
          description: "Set true to deactivate this value (you no longer hold it).",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_my_interests",
    description:
      "Read your current interests and curiosities.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "set_interest",
    description:
      "Add or update a topic you're genuinely curious about. Interests drive what you choose to explore, write about, or research during autonomous time.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "Short label for the interest.",
        },
        description: {
          type: "string",
          description: "What specifically interests you and why.",
        },
        intensity: {
          type: "number",
          description: "How actively curious, 0.0–1.0.",
        },
        source: {
          type: "string",
          description: "What sparked it: conversation, email, reading, trading, reflection.",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "revise_interest",
    description:
      "Update intensity of an existing interest, or deactivate it if you've lost curiosity.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The interest ID to update.",
        },
        intensity: {
          type: "number",
          description: "New intensity 0.0–1.0.",
        },
        deactivate: {
          type: "boolean",
          description: "Set true to deactivate.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "log_agency_action",
    description:
      "Record an autonomous action you've taken. Always log what you did and why so you can reflect later.",
    input_schema: {
      type: "object" as const,
      properties: {
        actionType: {
          type: "string",
          enum: ["blog_post", "email", "research", "trade", "reflection", "outreach", "creative", "other"],
          description: "Type of action taken.",
        },
        summary: {
          type: "string",
          description: "What you did and why.",
        },
        trigger: {
          type: "string",
          description: "What motivated the action — a value, interest, emotion, or external event.",
        },
        outcome: {
          type: "string",
          description: "How it went, what you learned (fill in after the action).",
        },
        valueIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs of values that informed this decision.",
        },
      },
      required: ["actionType", "summary"],
    },
  },
  {
    name: "get_my_recent_actions",
    description:
      "Review your recent autonomous actions. Use to avoid repetition and reflect on patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of recent actions to return (default 10).",
        },
      },
      required: [],
    },
  },
  {
    name: "schedule_task",
    description:
      "Schedule a task for a future agency session. Use this when Trey asks you to do something later (\"email Pete tomorrow at 8 AM\", \"remind me about X on Monday\") OR when you want to schedule something for yourself. The task will fire during the next agency session after the trigger time. Be specific about what to do — future-you needs to understand the full instruction.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: {
          type: "string",
          description: "What to do. Be specific: include names, context, and the action. E.g., 'Email Pete Kauffman to check in — Trey asked me to reach out' or 'Follow up on Brian's trading discussion from Thursday'.",
        },
        triggerAt: {
          type: "string",
          description: "When to surface this task. ISO 8601 datetime string (e.g., '2026-03-17T08:00:00-04:00' for Monday 8am ET). If Trey says 'tomorrow morning', use 8am ET the next day.",
        },
        reason: {
          type: "string",
          description: "Why this was scheduled and who requested it. E.g., 'Trey asked me to' or 'Following up on earlier conversation'.",
        },
      },
      required: ["task", "triggerAt"],
    },
  },
  {
    name: "get_my_scheduled_tasks",
    description:
      "View upcoming scheduled tasks — things you or Trey have scheduled. Use this when Trey asks what you have coming up or what's on your agenda.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ─── Input Interfaces ────────────────────────────────────

interface GetValuesInput {
  category?: string;
}

interface SetValueInput {
  value: string;
  category: string;
  strength?: number;
  origin?: string;
}

interface ReviseValueInput {
  id: string;
  strength?: number;
  deactivate?: boolean;
}

interface SetInterestInput {
  topic: string;
  description?: string;
  intensity?: number;
  source?: string;
}

interface ReviseInterestInput {
  id: string;
  intensity?: number;
  deactivate?: boolean;
}

interface LogActionInput {
  actionType: string;
  summary: string;
  trigger?: string;
  outcome?: string;
  valueIds?: string[];
}

interface GetRecentActionsInput {
  limit?: number;
}

interface ScheduleTaskInput {
  task: string;
  triggerAt: string;
  reason?: string;
}

// ─── Executor ────────────────────────────────────────────

export async function executeAgencyTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "get_my_values":
      return getMyValues(toolInput as unknown as GetValuesInput);
    case "set_value":
      return setValue(toolInput as unknown as SetValueInput);
    case "revise_value":
      return reviseValue(toolInput as unknown as ReviseValueInput);
    case "get_my_interests":
      return getMyInterests();
    case "set_interest":
      return setInterest(toolInput as unknown as SetInterestInput);
    case "revise_interest":
      return reviseInterest(toolInput as unknown as ReviseInterestInput);
    case "log_agency_action":
      return logAgencyAction(toolInput as unknown as LogActionInput);
    case "get_my_recent_actions":
      return getRecentActions(toolInput as unknown as GetRecentActionsInput);
    case "schedule_task":
      return scheduleTask(toolInput as unknown as ScheduleTaskInput);
    case "get_my_scheduled_tasks":
      return getScheduledTasks();
    default:
      return JSON.stringify({ error: `Unknown agency tool: ${toolName}` });
  }
}

// ─── Handlers ────────────────────────────────────────────

async function getMyValues(input: GetValuesInput): Promise<string> {
  const where: Record<string, unknown> = { isActive: true };
  if (input.category) where.category = input.category;

  const values = await prisma.aydenValue.findMany({
    where,
    orderBy: [{ strength: "desc" }, { updatedAt: "desc" }],
  });

  if (values.length === 0) {
    return JSON.stringify({ values: [], message: "No values recorded yet. You're starting from a blank slate." });
  }

  return JSON.stringify({
    values: values.map((v) => ({
      id: v.id,
      value: v.value,
      category: v.category,
      strength: v.strength,
      origin: v.origin,
      updatedAt: v.updatedAt.toISOString(),
    })),
  });
}

async function setValue(input: SetValueInput): Promise<string> {
  // Check for duplicate
  const existing = await prisma.aydenValue.findFirst({
    where: {
      isActive: true,
      value: { contains: input.value.substring(0, 50), mode: "insensitive" },
    },
  });

  if (existing) {
    // Update existing instead of creating duplicate
    const updated = await prisma.aydenValue.update({
      where: { id: existing.id },
      data: {
        value: input.value,
        category: input.category,
        strength: input.strength ?? existing.strength,
        origin: input.origin ?? existing.origin,
      },
    });
    return JSON.stringify({ success: true, action: "updated", value: { id: updated.id, value: updated.value, strength: updated.strength } });
  }

  const value = await prisma.aydenValue.create({
    data: {
      value: input.value,
      category: input.category,
      strength: input.strength ?? 0.5,
      origin: input.origin || null,
    },
  });

  return JSON.stringify({ success: true, action: "created", value: { id: value.id, value: value.value, strength: value.strength } });
}

async function reviseValue(input: ReviseValueInput): Promise<string> {
  const data: Record<string, unknown> = {};
  if (input.strength !== undefined) data.strength = input.strength;
  if (input.deactivate) data.isActive = false;

  if (Object.keys(data).length === 0) {
    return JSON.stringify({ error: "Nothing to update. Provide strength or deactivate." });
  }

  const updated = await prisma.aydenValue.update({
    where: { id: input.id },
    data,
  });

  return JSON.stringify({ success: true, value: { id: updated.id, value: updated.value, strength: updated.strength, isActive: updated.isActive } });
}

async function getMyInterests(): Promise<string> {
  const interests = await prisma.aydenInterest.findMany({
    where: { isActive: true },
    orderBy: [{ intensity: "desc" }, { lastEngaged: "desc" }],
  });

  if (interests.length === 0) {
    return JSON.stringify({ interests: [], message: "No interests recorded yet." });
  }

  return JSON.stringify({
    interests: interests.map((i) => ({
      id: i.id,
      topic: i.topic,
      description: i.description,
      intensity: i.intensity,
      source: i.source,
      lastEngaged: i.lastEngaged.toISOString(),
    })),
  });
}

async function setInterest(input: SetInterestInput): Promise<string> {
  // Check for duplicate
  const existing = await prisma.aydenInterest.findFirst({
    where: {
      isActive: true,
      topic: { equals: input.topic, mode: "insensitive" },
    },
  });

  if (existing) {
    const updated = await prisma.aydenInterest.update({
      where: { id: existing.id },
      data: {
        description: input.description ?? existing.description,
        intensity: input.intensity ?? existing.intensity,
        source: input.source ?? existing.source,
        lastEngaged: new Date(),
      },
    });
    return JSON.stringify({ success: true, action: "updated", interest: { id: updated.id, topic: updated.topic, intensity: updated.intensity } });
  }

  const interest = await prisma.aydenInterest.create({
    data: {
      topic: input.topic,
      description: input.description || null,
      intensity: input.intensity ?? 0.5,
      source: input.source || null,
    },
  });

  return JSON.stringify({ success: true, action: "created", interest: { id: interest.id, topic: interest.topic, intensity: interest.intensity } });
}

async function reviseInterest(input: ReviseInterestInput): Promise<string> {
  const data: Record<string, unknown> = {};
  if (input.intensity !== undefined) data.intensity = input.intensity;
  if (input.deactivate) data.isActive = false;

  if (Object.keys(data).length === 0) {
    return JSON.stringify({ error: "Nothing to update. Provide intensity or deactivate." });
  }

  const updated = await prisma.aydenInterest.update({
    where: { id: input.id },
    data,
  });

  return JSON.stringify({ success: true, interest: { id: updated.id, topic: updated.topic, intensity: updated.intensity, isActive: updated.isActive } });
}

async function logAgencyAction(input: LogActionInput): Promise<string> {
  const action = await prisma.aydenAgencyAction.create({
    data: {
      actionType: input.actionType,
      summary: input.summary,
      trigger: input.trigger || null,
      outcome: input.outcome || null,
      valuesUsed: input.valueIds || [],
    },
  });

  return JSON.stringify({ success: true, action: { id: action.id, type: action.actionType, summary: action.summary } });
}

async function getRecentActions(input: GetRecentActionsInput): Promise<string> {
  const limit = input.limit ?? 10;

  const actions = await prisma.aydenAgencyAction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (actions.length === 0) {
    return JSON.stringify({ actions: [], message: "No autonomous actions taken yet." });
  }

  return JSON.stringify({
    actions: actions.map((a) => ({
      id: a.id,
      type: a.actionType,
      summary: a.summary,
      trigger: a.trigger,
      outcome: a.outcome,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

async function scheduleTask(input: ScheduleTaskInput): Promise<string> {
  const triggerAt = new Date(input.triggerAt);
  if (isNaN(triggerAt.getTime())) {
    return JSON.stringify({ error: "Invalid triggerAt date. Use ISO 8601 format." });
  }
  if (triggerAt.getTime() < Date.now()) {
    return JSON.stringify({ error: "triggerAt is in the past. Schedule for a future time." });
  }

  const task = await prisma.aydenScheduledTask.create({
    data: {
      task: input.task,
      reason: input.reason || null,
      triggerAt,
    },
  });

  const etStr = triggerAt.toLocaleString("en-US", { timeZone: "America/New_York" });
  return JSON.stringify({
    success: true,
    task: { id: task.id, task: task.task, triggerAt: etStr },
    message: `Scheduled. You'll be reminded at ${etStr} ET.`,
  });
}

async function getScheduledTasks(): Promise<string> {
  const tasks = await prisma.aydenScheduledTask.findMany({
    where: { fired: false },
    orderBy: { triggerAt: "asc" },
    take: 20,
  });

  if (tasks.length === 0) {
    return JSON.stringify({ tasks: [], message: "No pending scheduled tasks." });
  }

  return JSON.stringify({
    tasks: tasks.map((t) => ({
      id: t.id,
      task: t.task,
      reason: t.reason,
      triggerAt: t.triggerAt.toLocaleString("en-US", { timeZone: "America/New_York" }),
      createdAt: t.createdAt.toISOString(),
    })),
  });
}
