import { NextRequest, NextResponse } from "next/server";
import { getOptionChain } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol");
    if (!symbol) {
      return NextResponse.json({ error: "symbol query parameter is required" }, { status: 400 });
    }

    const chain = await getOptionChain(symbol);
    return NextResponse.json({
      data: {
        symbol: symbol.toUpperCase(),
        expirations: chain,
        expirationCount: chain.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
