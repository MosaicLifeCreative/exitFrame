import { NextResponse } from "next/server";
import { testConnection, getSandboxClient } from "@/lib/tastytrade";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [prod, sandbox] = await Promise.allSettled([
      testConnection("production"),
      testConnection("sandbox"),
    ]);

    // Temporary debug: see raw sandbox accounts response
    let sandboxDebug: unknown = null;
    try {
      const client = getSandboxClient();
      const raw = await client.accountsAndCustomersService.getCustomerAccounts();
      sandboxDebug = raw;
    } catch (e) {
      sandboxDebug = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
      data: {
        production: prod.status === "fulfilled" ? prod.value : { connected: false, error: "Failed" },
        sandbox: sandbox.status === "fulfilled" ? sandbox.value : { connected: false, error: "Failed" },
        sandboxDebug,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
