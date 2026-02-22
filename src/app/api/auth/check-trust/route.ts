import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { COOKIE_NAME, REDIS_PREFIX, hashToken } from "@/lib/trustedDevice";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ data: { trusted: false } });
  }

  const hash = await hashToken(token);
  const exists = await redis.exists(`${REDIS_PREFIX}${hash}`);

  return NextResponse.json({ data: { trusted: exists === 1 } });
}
