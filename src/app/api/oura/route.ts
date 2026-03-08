import { NextResponse } from "next/server";
import {
  getOuraAuthUrl,
  getOuraStatus,
  disconnectOura,
  syncOuraData,
  getRecentOuraData,
} from "@/lib/oura";

export const dynamic = "force-dynamic";

// GET: Get Oura connection status + recent data
export async function GET() {
  try {
    const status = await getOuraStatus();

    if (!status.connected) {
      return NextResponse.json({ data: { status, oura: null } });
    }

    const oura = await getRecentOuraData(30);
    return NextResponse.json({ data: { status, oura } });
  } catch (error) {
    console.error("Oura GET error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Actions — connect (get auth URL), sync, disconnect
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case "connect": {
        const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
        const baseUrl = vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
        const redirectUri = `${baseUrl}/api/oura/callback`;
        const authUrl = getOuraAuthUrl(redirectUri);
        return NextResponse.json({ data: { authUrl } });
      }

      case "sync": {
        const daysBack = (body as { daysBack?: number }).daysBack || 7;
        const results = await syncOuraData(daysBack);
        return NextResponse.json({ data: { synced: results } });
      }

      case "disconnect": {
        await disconnectOura();
        return NextResponse.json({ data: { disconnected: true } });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Oura POST error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
