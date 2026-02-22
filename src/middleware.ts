import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const FBI_URL = "https://www.fbi.gov";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicRoutes = ["/login", "/auth/callback", "/auth/verify-totp", "/auth/setup-totp"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Update session and get user
  const { response, user } = await updateSession(request);

  // If on a public route and authenticated, redirect to dashboard
  if (isPublicRoute && user) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // If on a protected route and not authenticated, redirect to FBI
  if (!isPublicRoute && pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(FBI_URL);
    }
  }

  // Root path: redirect based on auth status
  if (pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
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
