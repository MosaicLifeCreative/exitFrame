import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, saveGoogleIntegration } from "@/lib/google";
import type { GoogleAccount } from "@/lib/google";

export const dynamic = "force-dynamic";

/**
 * Google OAuth callback — exchanges code for tokens, saves to DB,
 * redirects back to settings page.
 * The `state` param carries the account type ("personal" or "business").
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state") || "personal";
  const account = (state === "business" ? "business" : "personal") as GoogleAccount;

  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

  const settingsUrl = `${baseUrl}/dashboard/settings/preferences`;

  if (error) {
    return NextResponse.redirect(
      `${settingsUrl}?google=error&account=${account}&message=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${settingsUrl}?google=error&account=${account}&message=no_code`
    );
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    await saveGoogleIntegration(tokens, account);

    return NextResponse.redirect(`${settingsUrl}?google=connected&account=${account}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`Google OAuth callback error (${account}):`, msg);
    return NextResponse.redirect(
      `${settingsUrl}?google=error&account=${account}&message=${encodeURIComponent(msg)}`
    );
  }
}
