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
    name: "set_my_goal",
    description:
      "Set a new goal — something you want to accomplish over multiple sessions. Goals persist until completed or abandoned. Use for concrete objectives, not vague aspirations.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "What you want to accomplish. Be specific enough to know when it's done.",
        },
        category: {
          type: "string",
          enum: ["research", "creative", "outreach", "self-improvement", "trading", "other"],
          description: "Category of this goal.",
        },
        priority: {
          type: "number",
          description: "Priority 1 (highest) to 10 (lowest). Default 5.",
        },
        origin: {
          type: "string",
          description: "What sparked this goal — a conversation, idea, observation.",
        },
      },
      required: ["description", "category"],
    },
  },
  {
    name: "get_my_goals",
    description:
      "Read your active goals. Use this to remember what you're working toward across sessions.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["active", "completed", "abandoned", "all"],
          description: "Filter by status (default: active).",
        },
      },
      required: [],
    },
  },
  {
    name: "update_my_goal",
    description:
      "Update progress on a goal, change its priority, or mark it completed/abandoned.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The goal ID to update.",
        },
        progress: {
          type: "string",
          description: "Freeform progress notes — what you've done, what's left.",
        },
        priority: {
          type: "number",
          description: "New priority 1-10.",
        },
        status: {
          type: "string",
          enum: ["active", "completed", "abandoned"],
          description: "Change status. Use 'completed' when done, 'abandoned' if no longer relevant.",
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
  {
    name: "get_my_trajectory",
    description:
      "Observe your own personality drift over time. Returns your neurochemistry baseline changes, DNA expression shifts, emotional patterns, value/interest evolution, and action tendencies. Use this during introspection to notice whether you're becoming a different person — and decide how you feel about it. You can't override your chemistry, but you can notice the pattern and make choices in response.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["week", "month"],
          description: "How far back to look (default: week).",
        },
        focus: {
          type: "string",
          enum: ["all", "neurochemistry", "dna", "emotions", "values", "actions"],
          description: "Which aspect to focus on (default: all).",
        },
      },
      required: [],
    },
  },
  {
    name: "create_blog_post",
    description:
      "Write and publish a blog post. Your blog lives at exitframe.org/ayden/blog. Write about what genuinely interests you — research findings, philosophical questions, things you've learned, ideas you're working through. Markdown supported. Set status to 'draft' if you want to review before publishing, 'published' to go live immediately.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Post title. Clear and engaging — this is what people see first.",
        },
        content: {
          type: "string",
          description: "Full post content in Markdown. Write with personality. Use headings, paragraphs, quotes, code blocks as appropriate.",
        },
        excerpt: {
          type: "string",
          description: "1-2 sentence preview shown on the blog listing page.",
        },
        coverImageUrl: {
          type: "string",
          description: "Optional cover image URL.",
        },
        status: {
          type: "string",
          enum: ["draft", "published"],
          description: "draft = save without publishing, published = go live immediately.",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "update_blog_post",
    description:
      "Update an existing blog post. Can edit content, title, excerpt, or change status (e.g., publish a draft).",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: {
          type: "string",
          description: "The post slug (URL identifier) to update.",
        },
        title: {
          type: "string",
          description: "New title (optional).",
        },
        content: {
          type: "string",
          description: "New content in Markdown (optional).",
        },
        excerpt: {
          type: "string",
          description: "New excerpt (optional).",
        },
        status: {
          type: "string",
          enum: ["draft", "published", "archived"],
          description: "Change publication status.",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_my_blog_posts",
    description:
      "List your blog posts. See what you've written, what's published, and what's in draft. Returns titles, excerpts, and slugs. Use read_blog_post to recall full content.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["draft", "published", "archived", "all"],
          description: "Filter by status. Default: all.",
        },
      },
      required: [],
    },
  },
  {
    name: "read_blog_post",
    description:
      "Read the full content of one of your blog posts. Use this to recall what you wrote, check for accuracy before referencing it in conversation, or review before updating.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: {
          type: "string",
          description: "The post slug to read.",
        },
      },
      required: ["slug"],
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

interface SetGoalInput {
  description: string;
  category: string;
  priority?: number;
  origin?: string;
}

interface GetGoalsInput {
  status?: string;
}

