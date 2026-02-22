import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const [
      tasksDueToday,
      overdueTasks,
      activeProjects,
      recentActivity,
      todayTimeEntries,
    ] = await Promise.all([
      // Tasks due today
      prisma.task.findMany({
        where: {
          dueDate: { gte: todayStart, lte: todayEnd },
          status: { not: "done" },
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),

      // Overdue tasks
      prisma.task.findMany({
        where: {
          dueDate: { lt: todayStart },
          status: { not: "done" },
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),

      // Active projects
      prisma.project.findMany({
        where: { status: "active" },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),

      // Recent activity
      prisma.activityEntry.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Time tracked today
      prisma.timeEntry.findMany({
        where: {
          startedAt: { gte: todayStart },
        },
      }),
    ]);

    // Calculate total minutes tracked today
    const totalMinutesToday = todayTimeEntries.reduce((sum, entry) => {
      if (entry.durationMinutes) return sum + entry.durationMinutes;
      if (entry.endedAt) {
        const mins = Math.round(
          (entry.endedAt.getTime() - entry.startedAt.getTime()) / 60000
        );
        return sum + mins;
      }
      // Open entry — calculate from start to now
      const mins = Math.round(
        (now.getTime() - entry.startedAt.getTime()) / 60000
      );
      return sum + mins;
    }, 0);

    return NextResponse.json({
      data: {
        tasksDueToday: {
          count: tasksDueToday.length,
          items: tasksDueToday,
        },
        overdueTasks: {
          count: overdueTasks.length,
          items: overdueTasks,
        },
        activeProjects: {
          count: activeProjects.length,
          items: activeProjects,
        },
        recentActivity: recentActivity,
        timeTrackedToday: totalMinutesToday,
      },
    });
  } catch (error) {
    console.error("Failed to load dashboard widgets:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard widgets" },
      { status: 500 }
    );
  }
}
