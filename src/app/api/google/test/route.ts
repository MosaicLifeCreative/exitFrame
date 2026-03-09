import { NextResponse } from "next/server";
import { getGoogleAccessToken, googleCalendarFetch, gmailFetch } from "@/lib/google";

export const dynamic = "force-dynamic";

/**
 * Quick diagnostic endpoint to test Google API connectivity.
 * Hit GET /api/google/test to see what's working and what's not.
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // Check tokens
  for (const account of ["personal", "business"] as const) {
    try {
      const token = await getGoogleAccessToken(account);
      results[`${account}_token`] = token ? "valid" : "not connected";
    } catch (err) {
      results[`${account}_token`] = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // Test Calendar API
  try {
    const events = await googleCalendarFetch<{ items?: unknown[] }>(
      "/calendars/primary/events",
      {
        params: {
          maxResults: "1",
          timeMin: new Date().toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
        },
        account: "business",
      }
    );
    results.calendar = { status: "ok", eventCount: events.items?.length ?? 0 };
  } catch (err) {
    results.calendar = { status: "error", message: err instanceof Error ? err.message : String(err) };
  }

  // Test Gmail API
  try {
    const messages = await gmailFetch<{ messages?: unknown[]; resultSizeEstimate?: number }>(
      "/messages",
      {
        params: { q: "is:inbox", maxResults: "1" },
        account: "business",
      }
    );
    results.gmail = { status: "ok", messageCount: messages.resultSizeEstimate ?? 0 };
  } catch (err) {
    results.gmail = { status: "error", message: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({ data: results });
}
