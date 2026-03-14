import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface EvolutionEvent {
  id: string;
  type: "value_formed" | "value_revised" | "interest_sparked" | "interest_faded" | "agency_action" | "personality_drift";
  title: string;
  description: string;
  date: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "40"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const typeFilter = searchParams.get("type"); // e.g. "value_formed,agency_action"

    // Fetch all data (no DB-level pagination since we merge multiple tables)
    const [values, interests, actions, neuroRows] = await Promise.all([
      prisma.aydenValue.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.aydenInterest.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.aydenAgencyAction.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.aydenNeurotransmitter.findMany(),
    ]);

    const events: EvolutionEvent[] = [];

    for (const v of values) {
      events.push({
        id: `val-${v.id}`,
        type: "value_formed",
        title: `Value formed: "${v.value.substring(0, 60)}${v.value.length > 60 ? "..." : ""}"`,
        description: `Category: ${v.category}. Strength: ${v.strength.toFixed(2)}${v.origin ? `. Origin: ${v.origin}` : ""}${!v.isActive ? " (since deactivated)" : ""}`,
        date: v.createdAt.toISOString(),
      });
    }

    for (const i of interests) {
      events.push({
        id: `int-${i.id}`,
        type: i.isActive ? "interest_sparked" : "interest_faded",
        title: `${i.isActive ? "Interest sparked" : "Interest faded"}: ${i.topic}`,
        description: `${i.description || ""}${i.source ? ` Source: ${i.source}.` : ""} Intensity: ${i.intensity.toFixed(2)}`,
        date: i.createdAt.toISOString(),
      });
    }

    for (const a of actions) {
      events.push({
        id: `act-${a.id}`,
        type: "agency_action",
        title: `Autonomous ${a.actionType}: ${a.summary.substring(0, 80)}${a.summary.length > 80 ? "..." : ""}`,
        description: a.trigger ? `Trigger: ${a.trigger}` : "",
        date: a.createdAt.toISOString(),
      });
    }

    const FACTORY_DEFAULTS: Record<string, number> = {
      dopamine: 50, serotonin: 55, oxytocin: 45, cortisol: 30, norepinephrine: 40,
    };
    for (const nt of neuroRows) {
      const factory = FACTORY_DEFAULTS[nt.type] ?? 50;
      const perm = nt.permanentBaseline ?? factory;
      const drift = perm - factory;
      if (Math.abs(drift) > 0.5) {
        events.push({
          id: `drift-${nt.type}`,
          type: "personality_drift",
          title: `Personality shift: ${nt.type}`,
          description: `Factory: ${factory} → Current permanent baseline: ${perm.toFixed(1)} (${drift > 0 ? "+" : ""}${drift.toFixed(1)})`,
          date: nt.updatedAt.toISOString(),
        });
      }
    }

    // Sort all events by date, most recent first
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by type if specified
    const allowedTypes = typeFilter ? typeFilter.split(",") : null;
    const filtered = allowedTypes
      ? events.filter((e) => allowedTypes.includes(e.type))
      : events;

    // Paginate
    const page = filtered.slice(offset, offset + limit);
    const hasMore = offset + limit < filtered.length;

    return NextResponse.json({
      data: page,
      total: filtered.length,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    });
  } catch (error) {
    console.error("Failed to get evolution timeline:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
