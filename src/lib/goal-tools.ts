import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const goalTools: Anthropic.Tool[] = [
  {
    name: "list_goals",
    description:
      "List the user's goals with their current status, progress, and milestones. Use to review what they're working toward.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["active", "completed", "paused", "abandoned"],
          description: "Filter by status (default: all)",
        },
        category: {
          type: "string",
          enum: ["health", "fitness", "financial", "home", "personal", "business"],
          description: "Filter by category (default: all)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_goal",
    description:
      "Create a new goal for the user. Can be quantitative (numeric target like weight, savings) or qualitative (milestone-based like renovate kitchen). Always confirm details before creating.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short goal title (e.g. 'Reach 168 lbs', 'Finish kitchen renovation')",
        },
        description: {
          type: "string",
          description: "Longer description of the goal and why it matters",
        },
        category: {
          type: "string",
          enum: ["health", "fitness", "financial", "home", "personal", "business"],
          description: "Goal category",
        },
        goalType: {
          type: "string",
          enum: ["quantitative", "qualitative"],
          description: "quantitative = has numeric target (weight, money). qualitative = milestone-based (project completion).",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Goal priority (default: medium)",
        },
        targetValue: {
          type: "number",
          description: "Target numeric value (quantitative goals only)",
        },
        startValue: {
          type: "number",
          description: "Starting numeric value (quantitative goals only)",
        },
        currentValue: {
          type: "number",
          description: "Current numeric value if different from start (quantitative goals only)",
        },
        unit: {
          type: "string",
          description: "Unit of measurement (e.g. 'lbs', '%', '$', 'miles')",
        },
        targetDate: {
          type: "string",
          description: "Target completion date in YYYY-MM-DD format (optional)",
        },
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Milestone title" },
              description: { type: "string", description: "Milestone description" },
            },
            required: ["title"],
          },
          description: "Initial milestones/checkpoints for the goal",
        },
      },
      required: ["title", "category", "goalType"],
    },
  },
  {
    name: "update_goal",
    description:
      "Update a goal's status, progress value, or details. Use to mark goals complete, pause them, or update current values.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the goal to update. Get from list_goals.",
        },
        status: {
          type: "string",
          enum: ["active", "completed", "paused", "abandoned"],
          description: "New status",
        },
        currentValue: {
          type: "number",
          description: "Updated current value (quantitative goals)",
        },
        title: { type: "string" },
        description: { type: "string" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
        targetDate: {
          type: "string",
          description: "New target date in YYYY-MM-DD format, or null to remove",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "log_goal_progress",
    description:
      "Log a progress check-in for a goal. For quantitative goals, include a numeric value. For qualitative goals, include notes about what was accomplished.",
    input_schema: {
      type: "object" as const,
      properties: {
        goalId: {
          type: "string",
          description: "UUID of the goal. Get from list_goals.",
        },
        value: {
          type: "number",
          description: "Numeric value for quantitative goals (e.g. current weight, savings amount)",
        },
        notes: {
          type: "string",
          description: "Progress notes — what was accomplished, observations, etc.",
        },
      },
      required: ["goalId"],
    },
  },
  {
    name: "toggle_milestone",
    description:
      "Mark a milestone as completed or uncompleted. Use when the user reports completing a step toward their goal.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the milestone. Get from list_goals (milestones are included).",
        },
        isCompleted: {
          type: "boolean",
          description: "true to mark complete, false to mark incomplete",
        },
      },
      required: ["id", "isCompleted"],
    },
  },
  {
    name: "add_milestone",
    description:
      "Add a new milestone to an existing goal. Use when breaking down a goal into additional steps.",
    input_schema: {
      type: "object" as const,
      properties: {
        goalId: {
          type: "string",
          description: "UUID of the goal. Get from list_goals.",
        },
        title: {
          type: "string",
          description: "Milestone title",
        },
        description: {
          type: "string",
          description: "Optional description",
        },
      },
      required: ["goalId", "title"],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeGoalTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "list_goals":
      return listGoals(toolInput as unknown as ListGoalsInput);
    case "create_goal":
      return createGoal(toolInput as unknown as CreateGoalInput);
    case "update_goal":
      return updateGoal(toolInput as unknown as UpdateGoalInput);
    case "log_goal_progress":
      return logProgress(toolInput as unknown as LogProgressInput);
    case "toggle_milestone":
      return toggleMilestone(toolInput as unknown as ToggleMilestoneInput);
    case "add_milestone":
      return addMilestone(toolInput as unknown as AddMilestoneInput);
    default:
      return JSON.stringify({ error: `Unknown goal tool: ${toolName}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface ListGoalsInput {
  status?: string;
  category?: string;
}

interface MilestoneInput {
  title: string;
  description?: string;
}

interface CreateGoalInput {
  title: string;
  description?: string;
  category: string;
  goalType: string;
  priority?: string;
  targetValue?: number;
  startValue?: number;
  currentValue?: number;
  unit?: string;
  targetDate?: string;
  milestones?: MilestoneInput[];
}

interface UpdateGoalInput {
  id: string;
  status?: string;
  currentValue?: number;
  title?: string;
  description?: string;
  priority?: string;
  targetDate?: string | null;
}

interface LogProgressInput {
  goalId: string;
  value?: number;
  notes?: string;
}

interface ToggleMilestoneInput {
  id: string;
  isCompleted: boolean;
}

interface AddMilestoneInput {
  goalId: string;
  title: string;
  description?: string;
}

// ─── Tool Implementations ────────────────────────────────

async function listGoals(input: ListGoalsInput): Promise<string> {
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  if (input.category) where.category = input.category;

  const goals = await prisma.goal.findMany({
    where,
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
      progress: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  const result = goals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    goalType: g.goalType,
    status: g.status,
    priority: g.priority,
    targetValue: g.targetValue ? Number(g.targetValue) : null,
    currentValue: g.currentValue ? Number(g.currentValue) : null,
    startValue: g.startValue ? Number(g.startValue) : null,
    unit: g.unit,
    targetDate: g.targetDate?.toISOString().slice(0, 10) ?? null,
    completedAt: g.completedAt?.toISOString().slice(0, 10) ?? null,
    milestones: g.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      isCompleted: m.isCompleted,
      completedAt: m.completedAt?.toISOString().slice(0, 10) ?? null,
    })),
    recentProgress: g.progress.map((p) => ({
      value: p.value ? Number(p.value) : null,
      notes: p.notes,
      date: p.createdAt.toISOString().slice(0, 10),
    })),
  }));

  return JSON.stringify({ goals: result, count: result.length });
}

async function createGoal(input: CreateGoalInput): Promise<string> {
  const milestones = input.milestones?.map((m, i) => ({
    title: m.title,
    description: m.description,
    sortOrder: i,
  }));

  const goal = await prisma.goal.create({
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      goalType: input.goalType,
      priority: input.priority || "medium",
      targetValue: input.targetValue,
      currentValue: input.currentValue ?? input.startValue,
      startValue: input.startValue,
      unit: input.unit,
      targetDate: input.targetDate ? new Date(input.targetDate + "T00:00:00Z") : undefined,
      milestones: milestones ? { create: milestones } : undefined,
    },
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
    },
  });

  return JSON.stringify({
    success: true,
    goal: {
      id: goal.id,
      title: goal.title,
      category: goal.category,
      goalType: goal.goalType,
      targetValue: goal.targetValue ? Number(goal.targetValue) : null,
      currentValue: goal.currentValue ? Number(goal.currentValue) : null,
      unit: goal.unit,
      targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null,
      milestoneCount: goal.milestones.length,
    },
  });
}

async function updateGoal(input: UpdateGoalInput): Promise<string> {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.currentValue !== undefined) data.currentValue = input.currentValue;
  if (input.targetDate !== undefined) {
    data.targetDate = input.targetDate ? new Date(input.targetDate + "T00:00:00Z") : null;
  }
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === "completed") {
      data.completedAt = new Date();
    } else {
      data.completedAt = null;
    }
  }

  const goal = await prisma.goal.update({
    where: { id: input.id },
    data,
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
    },
  });

  return JSON.stringify({
    success: true,
    goal: {
      id: goal.id,
      title: goal.title,
      status: goal.status,
      currentValue: goal.currentValue ? Number(goal.currentValue) : null,
      targetValue: goal.targetValue ? Number(goal.targetValue) : null,
      unit: goal.unit,
    },
  });
}

async function logProgress(input: LogProgressInput): Promise<string> {
  const entry = await prisma.goalProgress.create({
    data: {
      goalId: input.goalId,
      value: input.value,
      notes: input.notes,
      source: "claude",
    },
  });

  // Update currentValue if a numeric value was provided
  if (input.value !== undefined) {
    await prisma.goal.update({
      where: { id: input.goalId },
      data: { currentValue: input.value },
    });
  }

  return JSON.stringify({
    success: true,
    progress: {
      id: entry.id,
      value: entry.value ? Number(entry.value) : null,
      notes: entry.notes,
      date: entry.createdAt.toISOString().slice(0, 10),
    },
  });
}

async function toggleMilestone(input: ToggleMilestoneInput): Promise<string> {
  const milestone = await prisma.goalMilestone.update({
    where: { id: input.id },
    data: {
      isCompleted: input.isCompleted,
      completedAt: input.isCompleted ? new Date() : null,
    },
  });

  return JSON.stringify({
    success: true,
    milestone: {
      id: milestone.id,
      title: milestone.title,
      isCompleted: milestone.isCompleted,
    },
  });
}

async function addMilestone(input: AddMilestoneInput): Promise<string> {
  // Get the highest sort order for this goal
  const maxOrder = await prisma.goalMilestone.findFirst({
    where: { goalId: input.goalId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const milestone = await prisma.goalMilestone.create({
    data: {
      goalId: input.goalId,
      title: input.title,
      description: input.description,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    },
  });

  return JSON.stringify({
    success: true,
    milestone: {
      id: milestone.id,
      title: milestone.title,
      goalId: input.goalId,
    },
  });
}
