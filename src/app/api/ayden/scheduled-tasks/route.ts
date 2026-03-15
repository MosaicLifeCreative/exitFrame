import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch scheduled tasks with optional filters
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status"); // "pending" | "fired" | "all"
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "50"),
    100
  );

  try {
    const where =
      status === "fired"
        ? { fired: true }
        : status === "all"
          ? {}
          : { fired: false }; // default to pending

    const tasks = await prisma.aydenScheduledTask.findMany({
      where,
      orderBy: { triggerAt: "asc" },
      take: limit,
    });

    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error("Failed to fetch scheduled tasks:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: Create a new scheduled task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, reason, triggerAt } = body;

    if (!task || !triggerAt) {
      return NextResponse.json(
        { error: "task and triggerAt are required" },
        { status: 400 }
      );
    }

    const triggerDate = new Date(triggerAt);
    if (isNaN(triggerDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid triggerAt date" },
        { status: 400 }
      );
    }

    const created = await prisma.aydenScheduledTask.create({
      data: {
        task,
        reason: reason || null,
        triggerAt: triggerDate,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to create scheduled task:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: Update a scheduled task (edit task text, reschedule, or cancel)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, task, reason, triggerAt, fired } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (task !== undefined) data.task = task;
    if (reason !== undefined) data.reason = reason;
    if (triggerAt !== undefined) {
      const triggerDate = new Date(triggerAt);
      if (isNaN(triggerDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid triggerAt date" },
          { status: 400 }
        );
      }
      data.triggerAt = triggerDate;
    }
    if (fired !== undefined) {
      data.fired = fired;
      if (fired) data.firedAt = new Date();
      else data.firedAt = null;
    }

    const updated = await prisma.aydenScheduledTask.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Failed to update scheduled task:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE: Remove a scheduled task
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.aydenScheduledTask.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete scheduled task:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
