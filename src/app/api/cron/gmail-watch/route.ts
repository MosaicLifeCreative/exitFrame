import { NextRequest, NextResponse } from "next/server";
import { registerGmailWatch } from "@/lib/gmail-watch";

export const dynamic = "force-dynamic";

/**
 * Cron: Renew Gmail push notification watch.
 * Gmail watches expire after 7 days. This runs every 5 days to stay ahead.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await registerGmailWatch();
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[gmail-watch-cron] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
