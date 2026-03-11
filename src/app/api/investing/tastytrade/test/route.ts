import { NextResponse } from "next/server";
import { testConnection, getProdClient } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [prod, sandbox] = await Promise.allSettled([
      testConnection("production"),
      testConnection("sandbox"),
    ]);

    // Debug: show raw account response shape if prod failed
    let debugAccountShape: unknown = null;
    const prodResult = prod.status === "fulfilled" ? prod.value : { connected: false, error: "Failed" };
    if (!prodResult.connected) {
      try {
        const client = getProdClient();
        const raw = await client.accountsAndCustomersService.getCustomerAccounts();
        debugAccountShape = JSON.parse(JSON.stringify(raw, null, 2));
      } catch {
        debugAccountShape = "Could not fetch debug data";
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData: Record<string, any> = {
      production: prodResult,
      sandbox: sandbox.status === "fulfilled" ? sandbox.value : { connected: false, error: "Failed" },
    };
    if (debugAccountShape) {
      responseData.debugAccountShape = debugAccountShape;
    }

    return NextResponse.json({ data: responseData });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
