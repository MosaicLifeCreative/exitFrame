import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const run = await prisma.onboardingRun.findUnique({
      where: { id: params.id },
      include: {
        template: true,
        client: { select: { id: true, name: true } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ data: run });
  } catch (error) {
    console.error("Failed to get onboarding run:", error);
    return NextResponse.json(
      { error: "Failed to get onboarding run" },
      { status: 500 }
    );
  }
}
