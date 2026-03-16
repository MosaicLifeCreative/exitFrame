import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

export const dynamic = "force-dynamic";

// GET: Fire due reminders (called by Vercel cron every minute)
export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all unfired reminders that are due
    const dueReminders = await prisma.reminder.findMany({
      where: {
        fired: false,
        remindAt: { lte: now },
      },
    });

    if (dueReminders.length === 0) {
      return NextResponse.json({ data: { fired: 0 } });
    }

    let firedCount = 0;

    for (const reminder of dueReminders) {
      // Send push notification
      await sendPushNotification({
        title: "Reminder",
        body: reminder.title,
        tag: `reminder-${reminder.id}`,
        url: "/dashboard/reminders",
      });

      // Mark as fired
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { fired: true, firedAt: now },
      });

      // If recurring, create the next occurrence
      if (reminder.recurring) {
        const nextDate = new Date(reminder.remindAt);
        if (reminder.recurring === "daily") {
          nextDate.setDate(nextDate.getDate() + 1);
        } else if (reminder.recurring === "weekly") {
          nextDate.setDate(nextDate.getDate() + 7);
        }

        await prisma.reminder.create({
          data: {
            title: reminder.title,
            remindAt: nextDate,
            recurring: reminder.recurring,
            createdBy: reminder.createdBy,
          },
        });
      }

      firedCount++;
      console.log(`[reminders] Fired: "${reminder.title}"`);
    }

    return NextResponse.json({ data: { fired: firedCount } });
  } catch (error) {
    console.error("Reminders cron error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
