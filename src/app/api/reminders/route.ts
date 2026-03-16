import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: List reminders with optional status filter
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status"); // "upcoming" | "fired" | "all"
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
          : { fired: false }; // default to upcoming

    const orderBy =
      status === "fired"
        ? { firedAt: "desc" as const }
        : { remindAt: "asc" as const };

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy,
      take: limit,
    });

    return NextResponse.json({ data: reminders });
  } catch (error) {
    console.error("Failed to list reminders:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: Create a reminder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, remindAt, recurring } = body;

    if (!title || !remindAt) {
      return NextResponse.json(
        { error: "title and remindAt are required" },
        { status: 400 }
      );
    }

    const remindDate = new Date(remindAt);
    if (isNaN(remindDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid remindAt date" },
        { status: 400 }
      );
    }

    if (recurring && !["daily", "weekly"].includes(recurring)) {
      return NextResponse.json(
        { error: "recurring must be 'daily' or 'weekly'" },
        { status: 400 }
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        title,
        remindAt: remindDate,
        recurring: recurring || null,
      },
    });

    return NextResponse.json({ data: reminder }, { status: 201 });
  } catch (error) {
    console.error("Failed to create reminder:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: Update a reminder (edit, reschedule, or snooze)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, remindAt, recurring, fired } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (recurring !== undefined) data.recurring = recurring || null;
    if (remindAt !== undefined) {
      const remindDate = new Date(remindAt);
      if (isNaN(remindDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid remindAt date" },
          { status: 400 }
        );
      }
      data.remindAt = remindDate;
    }
    if (fired !== undefined) {
      data.fired = fired;
      if (fired) data.firedAt = new Date();
      else data.firedAt = null;
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Failed to update reminder:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE: Remove a reminder
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.reminder.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete reminder:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
