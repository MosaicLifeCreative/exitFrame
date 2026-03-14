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
  <path d="M8 8 L4 16 L8 24" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
  <path d="M24 8 L28 16 L24 24" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
  <rect x="11" y="10" width="10" height="12" rx="1" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.4"/>
  <line x1="13" y1="14" x2="19" y2="14" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  <line x1="13" y1="17" x2="17" y2="17" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
  <line x1="13" y1="20" x2="18" y2="20" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
