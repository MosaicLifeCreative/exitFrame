import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const reminderTools: Anthropic.Tool[] = [
  {
    name: "set_reminder",
    description:
      "Set a reminder that fires a push notification at the specified time. Use when Trey says 'remind me...', 'ping me at...', or 'don't let me forget...'. No AI runs at fire time — the title IS the notification text, so make it clear and actionable.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description:
            "What to remind about. Write it as clear, actionable text since this is exactly what the push notification will say.",
        },
        remindAt: {
          type: "string",
          description:
            "ISO 8601 datetime in UTC. Interpret relative times ('in 2 hours', 'tomorrow at 9am', '3pm') relative to the current time in ET (America/New_York), then convert to UTC.",
        },
        recurring: {
          type: "string",
          enum: ["daily", "weekly"],
          description: "Optional. Set for recurring reminders.",
        },
      },
      required: ["title", "remindAt"],
    },
  },
  {
    name: "list_reminders",
    description:
      "List upcoming reminders. Use when Trey asks what reminders are set or wants to check his schedule.",
    input_schema: {
      type: "object" as const,
      properties: {
        includeCompleted: {
          type: "boolean",
          description: "Include fired reminders (default: false)",
        },
      },
      required: [],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeReminderTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "set_reminder":
      return setReminder(toolInput as unknown as SetReminderInput);
    case "list_reminders":
      return listReminders(toolInput as unknown as ListRemindersInput);
    default:
      return JSON.stringify({ error: `Unknown reminder tool: ${toolName}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface SetReminderInput {
  title: string;
  remindAt: string;
  recurring?: string;
}

interface ListRemindersInput {
  includeCompleted?: boolean;
}

// ─── Tool Implementations ────────────────────────────────

async function setReminder(input: SetReminderInput): Promise<string> {
  const remindDate = new Date(input.remindAt);
  if (isNaN(remindDate.getTime())) {
    return JSON.stringify({ error: "Invalid remindAt date. Use ISO 8601 format." });
  }

  if (input.recurring && !["daily", "weekly"].includes(input.recurring)) {
    return JSON.stringify({ error: "recurring must be 'daily' or 'weekly'" });
  }

  const reminder = await prisma.reminder.create({
    data: {
      title: input.title,
      remindAt: remindDate,
      recurring: input.recurring || null,
      createdBy: "ayden",
    },
  });

  const etTime = remindDate.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return JSON.stringify({
    success: true,
    reminder: {
      id: reminder.id,
      title: reminder.title,
      remindAt: etTime,
      recurring: reminder.recurring,
    },
  });
}

async function listReminders(input: ListRemindersInput): Promise<string> {
  const where = input.includeCompleted ? {} : { fired: false };

  const reminders = await prisma.reminder.findMany({
    where,
    orderBy: { remindAt: "asc" },
    take: 20,
  });

  if (reminders.length === 0) {
    return JSON.stringify({
      reminders: [],
      message: input.includeCompleted
        ? "No reminders found."
        : "No upcoming reminders.",
    });
  }

  const results = reminders.map((r) => ({
    id: r.id,
    title: r.title,
    remindAt: r.remindAt.toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    recurring: r.recurring,
    fired: r.fired,
    firedAt: r.firedAt
      ? r.firedAt.toLocaleString("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          minute: "2-digit",
        })
      : null,
  }));

  return JSON.stringify({ reminders: results });
}