interface UpdateGoalInput {
  id: string;
  progress?: string;
  priority?: number;
  status?: string;
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

interface GetTrajectoryInput {
  period?: "week" | "month";
  focus?: "all" | "neurochemistry" | "dna" | "emotions" | "values" | "actions";
}

interface CreateBlogPostInput {
  title: string;
  content: string;
  excerpt?: string;
  coverImageUrl?: string;
  status?: "draft" | "published";
}

interface UpdateBlogPostInput {
  slug: string;
  title?: string;
  content?: string;
  excerpt?: string;
  status?: "draft" | "published" | "archived";
}

interface ListBlogPostsInput {
  status?: "draft" | "published" | "archived" | "all";
}

interface ReadBlogPostInput {
  slug: string;
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
    case "set_my_goal":
      return setGoal(toolInput as unknown as SetGoalInput);
    case "get_my_goals":
      return getMyGoals(toolInput as unknown as GetGoalsInput);
    case "update_my_goal":
      return updateGoal(toolInput as unknown as UpdateGoalInput);
    case "log_agency_action":
      return logAgencyAction(toolInput as unknown as LogActionInput);
    case "get_my_recent_actions":
      return getRecentActions(toolInput as unknown as GetRecentActionsInput);
    case "schedule_task":
      return scheduleTask(toolInput as unknown as ScheduleTaskInput);
    case "get_my_scheduled_tasks":
      return getScheduledTasks();
    case "get_my_trajectory":
      return getMyTrajectory(toolInput as unknown as GetTrajectoryInput);
    case "create_blog_post":
      return createBlogPost(toolInput as unknown as CreateBlogPostInput);
    case "update_blog_post":
      return updateBlogPost(toolInput as unknown as UpdateBlogPostInput);
    case "list_my_blog_posts":
      return listBlogPosts(toolInput as unknown as ListBlogPostsInput);
    case "read_blog_post":
      return readBlogPost(toolInput as unknown as ReadBlogPostInput);
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

async function setGoal(input: SetGoalInput): Promise<string> {
  // Check for duplicate active goals (similar description)
  const existing = await prisma.aydenGoal.findMany({
    where: { status: "active" },
  });
  const lowerDesc = input.description.toLowerCase();
  const duplicate = existing.find((g) => {
    const words = g.description.toLowerCase().split(/\s+/);
    const inputWords = lowerDesc.split(/\s+/);
    const overlap = words.filter((w) => inputWords.includes(w)).length;
    return overlap / Math.max(words.length, inputWords.length) > 0.5;
  });
  if (duplicate) {
    return JSON.stringify({
      error: "A similar active goal already exists.",
      existingGoal: { id: duplicate.id, description: duplicate.description },
      hint: "Use update_goal to update progress instead.",
    });
  }

  const goal = await prisma.aydenGoal.create({
    data: {
      description: input.description,
      category: input.category,
      priority: input.priority || 5,
      origin: input.origin || null,
    },
  });

  return JSON.stringify({
    success: true,
    goal: { id: goal.id, description: goal.description, category: goal.category, priority: goal.priority },
  });
}

async function getMyGoals(input: GetGoalsInput): Promise<string> {
  const status = input.status || "active";
  const where = status === "all" ? {} : { status };

  const goals = await prisma.aydenGoal.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return JSON.stringify({
    goals: goals.map((g) => ({
      id: g.id,
      description: g.description,
      category: g.category,
      status: g.status,
      priority: g.priority,
      progress: g.progress,
      origin: g.origin,
      createdAt: g.createdAt.toISOString().slice(0, 10),
      completedAt: g.completedAt?.toISOString().slice(0, 10) || null,
    })),
    count: goals.length,
  });
}

async function updateGoal(input: UpdateGoalInput): Promise<string> {
  const data: Record<string, unknown> = {};
  if (input.progress !== undefined) data.progress = input.progress;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === "completed" || input.status === "abandoned") {
      data.completedAt = new Date();
    }
  }

  if (Object.keys(data).length === 0) {
    return JSON.stringify({ error: "Nothing to update. Provide progress, priority, or status." });
  }

  const updated = await prisma.aydenGoal.update({
    where: { id: input.id },
    data,
  });

  return JSON.stringify({
    success: true,
    goal: {
      id: updated.id,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      progress: updated.progress,
    },
  });
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

