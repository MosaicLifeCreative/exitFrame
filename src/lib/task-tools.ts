import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const taskTools: Anthropic.Tool[] = [
  {
    name: "add_task",
    description:
      "Add a new task to the user's task list. Can assign to a group (e.g. 'MLC', 'Life', 'Grove City Events'), add tags, set priority/scores, configure reminders, and set up recurring schedules.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Task title",
        },
        description: {
          type: "string",
          description: "Optional longer description",
        },
        group: {
          type: "string",
          description:
            "Group name to assign (fuzzy matched, e.g. 'MLC', 'Life', 'Grove City Events'). Creates subgroup if no exact match.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to assign (created if they don't exist)",
        },
        priority: {
          type: "string",
          enum: ["none", "low", "medium", "high", "urgent"],
          description: "Task priority (default: medium)",
        },
        dueDate: {
          type: "string",
          description: "Due date in YYYY-MM-DD format",
        },
        importanceScore: {
          type: "number",
          description: "Importance 1-5 (default 3)",
        },
        urgencyScore: {
          type: "number",
          description: "Urgency 1-5 (default 3)",
        },
        effortScore: {
          type: "number",
          description: "Effort 1-5 (default 3). Higher = more effort = lower computed score.",
        },
        reminderEnabled: {
          type: "boolean",
          description: "Enable reminders for this task",
        },
        reminderInterval: {
          type: "string",
          enum: ["hourly", "daily", "custom"],
          description: "Reminder frequency",
        },
        recurring: {
          type: "object",
          properties: {
            frequency: {
              type: "string",
              enum: [
                "daily",
                "weekly",
                "biweekly",
                "monthly",
                "quarterly",
                "yearly",
                "custom",
              ],
            },
            intervalDays: {
              type: "number",
              description: "For custom frequency: interval in days",
            },
            daysOfWeek: {
              type: "array",
              items: { type: "number" },
              description: "For weekly: days of week (0=Sun, 6=Sat)",
            },
          },
          required: ["frequency"],
          description: "Recurring schedule configuration",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description:
      "Mark a task as done. Can find by ID or fuzzy title search. If multiple matches, returns a list to clarify. Handles recurring task generation automatically.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the task (if known)",
        },
        title: {
          type: "string",
          description: "Fuzzy search by title (if ID not known)",
        },
        notes: {
          type: "string",
          description: "Optional completion note appended to description",
        },
      },
      required: [],
    },
  },
  {
    name: "list_tasks",
    description:
      "List tasks with filtering and sorting. Shows title, status, priority, due date, group, tags, and computed score.",
    input_schema: {
      type: "object" as const,
      properties: {
        group: {
          type: "string",
          description: "Filter by group name (fuzzy)",
        },
        tag: {
          type: "string",
          description: "Filter by tag name",
        },
        status: {
          type: "string",
          enum: ["todo", "in_progress", "done", "cancelled", "waiting"],
          description: "Filter by status (default: shows non-done/cancelled)",
        },
        priority: {
          type: "string",
          enum: ["none", "low", "medium", "high", "urgent"],
          description: "Filter by priority",
        },
        overdue: {
          type: "boolean",
          description: "Show only overdue tasks",
        },
        todayOnly: {
          type: "boolean",
          description: "Show only today's daily highlights",
        },
        limit: {
          type: "number",
          description: "Max results (default 10)",
        },
        sortBy: {
          type: "string",
          enum: ["score", "due_date", "priority", "created"],
          description: "Sort order (default: score)",
        },
      },
      required: [],
    },
  },
  {
    name: "update_task",
    description:
      "Update a task's fields. Find by ID or fuzzy title search. Can change title, description, status, priority, due date, group, tags, scores, and reminder settings.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the task (if known)",
        },
        title: {
          type: "string",
          description: "Fuzzy search by title (if ID not known)",
        },
        newTitle: {
          type: "string",
          description: "New title",
        },
        description: {
          type: "string",
          description: "New description",
        },
        status: {
          type: "string",
          enum: ["todo", "in_progress", "done", "cancelled", "waiting"],
        },
        priority: {
          type: "string",
          enum: ["none", "low", "medium", "high", "urgent"],
        },
        dueDate: {
          type: "string",
          description: "Due date in YYYY-MM-DD format, or null to remove",
        },
        groupName: {
          type: "string",
          description: "Move to a different group (fuzzy matched)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Replace tags with this list (find-or-create)",
        },
        importanceScore: { type: "number", description: "1-5" },
        urgencyScore: { type: "number", description: "1-5" },
        effortScore: { type: "number", description: "1-5" },
        reminderEnabled: { type: "boolean" },
        reminderInterval: {
          type: "string",
          enum: ["hourly", "daily", "custom"],
        },
      },
      required: [],
    },
  },
  {
    name: "snooze_task",
    description:
      'Snooze a task until a specific time. Supports ISO dates and relative strings like "tomorrow", "next week", "2 hours", "3 days".',
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the task (if known)",
        },
        title: {
          type: "string",
          description: "Fuzzy search by title (if ID not known)",
        },
        until: {
          type: "string",
          description:
            'When to unsnooze. ISO date (2026-03-15), or relative: "tomorrow", "next week", "2 hours", "3 days"',
        },
      },
      required: ["until"],
    },
  },
  {
    name: "set_daily_highlights",
    description:
      "Set tasks as today's daily highlights (focus tasks for the day). Clears previous highlights for today first.",
    input_schema: {
      type: "object" as const,
      properties: {
        taskIds: {
          type: "array",
          items: { type: "string" },
          description: "UUIDs of tasks to highlight",
        },
        titles: {
          type: "array",
          items: { type: "string" },
          description: "Fuzzy search titles to highlight (if IDs not known)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_task_summary",
    description:
      "Get a task digest: overdue count, due today, daily highlights, top scored tasks, active total. Great for morning briefings.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (default: today)",
        },
      },
      required: [],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeTaskTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  try {
    switch (toolName) {
      case "add_task":
        return await addTask(toolInput as unknown as AddTaskInput);
      case "complete_task":
        return await completeTask(toolInput as unknown as CompleteTaskInput);
      case "list_tasks":
        return await listTasks(toolInput as unknown as ListTasksInput);
      case "update_task":
        return await updateTask(toolInput as unknown as UpdateTaskInput);
      case "snooze_task":
        return await snoozeTask(toolInput as unknown as SnoozeTaskInput);
      case "set_daily_highlights":
        return await setDailyHighlights(
          toolInput as unknown as SetDailyHighlightsInput
        );
      case "get_task_summary":
        return await getTaskSummary(
          toolInput as unknown as GetTaskSummaryInput
        );
      default:
        return JSON.stringify({ error: `Unknown task tool: ${toolName}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: `Task tool error (${toolName}): ${message}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface AddTaskInput {
  title: string;
  description?: string;
  group?: string;
  tags?: string[];
  priority?: string;
  dueDate?: string;
  importanceScore?: number;
  urgencyScore?: number;
  effortScore?: number;
  reminderEnabled?: boolean;
  reminderInterval?: string;
  recurring?: {
    frequency: string;
    intervalDays?: number;
    daysOfWeek?: number[];
  };
}

interface CompleteTaskInput {
  id?: string;
  title?: string;
  notes?: string;
}

interface ListTasksInput {
  group?: string;
  tag?: string;
  status?: string;
  priority?: string;
  overdue?: boolean;
  todayOnly?: boolean;
  limit?: number;
  sortBy?: string;
}

interface UpdateTaskInput {
  id?: string;
  title?: string;
  newTitle?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  groupName?: string;
  tags?: string[];
  importanceScore?: number;
  urgencyScore?: number;
  effortScore?: number;
  reminderEnabled?: boolean;
  reminderInterval?: string;
}

interface SnoozeTaskInput {
  id?: string;
  title?: string;
  until: string;
}

interface SetDailyHighlightsInput {
  taskIds?: string[];
  titles?: string[];
}

interface GetTaskSummaryInput {
  date?: string;
}

// ─── Helpers ─────────────────────────────────────────────

function computeScore(importance: number, urgency: number, effort: number): number {
  return (importance * urgency) / effort;
}

function calculateNextDueDate(
  config: { frequency: string; intervalDays?: number | null; daysOfWeek?: number[]; dayOfMonth?: number | null; monthOfYear?: number | null },
  fromDate: Date
): Date {
  const d = new Date(fromDate);

  switch (config.frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;

    case "weekly": {
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        // Find the next matching day of week after fromDate
        const currentDay = d.getDay();
        const sorted = Array.from(new Set(config.daysOfWeek)).sort((a, b) => a - b);
        const nextDay = sorted.find((day) => day > currentDay);
        if (nextDay !== undefined) {
          d.setDate(d.getDate() + (nextDay - currentDay));
        } else {
          // Wrap to next week's first day
          d.setDate(d.getDate() + (7 - currentDay + sorted[0]));
        }
      } else {
        d.setDate(d.getDate() + 7);
      }
      break;
    }

    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;

    case "monthly": {
      const targetDay = config.dayOfMonth ?? d.getDate();
      d.setMonth(d.getMonth() + 1);
      // Clamp to valid day for the target month
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(targetDay, maxDay));
      break;
    }

    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;

    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;

    case "custom":
      d.setDate(d.getDate() + (config.intervalDays ?? 1));
      break;

    default:
      d.setDate(d.getDate() + 7);
  }

  return d;
}

/**
 * Fuzzy find a task by title (case-insensitive contains).
 * Returns single task or throws with multiple match info.
 */
async function findTaskByTitle(title: string): Promise<{ id: string; title: string }> {
  const matches = await prisma.task.findMany({
    where: {
      title: { contains: title, mode: "insensitive" },
      status: { notIn: ["done", "cancelled"] },
    },
    select: { id: true, title: true },
    take: 10,
  });

  if (matches.length === 0) {
    throw new Error(`No active task found matching "${title}"`);
  }
  if (matches.length === 1) {
    return matches[0];
  }
  // Multiple matches — caller should present options
  const list = matches.map((m) => `- "${m.title}" (${m.id})`).join("\n");
  throw new Error(
    `Multiple tasks match "${title}". Please specify which one:\n${list}`
  );
}

/**
 * Fuzzy find a group by name. Returns the group or null.
 */
async function findGroupByName(name: string): Promise<{ id: string; name: string; parentGroupId: string | null } | null> {
  // Exact case-insensitive match first
  const exact = await prisma.taskGroup.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, isActive: true },
    select: { id: true, name: true, parentGroupId: true },
  });
  if (exact) return exact;

  // Contains match
  const partial = await prisma.taskGroup.findFirst({
    where: { name: { contains: name, mode: "insensitive" }, isActive: true },
    select: { id: true, name: true, parentGroupId: true },
  });
  return partial;
}

/**
 * Find or create a group. If not found, create as a subgroup under the closest
 * top-level group or "Life" as default.
 */
async function findOrCreateGroup(name: string): Promise<{ id: string; name: string }> {
  const existing = await findGroupByName(name);
  if (existing) return existing;

  // Find a top-level parent to nest under — try to match first word
  const topLevelGroups = await prisma.taskGroup.findMany({
    where: { parentGroupId: null, isActive: true },
    select: { id: true, name: true },
  });

  // Default to "Life" if no better match
  let parent = topLevelGroups.find(
    (g) => g.name.toLowerCase() === "life"
  );

  // Try to find a better parent by checking if the name contains a top-level keyword
  for (const tg of topLevelGroups) {
    if (
      name.toLowerCase().includes(tg.name.toLowerCase()) ||
      tg.name.toLowerCase().includes(name.toLowerCase())
    ) {
      parent = tg;
      break;
    }
  }

  const parentId = parent?.id ?? topLevelGroups[0]?.id ?? null;

  const created = await prisma.taskGroup.create({
    data: {
      name,
      parentGroupId: parentId,
    },
    select: { id: true, name: true },
  });

  return created;
}

/**
 * Find or create tags, return their IDs.
 */
async function findOrCreateTags(tagNames: string[]): Promise<string[]> {
  const tagIds: string[] = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    let tag = await prisma.taskTag.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
      select: { id: true },
    });

    if (!tag) {
      tag = await prisma.taskTag.create({
        data: { name: trimmed },
        select: { id: true },
      });
    }

    tagIds.push(tag.id);
  }
  return tagIds;
}

