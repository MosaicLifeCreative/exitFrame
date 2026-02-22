import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-totp
 *
 * Deletes all existing TOTP factors for the authenticated user
 * using the admin (service_role) client. This bypasses the AAL2
 * requirement that blocks client-side mfa.unenroll().
 */
export async function POST() {
  try {
    // Get the current user from the session (anon key)
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Use admin client to list and delete factors
    const admin = createAdminClient();
    const { data: factorsData, error: factorsError } =
      await admin.auth.admin.mfa.listFactors({ userId: user.id });

    if (factorsError) {
      console.error("[reset-totp] Failed to list factors:", factorsError.message);
      return NextResponse.json(
        { error: "Failed to list MFA factors" },
        { status: 500 }
      );
    }

    const totpFactors = factorsData?.factors?.filter(
      (f) => f.factor_type === "totp"
    ) ?? [];

    // Delete each TOTP factor via admin API
    let deleted = 0;
    for (const factor of totpFactors) {
      const { error: deleteError } =
        await admin.auth.admin.mfa.deleteFactor({
          id: factor.id,
          userId: user.id,
        });

      if (deleteError) {
        console.error(
          "[reset-totp] Failed to delete factor:",
          factor.id,
          deleteError.message
        );
      } else {
        deleted++;
      }
    }

    return NextResponse.json({
      data: { deleted, total: totpFactors.length },
    });
  } catch (error) {
    console.error("[reset-totp] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to reset TOTP" },
      { status: 500 }
    );
  }
}
