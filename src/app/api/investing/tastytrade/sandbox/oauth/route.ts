import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SANDBOX_AUTH_URL = "https://developer.cert.tastyworks.com/oauth/authorize";
const SANDBOX_TOKEN_URL = "https://api.cert.tastyworks.com/oauth/token";

// GET: Start OAuth flow or handle callback
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const clientId = process.env.TASTYTRADE_SANDBOX_CLIENT_ID;
  const clientSecret = process.env.TASTYTRADE_SANDBOX_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.exitframe.org"}/api/investing/tastytrade/sandbox/oauth`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      error: "TASTYTRADE_SANDBOX_CLIENT_ID and TASTYTRADE_SANDBOX_CLIENT_SECRET are required",
    }, { status: 500 });
  }

  // If no code, redirect to authorization page
  if (!code) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read trade",
    });
    return NextResponse.redirect(`${SANDBOX_AUTH_URL}?${params.toString()}`);
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch(SANDBOX_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json({
        error: "Token exchange failed",
        details: tokenData,
      }, { status: tokenRes.status });
    }

    // Show the refresh token so you can copy it to env vars
    return NextResponse.json({
      message: "Copy the refresh_token below to TASTYTRADE_SANDBOX_REFRESH_TOKEN in your env vars",
      refresh_token: tokenData.refresh_token,
      access_token: tokenData.access_token ? "[received]" : null,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
