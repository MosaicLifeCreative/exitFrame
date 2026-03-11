import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const { id, action } = await req.json();

    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (action === "approve") {
      const rule = await prisma.tradingRule.update({
        where: { id },
        data: { isActive: true, source: "ayden" },
      });
      return NextResponse.json({ data: rule });
    }

    // reject = delete
    await prisma.tradingRule.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to update trading rule:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to update rule: ${msg}` }, { status: 500 });
  }
}
