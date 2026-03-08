import { NextRequest, NextResponse } from "next/server";
import { exchangeOuraCode, saveOuraIntegration, syncOuraData } from "@/lib/oura";

export const dynamic = "force-dynamic";

// OAuth callback — Oura redirects here after user authorizes
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/oura/callback`;

  if (error) {
    console.error("Oura OAuth error:", error);
    return NextResponse.redirect(`${baseUrl}/dashboard/health/sleep?oura=error&message=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/dashboard/health/sleep?oura=error&message=no_code`);
  }

  try {
    const tokens = await exchangeOuraCode(code, redirectUri);
    await saveOuraIntegration(tokens);

    // Do initial sync (last 30 days)
    try {
      await syncOuraData(30);
    } catch (syncErr) {
      console.error("Initial Oura sync error:", syncErr);
      // Non-fatal — connection succeeded, sync can retry later
    }

    return NextResponse.redirect(`${baseUrl}/dashboard/health/sleep?oura=connected`);
  } catch (err) {
    console.error("Oura token exchange error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(`${baseUrl}/dashboard/health/sleep?oura=error&message=${encodeURIComponent(msg)}`);
  }
}
