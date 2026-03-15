import { NextRequest, NextResponse } from "next/server";
import { executeBackgroundTask } from "@/lib/background-task";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

// POST: Execute a background task (long-running, protected by CRON_SECRET)
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

    // Execute the task — this is the long-running part
    await executeBackgroundTask(taskId);

    return NextResponse.json({ data: { success: true, taskId } });
  } catch (error) {
    console.error("Background task execution error:", error);
    return NextResponse.json({ error: "Execution failed" }, { status: 500 });
  }
}