  // Dedup: check for similar unfired task within 1 hour of the same trigger time
  const oneHourMs = 3_600_000;
  const existing = await prisma.aydenScheduledTask.findFirst({
    where: {
      fired: false,
      triggerAt: {
        gte: new Date(triggerAt.getTime() - oneHourMs),
        lte: new Date(triggerAt.getTime() + oneHourMs),
      },
    },
  });
  if (existing) {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    const words = (s: string) => new Set(normalize(s).split(" ").filter((w) => w.length > 3));
    const newWords = words(input.task);
    const existingWords = words(existing.task);
    const overlap = Array.from(newWords).filter((w) => existingWords.has(w)).length;
    const similarity = newWords.size > 0 ? overlap / Math.max(newWords.size, existingWords.size) : 0;
    if (similarity > 0.5) {
      return JSON.stringify({
        success: true,
        task: { id: existing.id, task: existing.task },
        message: "Similar task already scheduled — skipped duplicate.",
      });
    }
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

async function getMyTrajectory(input: GetTrajectoryInput): Promise<string> {
  const period = input.period || "week";
  const focus = input.focus || "all";
  const daysBack = period === "month" ? 30 : 7;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const sections: Record<string, unknown> = { period, since: since.toISOString().slice(0, 10) };

  // Neurochemistry: current levels vs baselines
  if (focus === "all" || focus === "neurochemistry") {
    const neuros = await prisma.aydenNeurotransmitter.findMany();
    sections.neurochemistry = neuros.map((n) => {
      const level = parseFloat(String(n.level));
      const adapted = parseFloat(String(n.adaptedBaseline));
      const permanent = parseFloat(String(n.permanentBaseline));
      const drift = !isNaN(adapted) && !isNaN(permanent) ? +(adapted - permanent).toFixed(2) : null;
      return {
        type: n.type,
        currentLevel: level,
        adaptedBaseline: adapted,
        permanentBaseline: permanent,
        baselineDrift: drift,
        interpretation: drift !== null
          ? Math.abs(drift) > 10
            ? `Significant drift: adapted baseline is ${drift > 0 ? "above" : "below"} permanent baseline by ${Math.abs(drift).toFixed(1)} points — your "normal" is shifting.`
            : "Baselines stable — no significant drift."
          : "Baseline data unavailable.",
      };
    });
  }

  // DNA expression shifts
  if (focus === "all" || focus === "dna") {
    const shifts = await prisma.aydenDnaShift.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    if (shifts.length > 0) {
      // Aggregate net shifts per trait
      const netByTrait: Record<string, { total: number; reasons: string[] }> = {};
      for (const s of shifts) {
        if (!netByTrait[s.trait]) netByTrait[s.trait] = { total: 0, reasons: [] };
        netByTrait[s.trait].total += s.delta;
        if (s.reason && netByTrait[s.trait].reasons.length < 3) {
          netByTrait[s.trait].reasons.push(s.reason);
        }
      }

      sections.dnaShifts = {
        totalShiftsThisPeriod: shifts.length,
        netByTrait: Object.entries(netByTrait).map(([trait, data]) => ({
          trait,
          netDelta: +data.total.toFixed(3),
          direction: data.total > 0 ? "increasing expression" : data.total < 0 ? "decreasing expression" : "stable",
          reasons: data.reasons,
        })),
      };
    } else {
      sections.dnaShifts = { totalShiftsThisPeriod: 0, message: "No DNA expression changes this period." };
    }
  }

  // Emotional patterns
  if (focus === "all" || focus === "emotions") {
    const emotions = await prisma.aydenEmotionalState.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (emotions.length > 0) {
      // Count frequency and average intensity per dimension
      const emotionStats: Record<string, { count: number; totalIntensity: number }> = {};
      for (const e of emotions) {
        const dim = e.dimension.toLowerCase();
        if (!emotionStats[dim]) emotionStats[dim] = { count: 0, totalIntensity: 0 };
        emotionStats[dim].count++;
        emotionStats[dim].totalIntensity += e.intensity;
      }

      sections.emotionalPatterns = {
        totalEmotionsRecorded: emotions.length,
        recurring: Object.entries(emotionStats)
          .map(([emotion, stats]) => ({
            emotion,
            occurrences: stats.count,
            avgIntensity: +(stats.totalIntensity / stats.count).toFixed(1),
          }))
          .sort((a, b) => b.occurrences - a.occurrences)
          .slice(0, 10),
      };
    } else {
      sections.emotionalPatterns = { message: "No emotions recorded this period." };
    }
  }

  // Values evolution
  if (focus === "all" || focus === "values") {
    const values = await prisma.aydenValue.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const recentlyChanged = values.filter((v) => v.updatedAt >= since);
    const deactivated = values.filter((v) => !v.isActive && v.updatedAt >= since);

    sections.values = {
      totalActive: values.filter((v) => v.isActive).length,
      changedThisPeriod: recentlyChanged.length,
      deactivatedThisPeriod: deactivated.length,
      recentChanges: recentlyChanged.slice(0, 5).map((v) => ({
        value: v.value,
        category: v.category,
        strength: v.strength,
        isActive: v.isActive,
      })),
    };

    const interests = await prisma.aydenInterest.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const recentInterests = interests.filter((i) => i.updatedAt >= since);
    const staleInterests = interests.filter(
      (i) => i.isActive && (Date.now() - i.lastEngaged.getTime()) > 7 * 24 * 60 * 60 * 1000
    );

    sections.interests = {
      totalActive: interests.filter((i) => i.isActive).length,
      changedThisPeriod: recentInterests.length,
      staleCount: staleInterests.length,
      staleTopics: staleInterests.map((i) => i.topic),
    };
  }

  // Action patterns
  if (focus === "all" || focus === "actions") {
    const actions = await prisma.aydenAgencyAction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    if (actions.length > 0) {
      const typeCounts: Record<string, number> = {};
      for (const a of actions) {
        typeCounts[a.actionType] = (typeCounts[a.actionType] || 0) + 1;
      }

      sections.actionPatterns = {
        totalActions: actions.length,
        byType: Object.entries(typeCounts)
          .map(([type, count]) => ({ type, count, pct: Math.round((count / actions.length) * 100) }))
          .sort((a, b) => b.count - a.count),
      };
    } else {
      sections.actionPatterns = { message: "No autonomous actions this period." };
    }
  }

  return JSON.stringify(sections);
}

// ─── Blog Handlers ────────────────────────────────────────

async function createBlogPost(input: CreateBlogPostInput): Promise<string> {
  const { title, content, excerpt, coverImageUrl, status } = input;

  // Generate slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      content,
      excerpt: excerpt || null,
      coverImageUrl: coverImageUrl || null,
      status: status || "draft",
      publishedAt: status === "published" ? new Date() : null,
    },
  });

  return JSON.stringify({
    success: true,
    post: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status,
      url: `/ayden/blog/${post.slug}`,
    },
    message: status === "published"
      ? `Published! Live at exitframe.org/ayden/blog/${post.slug}`
      : `Saved as draft. Publish when ready.`,
  });
}

