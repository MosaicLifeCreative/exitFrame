import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Save a push subscription
export async function POST(request: NextRequest) {
  try {
    const { endpoint, keys } = await request.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

// Remove a push subscription
export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
