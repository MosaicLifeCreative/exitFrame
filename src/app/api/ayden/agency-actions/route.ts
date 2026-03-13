import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch agency actions with cursor pagination
export async function GET(request: NextRequest) {
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "20"),
    50
  );
  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;

  try {
    const actions = await prisma.aydenAgencyAction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = actions.length > limit;
    const data = hasMore ? actions.slice(0, limit) : actions;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({ data, nextCursor });
  } catch (error) {
    console.error("Failed to fetch agency actions:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
