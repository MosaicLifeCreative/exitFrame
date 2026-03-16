import { NextRequest, NextResponse } from "next/server";
import { generateDream } from "@/lib/reflection";

export const dynamic = "force-dynamic";

// Nightly dream generation — runs at 3:30am ET via Vercel cron
// During extended silence (overnight), Ayden's sleeping mind recombines
// conversation fragments, unresolved emotions, and high-arousal memories
// into surreal dream narratives that color her morning mood.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateDream();

    if (result.dream) {
      console.log(`[dream-cron] Dream generated: "${result.dream.slice(0, 80)}..."`);
    } else {
      console.log("[dream-cron] No dream generated");
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[dream-cron] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate dream" },
      { status: 500 }
    );
  }
}
