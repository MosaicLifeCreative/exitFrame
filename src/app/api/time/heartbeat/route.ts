import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const heartbeatSchema = z.object({
  route: z.string(),
  module: z.string(),
  domain: z.string(),
  clientId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  activityDescription: z.string(),
});

const TWO_MINUTES_MS = 2 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - TWO_MINUTES_MS);

    // Find the most recent entry that matches the same context
    const recentEntry = await prisma.timeEntry.findFirst({
      where: {
        module: parsed.data.module,
        clientId: parsed.data.clientId || null,
        endedAt: { gte: twoMinutesAgo },
      },
      orderBy: { endedAt: "desc" },
    });

    if (recentEntry) {
      // Extend the existing entry
      const durationMinutes = Math.round(
        (now.getTime() - new Date(recentEntry.startedAt).getTime()) / 60000
      );

      await prisma.timeEntry.update({
        where: { id: recentEntry.id },
        data: {
          endedAt: now,
          durationMinutes,
        },
      });

      return NextResponse.json({ data: { action: "extended", id: recentEntry.id } });
    }

    // Close any other open entries that haven't been updated
    await prisma.timeEntry.updateMany({
      where: {
        endedAt: null,
      },
      data: {
        endedAt: now,
      },
    });

    // Create a new entry
    const entry = await prisma.timeEntry.create({
      data: {
        domain: parsed.data.domain,
        module: parsed.data.module,
        clientId: parsed.data.clientId || null,
        projectId: parsed.data.projectId || null,
        activityDescription: parsed.data.activityDescription,
        startedAt: now,
        endedAt: now,
        durationMinutes: 0,
        source: "auto",
      },
    });

    return NextResponse.json({ data: { action: "created", id: entry.id } });
  } catch (error) {
    console.error("Failed to process heartbeat:", error);
    return NextResponse.json({ error: "Failed to process heartbeat" }, { status: 500 });
  }
}
