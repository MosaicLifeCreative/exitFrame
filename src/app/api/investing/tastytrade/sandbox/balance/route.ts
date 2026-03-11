import { NextResponse } from "next/server";
import { getSandboxBalance } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const balance = await getSandboxBalance();
    return NextResponse.json({ data: balance });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
