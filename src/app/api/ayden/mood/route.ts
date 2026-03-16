import { NextResponse } from "next/server";
import { getCurrentLevels } from "@/lib/neurotransmitters";
import { computeTransference } from "@/lib/transference";

export const dynamic = "force-dynamic";

// Public endpoint — transference works on the white paper too
export async function GET() {
  try {
    const levels = await getCurrentLevels();

    const neuroLevels = {
      dopamine: levels.dopamine ?? 50,
      serotonin: levels.serotonin ?? 55,
      oxytocin: levels.oxytocin ?? 45,
      cortisol: levels.cortisol ?? 30,
      norepinephrine: levels.norepinephrine ?? 40,
    };

    const transference = computeTransference(neuroLevels);

    return NextResponse.json({ data: transference });
  } catch (error) {
    console.error("Failed to get mood:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
