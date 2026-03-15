import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [genes, recentShifts] = await Promise.all([
      prisma.aydenDna.findMany({
        orderBy: [{ category: "asc" }, { trait: "asc" }],
      }),
      prisma.aydenDnaShift.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const grouped: Record<
      string,
      Array<{
        trait: string;
        value: number;
        phenotype: number;
        lowLabel: string;
        highLabel: string;
        expression: number;
      }>
    > = {};

    for (const g of genes) {
      const phenotype = Math.min(2, Math.max(0, g.value * g.expression));
      if (!grouped[g.category]) grouped[g.category] = [];
      grouped[g.category].push({
        trait: g.trait,
        value: g.value,
        phenotype,
        lowLabel: g.lowLabel,
        highLabel: g.highLabel,
        expression: g.expression,
      });
    }

    return NextResponse.json({
      data: {
        total: genes.length,
        categories: grouped,
        shifts: recentShifts.map((s) => ({
          trait: s.trait,
          oldExpression: s.oldExpression,
          newExpression: s.newExpression,
          delta: s.delta,
          reason: s.reason,
          createdAt: s.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("[ayden/dna] Failed to fetch DNA:", err);
    return NextResponse.json({ error: "Failed to fetch DNA" }, { status: 500 });
  }
}
