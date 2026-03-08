import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch user preferences
export async function GET() {
  try {
    const profile = await prisma.userProfile.findFirst({
      select: { preferences: true },
    });

    const preferences = (profile?.preferences as Record<string, unknown>) || {};

    return NextResponse.json({ data: preferences });
  } catch (error) {
    console.error("Preferences GET error:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

// PUT: Update user preferences (deep merge by category)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Find or create the single user profile
    let profile = await prisma.userProfile.findFirst();

    if (!profile) {
      // Create with a placeholder authUserId — single user app
      profile = await prisma.userProfile.create({
        data: {
          authUserId: "single-user",
          displayName: body.profile?.name || "Trey",
          preferences: body,
        },
      });
      return NextResponse.json({ data: profile.preferences });
    }

    // Deep merge: existing preferences + incoming by category key
    const existing = (profile.preferences as Record<string, unknown>) || {};
    const merged = { ...existing };

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        merged[key] = {
          ...((existing[key] as Record<string, unknown>) || {}),
          ...(value as Record<string, unknown>),
        };
      } else {
        merged[key] = value;
      }
    }

    const updated = await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        preferences: merged as unknown as Record<string, never>,
        ...(body.profile?.name ? { displayName: body.profile.name } : {}),
      },
    });

    return NextResponse.json({ data: updated.preferences });
  } catch (error) {
    console.error("Preferences PUT error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
