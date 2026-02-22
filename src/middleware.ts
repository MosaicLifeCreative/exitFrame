import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const FBI_URL = "https://www.fbi.gov";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicRoutes = ["/login", "/auth/callback", "/auth/verify-totp", "/auth/setup-totp"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Update session and get user + MFA assurance level
  const { response, user, aal } = await updateSession(request);

  const currentAAL = aal?.currentLevel;
  const nextAAL = aal?.nextLevel;
  const hasCompletedMFA = currentAAL === "aal2";
  const needsMFA = currentAAL === "aal1" && nextAAL === "aal2";

  // If on login and fully authenticated (AAL2), redirect to dashboard
  if (pathname === "/login" && user && hasCompletedMFA) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If on login and has session but only AAL1, redirect to TOTP verification
  if (pathname === "/login" && user && needsMFA) {
    return NextResponse.redirect(new URL("/auth/verify-totp", request.url));
  }

  // Allow public routes through (except login which is handled above)
  if (isPublicRoute) {
    return response;
  }

  // Protected /dashboard routes: require authenticated user with AAL2
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api")) {
    if (!user) {
      // No session at all → FBI
      return NextResponse.redirect(FBI_URL);
    }

    if (needsMFA) {
      // Has password session but hasn't completed TOTP → send to verify
      return NextResponse.redirect(new URL("/auth/verify-totp", request.url));
    }

    if (!hasCompletedMFA) {
      // Session exists but AAL is unexpected → FBI
      return NextResponse.redirect(FBI_URL);
    }
  }

  // Root path: redirect based on auth status
  if (pathname === "/") {
    if (user && hasCompletedMFA) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (user && needsMFA) {
      return NextResponse.redirect(new URL("/auth/verify-totp", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
