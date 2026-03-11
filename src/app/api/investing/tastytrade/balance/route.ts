import { NextResponse } from "next/server";
import { getBalance } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const balance = await getBalance();
    return NextResponse.json({ data: balance });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