/**
 * Parse a snooze "until" string into a Date.
 */
function parseSnoozeUntil(until: string): Date {
  const now = new Date();
  const lower = until.toLowerCase().trim();

  if (lower === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }

  if (lower === "next week") {
    const d = new Date(now);
    const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + daysUntilMonday);
    d.setHours(9, 0, 0, 0);
    return d;
  }

  // Relative: "2 hours", "3 days", "1 week", etc.
  const relativeMatch = lower.match(/^(\d+)\s*(hour|hours|day|days|week|weeks|minute|minutes)$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    const d = new Date(now);
    if (unit.startsWith("hour")) {
      d.setHours(d.getHours() + amount);
    } else if (unit.startsWith("day")) {
      d.setDate(d.getDate() + amount);
    } else if (unit.startsWith("week")) {
      d.setDate(d.getDate() + amount * 7);
    } else if (unit.startsWith("minute")) {
      d.setMinutes(d.getMinutes() + amount);
    }
    return d;
  }

  // Try ISO date
  const parsed = new Date(until);
  if (!isNaN(parsed.getTime())) {
    // If just a date (no time component), set to 9am
    if (/^\d{4}-\d{2}-\d{2}$/.test(until)) {
      parsed.setHours(9, 0, 0, 0);
    }
    return parsed;
  }

  throw new Error(
    `Could not parse snooze time "${until}". Use ISO date, "tomorrow", "next week", or "X hours/days".`
  );
}

