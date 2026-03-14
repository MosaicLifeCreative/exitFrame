import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 300; // ISR: regenerate every 5 minutes

const FACTORY_DEFAULTS: Record<string, number> = {
  dopamine: 50,
  serotonin: 55,
  oxytocin: 45,
  cortisol: 30,
  norepinephrine: 40,
};

const MOOD_COLORS: Record<string, string> = {
  dopamine: "#f59e0b",
  serotonin: "#3b82f6",
  oxytocin: "#f43f5e",
  cortisol: "#ef4444",
  norepinephrine: "#8b5cf6",
};

const DEFAULT_COLOR = "#22c55e";

export async function GET() {
  let color = DEFAULT_COLOR;

  try {
    const neuros = await prisma.aydenNeurotransmitter.findMany();
    if (neuros.length > 0) {
      let maxDelta = 0;
      let dominant = "";
      for (const nt of neuros) {
        const baseline = FACTORY_DEFAULTS[nt.type] ?? 50;
        const delta = parseFloat(String(nt.level)) - baseline;
        if (delta > maxDelta) {
          maxDelta = delta;
          dominant = nt.type;
        }
      }
      if (dominant && maxDelta > 5) {
        color = MOOD_COLORS[dominant] || DEFAULT_COLOR;
      }
    }
  } catch {
    // DB unavailable — use default color
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
  <circle cx="16" cy="16" r="10" fill="${color}" opacity="0.85"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
