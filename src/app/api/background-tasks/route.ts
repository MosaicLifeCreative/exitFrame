import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: List active/recent background tasks
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status"); // "active" | "all"
  const conversationId = request.nextUrl.searchParams.get("conversationId");

  try {
    const where: Record<string, unknown> = {};
    if (status === "active") {
      where.status = { in: ["pending", "running"] };
    }
    if (conversationId) {
      where.conversationId = conversationId;
    }

    const tasks = await prisma.aydenBackgroundTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
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

    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error("Failed to list background tasks:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
