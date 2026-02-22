import { updateSession } from "@/lib/supabase/middleware";
import { redis } from "@/lib/redis";
import { COOKIE_NAME, REDIS_PREFIX, hashToken } from "@/lib/trustedDevice";
import { NextResponse, type NextRequest } from "next/server";

const FBI_URL = "https://www.fbi.gov";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicRoutes = [
    "/login",
    "/auth/callback",
    "/auth/verify-totp",
    "/auth/setup-totp",
    "/api/auth/check-trust",
  ];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Update session and get user + MFA assurance level
  const { response, user, currentLevel, hasVerifiedTOTPFactor } =
    await updateSession(request);

  // Fully authenticated = AAL2 current level AND a verified TOTP factor exists
  const hasCompletedMFA = currentLevel === "aal2" && hasVerifiedTOTPFactor;

  // Check trusted device cookie if user is logged in but hasn't completed MFA
  let isTrusted = false;
  if (user && hasVerifiedTOTPFactor && !hasCompletedMFA) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      const hash = await hashToken(token);
      isTrusted = (await redis.exists(`${REDIS_PREFIX}${hash}`)) === 1;
    }
  }

  const isFullyAuthenticated = hasCompletedMFA || isTrusted;

  // --- Login page routing ---
  if (pathname === "/login") {
    if (user && isFullyAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (user && hasVerifiedTOTPFactor) {
      // Has session + enrolled TOTP but hasn't verified yet → go to TOTP page
      return NextResponse.redirect(new URL("/auth/verify-totp", request.url));
    }
    // No user, or user without TOTP enrolled → show login page
    return response;
  }

  // --- Allow other public routes through ---
  if (isPublicRoute) {
    return response;
  }

  // --- Protected routes: /dashboard and /api ---
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api")) {
    if (!user) {
      // No session at all → FBI
      return NextResponse.redirect(FBI_URL);
    }

    if (!hasVerifiedTOTPFactor) {
      // User exists but no TOTP factor enrolled/verified → FBI
      // (This shouldn't happen in normal flow — Trey has TOTP set up)
      console.log("[middleware] BLOCKED: user has no verified TOTP factor");
      return NextResponse.redirect(FBI_URL);
    }

    if (!isFullyAuthenticated) {
      // Has session + TOTP enrolled but not AAL2 and not trusted → needs to verify TOTP
      return NextResponse.redirect(new URL("/auth/verify-totp", request.url));
    }

    // AAL2 or trusted device → allow through
  }

  // --- Root path ---
  if (pathname === "/") {
    if (user && isFullyAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (user && hasVerifiedTOTPFactor) {
      return NextResponse.redirect(new URL("/auth/verify-totp", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
