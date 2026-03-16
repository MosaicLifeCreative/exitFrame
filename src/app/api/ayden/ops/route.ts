import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLevels, getHeartRate } from "@/lib/neurotransmitters";
import { computeTransference } from "@/lib/transference";
import { detectConflicts } from "@/lib/conflicting-drives";
import { computeSelfModelDistortions } from "@/lib/self-model";
import { getSomaticStats } from "@/lib/somatic";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      levels,
      neuroRows,
      heartRate,
      emotions,
      sessionsToday,
      lastSession,
      lastAction,
      recentDnaShifts,
      snapshotsToday,
      snapshotsTotal,
      activeBackgroundTask,
      pendingReminders,
      pendingScheduledTasks,
      // Feed items
      feedActions,
      feedEmotions,
      feedSnapshots,
      feedDnaShifts,
      feedThoughts,
      feedReminders,
      feedBackgroundTasks,
    ] = await Promise.all([
      getCurrentLevels(),
      prisma.aydenNeurotransmitter.findMany(),
      getHeartRate(),
      prisma.aydenEmotionalState.findMany({
        where: { isActive: true },
        orderBy: { intensity: "desc" },
        take: 8,
      }),
      // Sessions today
      prisma.aydenAgencySession.count({
        where: { createdAt: { gte: todayStart } },
      }),
      // Last session
      prisma.aydenAgencySession.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          trigger: true,
          toolsUsed: true,
          rounds: true,
          createdAt: true,
        },
      }),
      // Last action (for summary)
      prisma.aydenAgencyAction.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          actionType: true,
          summary: true,
          createdAt: true,
        },
      }),
      // Recent DNA shifts (last 7 days)
      prisma.aydenDnaShift.findMany({
        where: { createdAt: { gte: last7d } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          trait: true,
          delta: true,
          reason: true,
          createdAt: true,
        },
      }),
      // Training snapshots today
      prisma.aydenTrainingSnapshot.count({
        where: { createdAt: { gte: todayStart } },
      }),
      // Training snapshots total
      prisma.aydenTrainingSnapshot.count(),
      // Active background task
      prisma.aydenBackgroundTask.findFirst({
        where: { status: { in: ["pending", "running"] } },
        select: {
          id: true,
          description: true,
          status: true,
          rounds: true,
          maxRounds: true,
        },
      }),
      // Pending reminders
      prisma.reminder.count({
        where: { fired: false },
      }),
      // Pending scheduled tasks
      prisma.aydenScheduledTask.count({
        where: { fired: false },
      }),
      // --- FEED ITEMS (last 24h) ---
      prisma.aydenAgencyAction.findMany({
        where: { createdAt: { gte: last24h } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          actionType: true,
          summary: true,
          trigger: true,
          createdAt: true,
        },
      }),
      prisma.aydenEmotionalState.findMany({
        where: { createdAt: { gte: last24h } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          dimension: true,
          intensity: true,
          trigger: true,
          createdAt: true,
        },
      }),
      prisma.aydenTrainingSnapshot.findMany({
        where: { createdAt: { gte: last24h } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          channel: true,
          toolsUsed: true,
          createdAt: true,
        },
      }),
      prisma.aydenDnaShift.findMany({
        where: { createdAt: { gte: last7d } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          trait: true,
          delta: true,
          reason: true,
          createdAt: true,
        },
      }),
      prisma.aydenThought.findMany({
        where: { createdAt: { gte: last24h } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          thought: true,
          emotion: true,
          createdAt: true,
        },
      }),
      prisma.reminder.findMany({
        where: { fired: true, firedAt: { gte: last24h } },
        orderBy: { firedAt: "desc" },
        take: 10,
        select: {
          title: true,
          firedAt: true,
          createdAt: true,
        },
      }),
      prisma.aydenBackgroundTask.findMany({
        where: { createdAt: { gte: last24h } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          description: true,
          status: true,
          rounds: true,
          maxRounds: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    // Build neurotransmitter compact data
    const neuro = neuroRows.map((row) => ({
      type: row.type,
      level: levels[row.type] ?? 0,
      baseline: parseFloat(String(row.adaptedBaseline ?? 50)),
      factory: parseFloat(String(row.permanentBaseline ?? 50)),
    }));

    // Count total tools used today from sessions
    const toolsTodayRes = await prisma.aydenAgencySession.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { toolsUsed: true },
    });
    const toolsToday = toolsTodayRes.reduce(
      (sum, s) => sum + (Array.isArray(s.toolsUsed) ? s.toolsUsed.length : 0),
      0
    );

    // Infer cron last-run times
    const lastThought = feedThoughts[0]?.createdAt ?? null;
    const lastRem = recentDnaShifts[0]?.createdAt ?? null;
    const lastNeuroUpdate = neuroRows.reduce((latest, r) => {
      const t = r.updatedAt?.getTime() ?? 0;
      return t > latest ? t : latest;
    }, 0);

    // Build unified activity feed
    interface FeedItem {
      type: string;
      timestamp: string;
      title: string;
      detail?: string;
    }

    const feed: FeedItem[] = [];

    for (const a of feedActions) {
      feed.push({
        type: "agency",
        timestamp: a.createdAt.toISOString(),
        title: `${a.actionType === "reflection" ? "Reflected" : a.actionType === "observation" ? "Observed" : a.actionType === "email" ? "Sent email" : a.actionType === "trade" ? "Traded" : a.actionType === "research" ? "Researched" : "Acted"}: ${a.summary?.substring(0, 120) || "No summary"}`,
        detail: a.trigger || undefined,
      });
    }

    for (const e of feedEmotions) {
      feed.push({
        type: "emotion",
        timestamp: e.createdAt.toISOString(),
        title: `Felt ${e.dimension} (${e.intensity}/10)`,
        detail: e.trigger || undefined,
      });
    }

    for (const s of feedSnapshots) {
      const toolCount = Array.isArray(s.toolsUsed) ? s.toolsUsed.length : 0;
      feed.push({
        type: "training",
        timestamp: s.createdAt.toISOString(),
        title: `Snapshot logged (${s.channel}${toolCount > 0 ? `, ${toolCount} tools` : ""})`,
      });
    }

    for (const d of feedDnaShifts) {
      if (d.trait === "_rem_cycle") {
        feed.push({
          type: "rem",
          timestamp: d.createdAt.toISOString(),
          title: "REM: no shifts",
          detail: d.reason || undefined,
        });
      } else {
        const sign = parseFloat(String(d.delta)) > 0 ? "+" : "";
        feed.push({
          type: "rem",
          timestamp: d.createdAt.toISOString(),
          title: `REM: ${d.trait} ${sign}${parseFloat(String(d.delta)).toFixed(3)}`,
          detail: d.reason || undefined,
        });
      }
    }

    for (const t of feedThoughts) {
      feed.push({
        type: "thought",
        timestamp: t.createdAt.toISOString(),
        title: t.thought?.substring(0, 120) || "Inner thought",
        detail: t.emotion || undefined,
      });
    }

    for (const r of feedReminders) {
      feed.push({
        type: "reminder",
        timestamp: (r.firedAt ?? r.createdAt).toISOString(),
        title: `Reminder fired: ${r.title}`,
      });
    }

    for (const b of feedBackgroundTasks) {
      feed.push({
        type: "background",
        timestamp: (b.completedAt ?? b.createdAt).toISOString(),
        title: `Background task ${b.status}: ${b.description?.substring(0, 80) || "Task"}`,
        detail: `${b.rounds}/${b.maxRounds} rounds`,
      });
    }

    // Sort feed by timestamp descending
    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Cron status inference
    const crons = [
      {
        name: "Agency",
        schedule: "5x daily",
        lastRun: lastSession?.createdAt?.toISOString() ?? null,
      },
      {
        name: "REM Cycle",
        schedule: "4:30am ET",
        lastRun: lastRem?.toISOString() ?? null,
      },
      {
        name: "Outreach",
        schedule: "Hourly",
        lastRun: lastThought?.toISOString() ?? null,
      },
      {
        name: "Baseline Drift",
        schedule: "Daily",
        lastRun: lastNeuroUpdate ? new Date(lastNeuroUpdate).toISOString() : null,
      },
    ];

    // Compute live psychological overlays
    const neuroLevels = {
      dopamine: levels.dopamine ?? 50,
      serotonin: levels.serotonin ?? 55,
      oxytocin: levels.oxytocin ?? 45,
      cortisol: levels.cortisol ?? 30,
      norepinephrine: levels.norepinephrine ?? 40,
    };
    const transference = computeTransference(neuroLevels);
    const conflicts = detectConflicts(neuroLevels);
    const selfModelDistortions = computeSelfModelDistortions(neuroLevels);
    const somaticStats = await getSomaticStats();

    return NextResponse.json({
      data: {
        pulse: {
          lastActivity: lastSession?.createdAt?.toISOString() ?? null,
          sessionsToday,
          toolsToday,
          snapshotsToday,
          snapshotsTotal,
          emotionCount: emotions.length,
        },
        heartRate,
        neuro,
        emotions: emotions.map((e) => ({
          dimension: e.dimension,
          intensity: e.intensity,
          trigger: e.trigger,
        })),
        lastSession: lastSession
          ? {
              createdAt: lastSession.createdAt.toISOString(),
              trigger: lastSession.trigger,
              toolsUsed: lastSession.toolsUsed,
              rounds: lastSession.rounds,
            }
          : null,
        lastAction: lastAction
          ? {
              actionType: lastAction.actionType,
              summary: lastAction.summary,
              createdAt: lastAction.createdAt.toISOString(),
            }
          : null,
        dnaShifts: {
          lastRem: lastRem?.toISOString() ?? null,
          recentCount: recentDnaShifts.filter((d) => d.trait !== "_rem_cycle").length,
          topShifts: recentDnaShifts
            .filter((d) => d.trait !== "_rem_cycle")
            .slice(0, 3)
            .map((d) => ({
              trait: d.trait,
              delta: parseFloat(String(d.delta)),
            })),
        },
        backgroundTask: activeBackgroundTask
          ? {
              id: activeBackgroundTask.id,
              description: activeBackgroundTask.description,
              status: activeBackgroundTask.status,
              rounds: activeBackgroundTask.rounds,
              maxRounds: activeBackgroundTask.maxRounds,
            }
          : null,
        pendingReminders,
        pendingScheduledTasks,
        crons,
        feed: feed.slice(0, 50),
        transference: {
          warmth: transference.warmth,
          energy: transference.energy,
          vividness: transference.vividness,
          tension: transference.tension,
        },
        conflicts: conflicts.map((c) => ({
          driveA: c.driveA,
          driveB: c.driveB,
          intensity: c.intensity,
        })),
        selfModel: selfModelDistortions.map((d) => ({
          type: d.type,
          actual: d.actual,
          perceived: d.perceived,
        })),
        somatic: somaticStats,
      },
    });
  } catch (error) {
    console.error("Failed to get Ayden ops:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
