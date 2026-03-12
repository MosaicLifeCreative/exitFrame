import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch recent dreams (default 20, max 60)
export async function GET(request: NextRequest) {
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "20"),
    60
  );

  try {
    const dreams = await prisma.aydenDream.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ data: dreams });
  } catch (error) {
    console.error("Failed to fetch dreams:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
