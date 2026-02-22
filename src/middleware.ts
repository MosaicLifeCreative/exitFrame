import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const FBI_URL = "https://www.fbi.gov";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicRoutes = ["/login", "/auth/callback", "/auth/verify-totp", "/auth/setup-totp"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Update session and get user + MFA assurance level
  const { response, user, currentLevel, hasVerifiedTOTPFactor } =
    await updateSession(request);

  // Fully authenticated = AAL2 current level AND a verified TOTP factor exists
  const hasCompletedMFA = currentLevel === "aal2" && hasVerifiedTOTPFactor;

  // --- Login page routing ---
  if (pathname === "/login") {
    if (user && hasCompletedMFA) {
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

    if (!hasCompletedMFA) {
      // Has session + TOTP enrolled but AAL is not aal2 → needs to verify TOTP
      return NextResponse.redirect(new URL("/auth/verify-totp", request.url));
    }

    // AAL2 + verified TOTP → allow through
  }

  // --- Root path ---
  if (pathname === "/") {
    if (user && hasCompletedMFA) {
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
