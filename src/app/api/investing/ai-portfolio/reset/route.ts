import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  startingCapital: z.number().positive("Starting capital must be positive"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Deactivate current portfolio
    await prisma.aiPortfolio.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new portfolio
    const portfolio = await prisma.aiPortfolio.create({
      data: {
        cashBalance: parsed.data.startingCapital,
        startingCapital: parsed.data.startingCapital,
      },
    });

    return NextResponse.json({
      data: {
        id: portfolio.id,
        cashBalance: Number(portfolio.cashBalance),
        startingCapital: Number(portfolio.startingCapital),
        inceptionDate: portfolio.inceptionDate,
      },
    });
  } catch (error) {
    console.error("Failed to reset AI portfolio:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to reset: ${msg}` }, { status: 500 });
  }
}
