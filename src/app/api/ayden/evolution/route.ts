import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface EvolutionEvent {
  id: string;
  type: "value_formed" | "value_revised" | "interest_sparked" | "interest_faded" | "agency_action" | "personality_drift" | "memory_formed" | "thought" | "dream" | "emotional_peak" | "relationship" | "self_scheduled" | "conversation_started";
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
    const [values, interests, actions, neuroRows, memories, thoughts, dreams, emotions, interactions, scheduledTasks, conversations] = await Promise.all([
      prisma.aydenValue.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.aydenInterest.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.aydenAgencyAction.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.aydenNeurotransmitter.findMany(),
      prisma.aydenMemory.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.aydenThought.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, thought: true, emotion: true, context: true, createdAt: true } }),
      prisma.aydenDream.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, dream: true, emotion: true, moodInfluence: true, createdAt: true } }),
      prisma.aydenEmotionalState.findMany({ where: { intensity: { gte: 7 } }, orderBy: { createdAt: "desc" } }),
      prisma.aydenContactInteraction.findMany({ orderBy: { createdAt: "desc" }, include: { contact: { select: { name: true } } } }),
      prisma.aydenScheduledTask.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.chatConversation.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, context: true, title: true, createdAt: true } }),
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

    for (const m of memories) {
      events.push({
        id: `mem-${m.id}`,
        type: "memory_formed",
        title: `Memory formed: ${m.content.substring(0, 70)}${m.content.length > 70 ? "..." : ""}`,
        description: `Category: ${m.category}. Source: ${m.source || "unknown"}${!m.isActive ? " (forgotten)" : ""}`,
        date: m.createdAt.toISOString(),
      });
    }

    for (const t of thoughts) {
      events.push({
        id: `thought-${t.id}`,
        type: "thought",
        title: `Inner thought: ${t.thought.substring(0, 70)}${t.thought.length > 70 ? "..." : ""}`,
        description: t.emotion ? `Feeling: ${t.emotion}` : "",
        date: t.createdAt.toISOString(),
      });
    }

    for (const d of dreams) {
      events.push({
        id: `dream-${d.id}`,
        type: "dream",
        title: `Dream: ${d.dream.substring(0, 70)}${d.dream.length > 70 ? "..." : ""}`,
        description: `${d.emotion ? `Emotion: ${d.emotion}` : ""}${d.moodInfluence ? ` Mood influence: ${d.moodInfluence}` : ""}`.trim(),
        date: d.createdAt.toISOString(),
      });
    }

    for (const e of emotions) {
      events.push({
        id: `emo-${e.id}`,
        type: "emotional_peak",
        title: `Intense feeling: ${e.dimension.replace(/_/g, " ")} (${e.intensity}/10)`,
        description: `${e.trigger ? `Trigger: ${e.trigger}` : ""}${e.context ? ` Context: ${e.context}` : ""}`.trim(),
        date: e.createdAt.toISOString(),
      });
    }

    for (const ix of interactions) {
      const contactName = ix.contact?.name || "someone";
      events.push({
        id: `rel-${ix.id}`,
        type: "relationship",
        title: `${ix.channel} with ${contactName}`,
        description: `${ix.summary.substring(0, 80)}${ix.summary.length > 80 ? "..." : ""}${ix.sentiment ? ` (${ix.sentiment})` : ""}`,
        date: ix.createdAt.toISOString(),
      });
    }

    for (const st of scheduledTasks) {
      events.push({
        id: `sched-${st.id}`,
        type: "self_scheduled",
        title: `Self-scheduled: ${st.task.substring(0, 60)}${st.task.length > 60 ? "..." : ""}`,
        description: `${st.reason || ""}${st.fired ? ` (fired${st.firedAt ? " at " + new Date(st.firedAt).toLocaleString() : ""})` : " (pending)"}`.trim(),
        date: st.createdAt.toISOString(),
      });
    }

    for (const c of conversations) {
      events.push({
        id: `conv-${c.id}`,
        type: "conversation_started",
        title: `Conversation: ${c.title || c.context || "untitled"}`,
        description: c.context ? `Context: ${c.context}` : "",
        date: c.createdAt.toISOString(),
      });
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