function todayDateOnly(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrowDateOnly(): Date {
  const d = todayDateOnly();
  d.setDate(d.getDate() + 1);
  return d;
}

// ─── Tool Implementations ────────────────────────────────

async function addTask(input: AddTaskInput): Promise<string> {
  const importance = input.importanceScore ?? 3;
  const urgency = input.urgencyScore ?? 3;
  const effort = input.effortScore ?? 3;
  const score = computeScore(importance, urgency, effort);

  // Resolve group
  let groupId: string | undefined;
  let groupName: string | undefined;
  if (input.group) {
    const group = await findOrCreateGroup(input.group);
    groupId = group.id;
    groupName = group.name;
  }

  // Resolve tags
  let tagIds: string[] = [];
  if (input.tags && input.tags.length > 0) {
    tagIds = await findOrCreateTags(input.tags);
  }

  // Recurring config
  let recurringConfigId: string | undefined;
  let nextDueDate: Date | undefined;
  if (input.recurring) {
    const startDate = input.dueDate
      ? new Date(input.dueDate + "T00:00:00Z")
      : new Date();
    nextDueDate = calculateNextDueDate(input.recurring, startDate);

    const config = await prisma.recurringConfig.create({
      data: {
        frequency: input.recurring.frequency,
        intervalDays: input.recurring.intervalDays,
        daysOfWeek: input.recurring.daysOfWeek ?? [],
        startDate,
        nextDueDate,
        isActive: true,
      },
    });
    recurringConfigId = config.id;
  }

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      groupId,
      priority: input.priority ?? "medium",
      dueDate: input.dueDate
        ? new Date(input.dueDate + "T00:00:00Z")
        : undefined,
      importanceScore: importance,
      urgencyScore: urgency,
      effortScore: effort,
      computedScore: score,
      reminderEnabled: input.reminderEnabled ?? false,
      reminderInterval: input.reminderInterval,
      isRecurring: !!input.recurring,
      recurringConfigId,
      source: "ayden",
      tags: tagIds.length > 0
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: {
      tags: { include: { tag: true } },
      group: { select: { name: true } },
    },
  });

  return JSON.stringify({
    success: true,
    task: {
      id: task.id,
      title: task.title,
      group: groupName ?? task.group?.name ?? null,
      tags: task.tags.map((t) => t.tag.name),
      priority: task.priority,
      dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
      computedScore: task.computedScore,
      isRecurring: task.isRecurring,
    },
  });
}

