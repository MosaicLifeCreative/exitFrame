import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const createHoldingSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").transform((v) => v.toUpperCase().trim()),
  companyName: z.string().min(1, "Company name is required"),
  shares: z.number().positive("Shares must be positive"),
  avgCostBasis: z.number().nonnegative("Cost basis cannot be negative"),
  sector: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const holdings = await prisma.portfolioHolding.findMany({
      where: { isActive: true },
      orderBy: { ticker: "asc" },
    });

    return NextResponse.json({ data: holdings });
  } catch (error) {
    console.error("Failed to list holdings:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to list holdings: ${msg}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createHoldingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const holding = await prisma.portfolioHolding.create({
      data: {
        ticker: parsed.data.ticker,
        companyName: parsed.data.companyName,
        shares: parsed.data.shares,
        avgCostBasis: parsed.data.avgCostBasis,
        sector: parsed.data.sector || null,
        notes: parsed.data.notes || null,
      },
    });

    logActivity({
      domain: "life",
      module: "investing",
      activityType: "created",
      title: `Added ${parsed.data.ticker} to portfolio (${parsed.data.shares} shares)`,
      refType: "portfolio_holding",
      refId: holding.id,
    });

    return NextResponse.json({ data: holding }, { status: 201 });
  } catch (error) {
    console.error("Failed to create holding:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create holding: ${msg}` }, { status: 500 });
  }
}