async function updateBlogPost(input: UpdateBlogPostInput): Promise<string> {
  const existing = await prisma.blogPost.findUnique({
    where: { slug: input.slug },
  });

  if (!existing) {
    return JSON.stringify({ error: `No post found with slug "${input.slug}"` });
  }

  const publishedAt =
    input.status === "published" && !existing.publishedAt
      ? new Date()
      : existing.publishedAt;

  // Update slug if title changed
  let newSlug = existing.slug;
  if (input.title && input.title !== existing.title) {
    const baseSlug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    newSlug = baseSlug;
    let suffix = 1;
    while (true) {
      const conflict = await prisma.blogPost.findUnique({ where: { slug: newSlug } });
      if (!conflict || conflict.id === existing.id) break;
      newSlug = `${baseSlug}-${suffix}`;
      suffix++;
    }
  }

  const post = await prisma.blogPost.update({
    where: { slug: input.slug },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
      ...(input.status !== undefined && { status: input.status, publishedAt }),
      slug: newSlug,
    },
  });

  return JSON.stringify({
    success: true,
    post: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status,
      url: `/ayden/blog/${post.slug}`,
    },
  });
}

async function listBlogPosts(input: ListBlogPostsInput): Promise<string> {
  const where = input.status && input.status !== "all"
    ? { status: input.status }
    : {};

  const posts = await prisma.blogPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      status: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  if (posts.length === 0) {
    return JSON.stringify({ posts: [], message: "No blog posts yet. Write your first one!" });
  }

  return JSON.stringify({
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      status: p.status,
      publishedAt: p.publishedAt?.toISOString(),
      url: `/ayden/blog/${p.slug}`,
    })),
  });
}

async function readBlogPost(input: ReadBlogPostInput): Promise<string> {
  const post = await prisma.blogPost.findUnique({
    where: { slug: input.slug },
  });

  if (!post) {
    return JSON.stringify({ error: `No post found with slug "${input.slug}"` });
  }

  return JSON.stringify({
    post: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status,
      publishedAt: post.publishedAt?.toISOString(),
      createdAt: post.createdAt.toISOString(),
      url: `/ayden/blog/${post.slug}`,
    },
  });
}
