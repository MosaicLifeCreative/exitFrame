import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch full agency session transcript by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await prisma.aydenAgencySession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ data: session });
  } catch (error) {
    console.error("Failed to fetch agency session:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
