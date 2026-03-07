import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateHoldingSchema = z.object({
  ticker: z.string().min(1).transform((v) => v.toUpperCase().trim()).optional(),
  companyName: z.string().min(1).optional(),
  shares: z.number().positive().optional(),
  avgCostBasis: z.number().nonnegative().optional(),
  sector: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid holding ID" }, { status: 400 });
    }

    const holding = await prisma.portfolioHolding.findUnique({ where: { id } });

    if (!holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    return NextResponse.json({ data: holding });
  } catch (error) {
    console.error("Failed to get holding:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to get holding: ${msg}` }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid holding ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateHoldingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const holding = await prisma.portfolioHolding.update({
      where: { id },
      data: parsed.data,
    });

    logActivity({
      domain: "life",
      module: "investing",
      activityType: "updated",
      title: `Updated ${holding.ticker} holding`,
      refType: "portfolio_holding",
      refId: holding.id,
    });

    return NextResponse.json({ data: holding });
  } catch (error) {
    console.error("Failed to update holding:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to update holding: ${msg}` }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid holding ID" }, { status: 400 });
    }

    const holding = await prisma.portfolioHolding.update({
      where: { id },
      data: { isActive: false },
    });

    logActivity({
      domain: "life",
      module: "investing",
      activityType: "updated",
      title: `Removed ${holding.ticker} from portfolio`,
      refType: "portfolio_holding",
      refId: holding.id,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete holding:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to delete holding: ${msg}` }, { status: 500 });
  }
}
