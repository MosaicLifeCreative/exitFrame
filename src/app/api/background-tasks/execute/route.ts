import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { executeBackgroundTask } from "@/lib/background-task";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

// POST: Execute a background task (long-running, protected by CRON_SECRET)
// Returns 202 immediately, runs execution via waitUntil so the caller isn't blocked
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // Schedule execution via waitUntil — Vercel keeps the function alive
    // but the response returns immediately so the caller isn't blocked
    waitUntil(
      executeBackgroundTask(taskId).catch((error) => {
        console.error("[bg-task-execute] Error:", error);
      })
    );

    return NextResponse.json({ data: { accepted: true, taskId } }, { status: 202 });
  } catch (error) {
    console.error("Background task execution error:", error);
    return NextResponse.json({ error: "Execution failed" }, { status: 500 });
  }
}
