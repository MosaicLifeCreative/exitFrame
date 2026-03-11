import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { until } = await request.json();
    if (!until) {
      return NextResponse.json({ error: "Missing 'until' field" }, { status: 400 });
    }

    const snoozedUntil = new Date(until);
    if (isNaN(snoozedUntil.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: { snoozedUntil },
      select: { id: true, title: true, snoozedUntil: true },
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("Failed to snooze task:", error);
    return NextResponse.json({ error: "Failed to snooze task" }, { status: 500 });
  }
}