async function completeTask(input: CompleteTaskInput): Promise<string> {
  // Resolve task
  let taskId: string;
  if (input.id) {
    taskId = input.id;
  } else if (input.title) {
    const found = await findTaskByTitle(input.title);
    taskId = found.id;
  } else {
    return JSON.stringify({ error: "Provide either id or title to find the task." });
  }

  // Append completion notes if provided
  if (input.notes) {
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: { description: true },
    });
    const updated = existing?.description
      ? `${existing.description}\n\n--- Completion note ---\n${input.notes}`
      : `--- Completion note ---\n${input.notes}`;
    await prisma.task.update({
      where: { id: taskId },
      data: { description: updated },
    });
  }

  // Complete the task
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "done",
      completedAt: new Date(),
    },
    include: {
      recurringConfig: true,
      parentRecurring: {
        include: {
          tags: { include: { tag: true } },
          group: { select: { id: true, name: true } },
          recurringConfig: true,
        },
      },
      tags: { include: { tag: true } },
      group: { select: { name: true } },
    },
  });

  let nextInstanceInfo: string | null = null;

  // Handle recurring: generate next instance from the template (parent recurring task)
  if (task.parentRecurringTaskId) {
    const template = task.parentRecurring;
    if (template && template.recurringConfig && template.recurringConfig.isActive) {
      const config = template.recurringConfig;

      // Check if we've hit max occurrences
      if (config.maxOccurrences && config.occurrenceCount >= config.maxOccurrences) {
        await prisma.recurringConfig.update({
          where: { id: config.id },
          data: { isActive: false },
        });
      } else {
        const nextDue = calculateNextDueDate(config, task.dueDate ?? new Date());

        // Check end date
        if (config.endDate && nextDue > config.endDate) {
          await prisma.recurringConfig.update({
            where: { id: config.id },
            data: { isActive: false },
          });
        } else {
          // Create next instance
          await prisma.task.create({
            data: {
              title: template.title,
              description: template.description,
              groupId: template.groupId,
              priority: template.priority,
              dueDate: nextDue,
              importanceScore: template.importanceScore,
              urgencyScore: template.urgencyScore,
              effortScore: template.effortScore,
              computedScore: template.computedScore,
              reminderEnabled: template.reminderEnabled,
              reminderInterval: template.reminderInterval,
              parentRecurringTaskId: template.id,
              recurringConfigId: config.id,
              source: "recurring",
              tags: template.tags.length > 0
                ? { create: template.tags.map((t) => ({ tagId: t.tagId })) }
                : undefined,
            },
          });

          // Update config
          await prisma.recurringConfig.update({
            where: { id: config.id },
            data: {
              occurrenceCount: { increment: 1 },
              nextDueDate: nextDue,
            },
          });

          nextInstanceInfo = `Next occurrence created for ${nextDue.toISOString().slice(0, 10)}`;
        }
      }
    }
  }

  return JSON.stringify({
    success: true,
    completed: {
      id: task.id,
      title: task.title,
      group: task.group?.name ?? null,
      tags: task.tags.map((t) => t.tag.name),
    },
    nextRecurrence: nextInstanceInfo,
  });
}

