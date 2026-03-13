import { NextResponse } from "next/server";
import { getGoogleAuthUrl, getGoogleStatus, disconnectGoogle } from "@/lib/google";
import type { GoogleAccount } from "@/lib/google";

export const dynamic = "force-dynamic";

/**
 * GET — return Google integration status for both accounts.
 */
export async function GET() {
  try {
    const status = await getGoogleStatus();
    return NextResponse.json({ data: status });
  } catch (error) {
    console.error("Google status error:", error);
    return NextResponse.json({ error: "Failed to get Google status" }, { status: 500 });
  }
}

/**
 * POST — connect or disconnect Google.
 * Body: { action: "connect" | "disconnect", account?: "personal" | "business" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, account: rawAccount } = body;
    const account: GoogleAccount = rawAccount === "business" ? "business" : rawAccount === "ayden" ? "ayden" : "personal";

    switch (action) {
      case "connect": {
        const authUrl = getGoogleAuthUrl(account);
        return NextResponse.json({ data: { authUrl } });
      }
      case "disconnect": {
        await disconnectGoogle(account);
        return NextResponse.json({ data: { disconnected: true, account } });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Google API error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
