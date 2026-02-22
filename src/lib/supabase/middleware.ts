import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check MFA assurance level and enrolled factors
  let currentLevel: string | null = null;
  let nextLevel: string | null = null;
  let hasVerifiedTOTPFactor = false;

  if (user) {
    const { data: aalData, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    const { data: factorsData, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    currentLevel = aalData?.currentLevel ?? null;
    nextLevel = aalData?.nextLevel ?? null;

    // Check if there's actually a verified TOTP factor enrolled
    const verifiedFactors = factorsData?.totp?.filter(
      (f) => f.status === "verified"
    );
    hasVerifiedTOTPFactor = (verifiedFactors?.length ?? 0) > 0;

    // DEBUG — remove after confirming fix works
    console.log("[middleware] AAL debug:", {
      path: request.nextUrl.pathname,
      userId: user.id,
      currentLevel,
      nextLevel,
      aalError: aalError?.message ?? null,
      factorsError: factorsError?.message ?? null,
      totpFactors: factorsData?.totp?.map((f) => ({
        id: f.id,
        status: f.status,
        friendlyName: f.friendly_name,
      })) ?? [],
      hasVerifiedTOTPFactor,
    });
  }

  return { response, user, currentLevel, nextLevel, hasVerifiedTOTPFactor };
}
