import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redis } from "@/lib/redis";
import { COOKIE_NAME, REDIS_PREFIX, TTL_SECONDS, hashToken } from "@/lib/trustedDevice";

export async function POST() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate a 32-byte random token
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Hash and store in Redis
  const hash = await hashToken(token);
  await redis.set(`${REDIS_PREFIX}${hash}`, "1", { ex: TTL_SECONDS });

  // Set the cookie
  const response = NextResponse.json({ data: { success: true } });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });

  return response;
}
