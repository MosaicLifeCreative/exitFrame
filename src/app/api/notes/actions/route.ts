import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actions = await prisma.noteAction.findMany({
      where: { status: "pending" },
      include: {
        note: { select: { id: true, title: true, domain: true, domainRefId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: actions });
  } catch (error) {
    console.error("Failed to list pending actions:", error);
    return NextResponse.json({ error: "Failed to list actions" }, { status: 500 });
  }
}
