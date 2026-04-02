import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { embedMemory, embedNote, embedFact, embedArchitecture } from "@/lib/embeddings";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

// POST: Backfill embeddings for all rows missing them
export async function POST() {
  const results = { memories: 0, facts: 0, notes: 0, architecture: 0, errors: 0 };

  try {
    // Memories
    const memories = await prisma.$queryRawUnsafe<Array<{ id: string; content: string }>>(
      `SELECT id, content FROM ayden_memories WHERE embedding IS NULL AND is_active = true`
    );
    for (const m of memories) {
      try {
        await embedMemory(m.id, m.content);
        results.memories++;
      } catch { results.errors++; }
    }

    // Trey facts
    const facts = await prisma.$queryRawUnsafe<Array<{ id: string; key: string; value: string; detail: string | null }>>(
      `SELECT id, key, value, detail FROM trey_facts WHERE embedding IS NULL`
    );
    for (const f of facts) {
      try {
        await embedFact(f.id, f.key, f.value, f.detail);
        results.facts++;
      } catch { results.errors++; }
    }

    // Notes (all domains — useful for Trey's notes too)
    const notes = await prisma.$queryRawUnsafe<Array<{ id: string; title: string; content: string }>>(
      `SELECT id, title, content FROM notes WHERE embedding IS NULL`
    );
    for (const n of notes) {
      try {
        await embedNote(n.id, n.title, n.content);
        results.notes++;
      } catch { results.errors++; }
    }

    // Architecture
    const arch = await prisma.$queryRawUnsafe<Array<{ id: string; system: string; description: string; details: string | null }>>(
      `SELECT id, system, description, details FROM ayden_architecture WHERE embedding IS NULL`
    );
    for (const a of arch) {
      try {
        await embedArchitecture(a.id, a.system, a.description, a.details);
        results.architecture++;
      } catch { results.errors++; }
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Backfill failed:", error);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