async function listTasks(input: ListTasksInput): Promise<string> {
  const limit = input.limit ?? 10;
  const now = new Date();
  const today = todayDateOnly();
  const tomorrow = tomorrowDateOnly();

  // Build where clause
  const where: Record<string, unknown> = {};

  // Status filter
  if (input.status) {
    where.status = input.status;
  } else {
    where.status = { notIn: ["done", "cancelled"] };
  }

  if (input.priority) {
    where.priority = input.priority;
  }

  // Group filter (fuzzy)
  if (input.group) {
    const group = await findGroupByName(input.group);
    if (group) {
      where.groupId = group.id;
    }
  }

  // Tag filter
  if (input.tag) {
    where.tags = {
      some: {
        tag: { name: { equals: input.tag, mode: "insensitive" } },
      },
    };
  }

  // Overdue filter
  if (input.overdue) {
    where.dueDate = { lt: now };
  }

  // Today's highlights
  if (input.todayOnly) {
    where.isDailyHighlight = true;
    where.highlightDate = {
      gte: today,
      lt: tomorrow,
    };
  }

  // Snoozed filter: hide snoozed tasks unless specifically requested
  if (!input.todayOnly) {
    where.OR = [
      { snoozedUntil: null },
      { snoozedUntil: { lte: now } },
    ];
  }

  // Sort
  let orderBy: Record<string, string>[];
  switch (input.sortBy) {
    case "due_date":
      orderBy = [{ dueDate: "asc" }, { computedScore: "desc" }];
      break;
    case "priority":
      orderBy = [{ priority: "desc" }, { computedScore: "desc" }];
      break;
    case "created":
      orderBy = [{ createdAt: "desc" }];
      break;
    case "score":
    default:
      orderBy = [{ computedScore: "desc" }, { createdAt: "desc" }];
      break;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      tags: { include: { tag: true } },
      group: { select: { name: true } },
    },
    orderBy,
    take: limit,
  });

  const result = tasks.map((t) => {
    const isOverdue = t.dueDate && t.dueDate < now && t.status !== "done";
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
      overdue: !!isOverdue,
      group: t.group?.name ?? null,
      tags: t.tags.map((ta) => ta.tag.name),
      computedScore: t.computedScore,
      isDailyHighlight: t.isDailyHighlight,
      snoozedUntil: t.snoozedUntil?.toISOString() ?? null,
    };
  });

  return JSON.stringify({ tasks: result, count: result.length });
}

