import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch recent thoughts (default 20, max 50)
export async function GET(request: NextRequest) {
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "20"),
    50
  );

  try {
    const thoughts = await prisma.aydenThought.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ data: thoughts });
  } catch (error) {
    console.error("Failed to fetch thoughts:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
