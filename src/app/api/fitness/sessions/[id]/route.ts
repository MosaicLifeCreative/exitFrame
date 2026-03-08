import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Get a single session with full detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    const session = await prisma.workoutSession.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true } },
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ data: session });
  } catch (error) {
    console.error("Session GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

// DELETE: Delete a workout session and all its data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    await prisma.workoutSession.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Session DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
