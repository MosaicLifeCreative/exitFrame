import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch a single swim workout
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workout = await prisma.swimWorkout.findUnique({ where: { id } });
    if (!workout) {
      return NextResponse.json({ error: "Swim workout not found" }, { status: 404 });
    }
    return NextResponse.json({ data: workout });
  } catch (error) {
    console.error("SwimWorkout GET error:", error);
    return NextResponse.json({ error: "Failed to fetch swim workout" }, { status: 500 });
  }
}

// DELETE: Remove a swim workout
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.swimWorkout.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("SwimWorkout DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete swim workout" }, { status: 500 });
  }
}