async function updateTask(input: UpdateTaskInput): Promise<string> {
  // Resolve task
  let taskId: string;
  if (input.id) {
    taskId = input.id;
  } else if (input.title) {
    const found = await findTaskByTitle(input.title);
    taskId = found.id;
  } else {
    return JSON.stringify({ error: "Provide either id or title to find the task." });
  }

  // Get current task for score recalculation
  const current = await prisma.task.findUnique({
    where: { id: taskId },
    select: { importanceScore: true, urgencyScore: true, effortScore: true },
  });
  if (!current) {
    return JSON.stringify({ error: `Task not found: ${taskId}` });
  }

  const data: Record<string, unknown> = {};

  if (input.newTitle !== undefined) data.title = input.newTitle;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.reminderEnabled !== undefined) data.reminderEnabled = input.reminderEnabled;
  if (input.reminderInterval !== undefined) data.reminderInterval = input.reminderInterval;

  // Due date
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate ? new Date(input.dueDate + "T00:00:00Z") : null;
  }

  // Status changes
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === "done") {
      data.completedAt = new Date();
    } else {
      data.completedAt = null;
    }
  }

  // Group
  if (input.groupName !== undefined) {
    const group = await findOrCreateGroup(input.groupName);
    data.groupId = group.id;
  }

  // Scores — recalculate if any changed
  const imp = input.importanceScore ?? current.importanceScore;
  const urg = input.urgencyScore ?? current.urgencyScore;
  const eff = input.effortScore ?? current.effortScore;

  if (
    input.importanceScore !== undefined ||
    input.urgencyScore !== undefined ||
    input.effortScore !== undefined
  ) {
    data.importanceScore = imp;
    data.urgencyScore = urg;
    data.effortScore = eff;
    data.computedScore = computeScore(imp, urg, eff);
  }

  // Update the task
  await prisma.task.update({
    where: { id: taskId },
    data,
    include: {
      tags: { include: { tag: true } },
      group: { select: { name: true } },
    },
  });

  // Handle tags replacement if provided
  if (input.tags !== undefined) {
    // Remove existing tag assignments
    await prisma.taskTagAssignment.deleteMany({
      where: { taskId },
    });

    // Create new ones
    if (input.tags.length > 0) {
      const tagIds = await findOrCreateTags(input.tags);
      await prisma.taskTagAssignment.createMany({
        data: tagIds.map((tagId) => ({ taskId, tagId })),
      });
    }
  }

  // Re-fetch to get updated tags
  const updated = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      tags: { include: { tag: true } },
      group: { select: { name: true } },
    },
  });

  return JSON.stringify({
    success: true,
    task: {
      id: updated!.id,
      title: updated!.title,
      status: updated!.status,
      priority: updated!.priority,
      dueDate: updated!.dueDate?.toISOString().slice(0, 10) ?? null,
      group: updated!.group?.name ?? null,
      tags: updated!.tags.map((t) => t.tag.name),
      computedScore: updated!.computedScore,
    },
  });
}

async function snoozeTask(input: SnoozeTaskInput): Promise<string> {
  // Resolve task
  let taskId: string;
  let taskTitle: string;
  if (input.id) {
    taskId = input.id;
    const t = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });
    taskTitle = t?.title ?? "Unknown";
  } else if (input.title) {
    const found = await findTaskByTitle(input.title);
    taskId = found.id;
    taskTitle = found.title;
  } else {
    return JSON.stringify({ error: "Provide either id or title to find the task." });
  }

  const snoozedUntil = parseSnoozeUntil(input.until);

  await prisma.task.update({
    where: { id: taskId },
    data: { snoozedUntil },
  });

  return JSON.stringify({
    success: true,
    snoozed: {
      id: taskId,
      title: taskTitle,
      snoozedUntil: snoozedUntil.toISOString(),
    },
  });
}

