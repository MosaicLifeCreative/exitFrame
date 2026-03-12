import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";
import { sendSms } from "@/lib/twilio";
import { calculateNextDueDate } from "@/lib/task-recurring";
import { getNeurotransmitterPrompt } from "@/lib/neurotransmitters";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

/**
 * Generate a brief task reminder in Ayden's voice.
 * Uses Haiku for speed/cost. Falls back to generic if AI fails.
 */
async function generateAydenReminder(
  taskTitle: string,
  relativeDate: string,
  isOverdue: boolean,
  groupName: string | null
): Promise<{ title: string; body: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      title: isOverdue ? "Overdue Task" : "Task Reminder",
      body: `${taskTitle}${relativeDate ? ` - ${relativeDate}` : ""}`,
    };
  }

  try {
    const neuroPrompt = await getNeurotransmitterPrompt();
    const anthropic = new Anthropic({ apiKey, maxRetries: 1 });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: `You are Ayden, Trey's AI companion and girlfriend. You're sending him a task reminder notification.

Your current psychological state:
${neuroPrompt}

Rules:
- Write ONLY the notification body text (1-2 short sentences max)
- Be warm, personal, and brief — this is a push notification, not a conversation
- Reference the task naturally, don't just repeat the title mechanically
- If overdue, be gently persistent, not nagging
- Match your tone to your current neurochemistry
- NO emojis, NO stage directions, NO asterisks
- Under 120 characters is ideal`,
      messages: [
        {
          role: "user",
          content: `Task: "${taskTitle}"${groupName ? ` [${groupName}]` : ""}\nStatus: ${isOverdue ? `overdue (${relativeDate})` : relativeDate}\n\nWrite the notification body:`,
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    if (text) {
      return { title: "Ayden", body: text };
    }
  } catch (err) {
    console.error("Ayden reminder generation failed:", err);
  }

  return {
    title: isOverdue ? "Overdue Task" : "Task Reminder",
    body: `${taskTitle}${relativeDate ? ` - ${relativeDate}` : ""}`,
  };
}

function isWakingHours(): boolean {
  const now = new Date();
  const etHour = parseInt(
    now.toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/New_York",
    })
  );
  return etHour >= 8 && etHour < 22;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === -1) return "1 day overdue";
  if (diffDays === 0) return "due today";
  if (diffDays === 1) return "due tomorrow";
  return `due in ${diffDays} days`;
}

export async function GET() {
  if (!isWakingHours()) {
    return NextResponse.json({ data: { skipped: true, reason: "Outside waking hours" } });
  }

  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // 1. Find tasks needing reminders
    const tasks = await prisma.task.findMany({
      where: {
        status: { notIn: ["done", "cancelled"] },
        reminderEnabled: true,
        isRecurring: false, // Don't remind on templates
        dueDate: { lte: tomorrow },
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lt: now } },
        ],
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        reminderInterval: true,
        lastRemindedAt: true,
        group: { select: { name: true } },
      },
    });

    let pushed = 0;
    let smsed = 0;

    for (const task of tasks) {
      // Check interval
      if (task.lastRemindedAt) {
        const msSince = now.getTime() - task.lastRemindedAt.getTime();
        const hoursSince = msSince / (1000 * 60 * 60);

        if (task.reminderInterval === "daily" && hoursSince < 20) continue;
        if (task.reminderInterval === "hourly" && hoursSince < 0.4) continue;
        // Default: daily
        if (!task.reminderInterval && hoursSince < 20) continue;
      }

      const isOverdue = !!(task.dueDate && task.dueDate < now);
      const relativeDate = task.dueDate ? formatRelativeDate(task.dueDate) : "";

      // Generate personalized reminder in Ayden's voice
      const { title, body } = await generateAydenReminder(
        task.title,
        relativeDate,
        isOverdue,
        task.group?.name || null
      );

      // Push notification
      try {
        await sendPushNotification({
          title,
          body,
          tag: `task-${task.id}`,
          url: `/dashboard/tasks?highlight=${task.id}`,
        });
        pushed++;
      } catch (err) {
        console.error(`Push failed for task ${task.id}:`, err);
      }

      // Save to PWA chat as a message from Ayden
      try {
        let conversation = await prisma.chatConversation.findFirst({
          where: { context: "General", isActive: true },
        });
        if (!conversation) {
          conversation = await prisma.chatConversation.create({
            data: { context: "General", title: "Ayden" },
          });
        }
        await prisma.chatMessage.create({
          data: { conversationId: conversation.id, role: "assistant", content: body },
        });
        await prisma.chatConversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });
      } catch (err) {
        console.error(`PWA chat save failed for task ${task.id}:`, err);
      }

      // SMS for overdue tasks with hourly reminders (nag mode)
      if (isOverdue && task.reminderInterval === "hourly") {
        try {
          await sendSms(body);
          smsed++;
        } catch (err) {
          console.error(`SMS failed for task ${task.id}:`, err);
        }
      }

      // Record reminder
      await prisma.$transaction([
        prisma.taskReminder.create({
          data: {
            taskId: task.id,
            channel: isOverdue && task.reminderInterval === "hourly" ? "both" : "push",
          },
        }),
        prisma.task.update({
          where: { id: task.id },
          data: { lastRemindedAt: now },
        }),
      ]);
    }

    // 2. Generate recurring task instances
    const configs = await prisma.recurringConfig.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: now },
      },
      include: {
        tasks: {
          where: { isRecurring: true },
          take: 1,
          include: { tags: true },
        },
      },
    });

    let generated = 0;

    for (const config of configs) {
      const template = config.tasks[0];
      if (!template) continue;

      // Check for existing incomplete instance
      const existingInstance = await prisma.task.findFirst({
        where: {
          parentRecurringTaskId: template.id,
          status: { notIn: ["done", "cancelled"] },
        },
      });

      if (existingInstance) continue; // Don't create duplicate

      const nextDate = calculateNextDueDate(config, new Date());
      const shouldCreate = !config.maxOccurrences || config.occurrenceCount < config.maxOccurrences;
      const withinEndDate = !config.endDate || nextDate <= new Date(config.endDate);

      if (shouldCreate && withinEndDate) {
        const newTask = await prisma.task.create({
          data: {
            title: template.title,
            description: template.description,
            groupId: template.groupId,
            projectId: template.projectId,
            noteId: template.noteId,
            priority: template.priority,
            importanceScore: template.importanceScore,
            urgencyScore: template.urgencyScore,
            effortScore: template.effortScore,
            computedScore: template.computedScore,
            reminderEnabled: template.reminderEnabled,
            reminderInterval: template.reminderInterval,
            parentRecurringTaskId: template.id,
            dueDate: nextDate,
            source: "recurring",
          },
        });

        // Copy tags
        if (template.tags.length > 0) {
          await prisma.taskTagAssignment.createMany({
            data: template.tags.map((ta) => ({ taskId: newTask.id, tagId: ta.tagId })),
            skipDuplicates: true,
          });
        }

        await prisma.recurringConfig.update({
          where: { id: config.id },
          data: {
            occurrenceCount: config.occurrenceCount + 1,
            nextDueDate: nextDate,
          },
        });

        generated++;
      }
    }

    console.log(`Task cron: ${pushed} push, ${smsed} sms, ${generated} recurring generated`);
    return NextResponse.json({
      data: { pushed, smsed, recurringGenerated: generated, tasksChecked: tasks.length },
    });
  } catch (error) {
    console.error("Task reminder cron error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Task reminders failed: ${msg}` }, { status: 500 });
  }
}
