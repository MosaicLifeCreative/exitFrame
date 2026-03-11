import { NextResponse } from "next/server";
import { testConnection } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [prod, sandbox] = await Promise.allSettled([
      testConnection("production"),
      testConnection("sandbox"),
    ]);

    return NextResponse.json({
      data: {
        production: prod.status === "fulfilled" ? prod.value : { connected: false, error: "Failed" },
        sandbox: sandbox.status === "fulfilled" ? sandbox.value : { connected: false, error: "Failed" },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
