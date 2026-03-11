import { NextResponse } from "next/server";
import { getPositions } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const positions = await getPositions();

    const equities = positions.filter((p) => p.instrumentType === "Equity");
    const options = positions.filter((p) => p.instrumentType === "Equity Option");

    let totalMarketValue = 0;
    let totalUnrealizedPnl = 0;
    for (const p of positions) {
      totalMarketValue += p.marketValue;
      totalUnrealizedPnl += p.unrealizedPnl;
    }

    return NextResponse.json({
      data: {
        positions,
        summary: {
          totalPositions: positions.length,
          equityPositions: equities.length,
          optionPositions: options.length,
          totalMarketValue: Math.round(totalMarketValue * 100) / 100,
          totalUnrealizedPnl: Math.round(totalUnrealizedPnl * 100) / 100,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
