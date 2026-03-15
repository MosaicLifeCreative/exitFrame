import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseBackgroundLock } from "@/lib/background-task";

export const dynamic = "force-dynamic";

// GET: Check task status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.aydenBackgroundTask.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        description: true,
        rounds: true,
        maxRounds: true,
        result: true,
        error: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("Failed to get background task:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE: Cancel a running task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.aydenBackgroundTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (task.status !== "running" && task.status !== "pending") {
      return NextResponse.json({ error: "Task is not active" }, { status: 400 });
    }

    await prisma.aydenBackgroundTask.update({
      where: { id },
      data: {
        status: "failed",
        error: "Cancelled by user",
        completedAt: new Date(),
      },
    });

    // Release the lock so new tasks can start
    await releaseBackgroundLock();

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to cancel background task:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
