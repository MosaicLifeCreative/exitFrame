import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const runs = await prisma.onboardingRun.findMany({
      include: {
        template: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({ data: runs });
  } catch (error) {
    console.error("Failed to list onboarding runs:", error);
    return NextResponse.json(
      { error: "Failed to list onboarding runs" },
      { status: 500 }
    );
  }
}
