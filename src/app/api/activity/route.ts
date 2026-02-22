import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const domainRefId = searchParams.get("domain_ref_id");
    const moduleFilter = searchParams.get("module");
    const activityType = searchParams.get("activity_type");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (domain) where.domain = domain;
    if (domainRefId) where.domainRefId = domainRefId;
    if (moduleFilter) where.module = moduleFilter;
    if (activityType) where.activityType = activityType;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const [entries, total] = await Promise.all([
      prisma.activityEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activityEntry.count({ where }),
    ]);

    return NextResponse.json({ data: entries, total });
  } catch (error) {
    console.error("Failed to list activity:", error);
    return NextResponse.json({ error: "Failed to list activity" }, { status: 500 });
  }
}
