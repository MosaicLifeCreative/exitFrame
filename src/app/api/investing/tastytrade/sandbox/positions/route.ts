import { NextResponse } from "next/server";
import { getSandboxPositions } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const positions = await getSandboxPositions();
    const equityPositions = positions.filter((p) => p.instrumentType === "Equity");
    const optionPositions = positions.filter((p) => p.instrumentType === "Equity Option");

    return NextResponse.json({
      data: {
        positions,
        summary: {
          totalPositions: positions.length,
          equityPositions: equityPositions.length,
          optionPositions: optionPositions.length,
          totalMarketValue: positions.reduce((sum, p) => sum + p.marketValue, 0),
          totalUnrealizedPnl: positions.reduce((sum, p) => sum + p.unrealizedPnl, 0),
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
