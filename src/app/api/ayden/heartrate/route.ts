import { NextResponse } from "next/server";
import { getHeartRate } from "@/lib/neurotransmitters";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hr = await getHeartRate();
    return NextResponse.json({ data: hr });
  } catch (error) {
    console.error("Failed to get heart rate:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