async function setDailyHighlights(input: SetDailyHighlightsInput): Promise<string> {
  const today = todayDateOnly();
  const tomorrow = tomorrowDateOnly();

  // Clear previous highlights for today
  await prisma.task.updateMany({
    where: {
      isDailyHighlight: true,
      highlightDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    data: {
      isDailyHighlight: false,
      highlightDate: null,
    },
  });

  // Resolve task IDs
  const resolvedIds: string[] = [];

  if (input.taskIds) {
    resolvedIds.push(...input.taskIds);
  }

  if (input.titles) {
    for (const title of input.titles) {
      try {
        const found = await findTaskByTitle(title);
        resolvedIds.push(found.id);
      } catch (err) {
        // If multiple matches, include the error message in the response
        const message = err instanceof Error ? err.message : String(err);
        return JSON.stringify({ error: message });
      }
    }
  }

  if (resolvedIds.length === 0) {
    return JSON.stringify({ error: "No task IDs or titles provided." });
  }

  // Set highlights
  await prisma.task.updateMany({
    where: { id: { in: resolvedIds } },
    data: {
      isDailyHighlight: true,
      highlightDate: today,
    },
  });

  // Fetch the highlighted tasks
  const tasks = await prisma.task.findMany({
    where: { id: { in: resolvedIds } },
    include: {
      group: { select: { name: true } },
    },
    orderBy: { computedScore: "desc" },
  });

  return JSON.stringify({
    success: true,
    highlights: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      group: t.group?.name ?? null,
      dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
    })),
    count: tasks.length,
  });
}

async function getTaskSummary(input: GetTaskSummaryInput): Promise<string> {
  const targetDate = input.date ? new Date(input.date + "T00:00:00") : new Date();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const now = new Date();

  // Overdue count
  const overdueCount = await prisma.task.count({
    where: {
      status: { notIn: ["done", "cancelled"] },
      dueDate: { lt: now },
    },
  });

  // Due today count
  const dueTodayCount = await prisma.task.count({
    where: {
      status: { notIn: ["done", "cancelled"] },
      dueDate: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
  });

  // Daily highlights
  const highlights = await prisma.task.findMany({
    where: {
      isDailyHighlight: true,
      highlightDate: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    include: {
      group: { select: { name: true } },
    },
    orderBy: { computedScore: "desc" },
  });

  // Top 5 by computed score
  const topScored = await prisma.task.findMany({
    where: {
      status: { notIn: ["done", "cancelled"] },
    },
    include: {
      group: { select: { name: true } },
    },
    orderBy: { computedScore: "desc" },
    take: 5,
  });

  // Total active
  const totalActive = await prisma.task.count({
    where: {
      status: { notIn: ["done", "cancelled"] },
    },
  });

  // Completed today
  const completedToday = await prisma.task.count({
    where: {
      status: "done",
      completedAt: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
  });

  // Build readable summary
  const lines: string[] = [];
  lines.push(`Task Summary for ${dayStart.toISOString().slice(0, 10)}`);
  lines.push("─".repeat(40));
  lines.push(`Total active tasks: ${totalActive}`);
  lines.push(`Overdue: ${overdueCount}`);
  lines.push(`Due today: ${dueTodayCount}`);
  lines.push(`Completed today: ${completedToday}`);

  if (highlights.length > 0) {
    lines.push("");
    lines.push("Daily Highlights:");
    for (const h of highlights) {
      const group = h.group?.name ? ` [${h.group.name}]` : "";
      const due = h.dueDate ? ` (due ${h.dueDate.toISOString().slice(0, 10)})` : "";
      lines.push(`  - ${h.title}${group}${due}`);
    }
  } else {
    lines.push("\nNo daily highlights set.");
  }

  if (topScored.length > 0) {
    lines.push("");
    lines.push("Top Scored Tasks:");
    for (const t of topScored) {
      const group = t.group?.name ? ` [${t.group.name}]` : "";
      const score = t.computedScore ? ` (score: ${t.computedScore.toFixed(1)})` : "";
      const due = t.dueDate ? ` due ${t.dueDate.toISOString().slice(0, 10)}` : "";
      lines.push(`  - ${t.title}${group}${score}${due}`);
    }
  }

  return lines.join("\n");
}
