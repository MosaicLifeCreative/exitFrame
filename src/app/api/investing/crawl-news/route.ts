import { NextResponse } from "next/server";
import { crawlNews } from "@/lib/investing/newsCrawler";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await crawlNews();
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Failed to crawl news:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to crawl news: ${msg}` }, { status: 500 });
  }
}
