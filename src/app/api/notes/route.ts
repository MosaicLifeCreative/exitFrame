import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { embedNote } from "@/lib/embeddings";
export const dynamic = "force-dynamic";

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().default(""),
  domain: z.enum(["life", "mlc", "product", "ayden"]),
  domainRefId: z.string().uuid().nullable().optional(),
  noteType: z.enum(["general", "idea", "meeting_notes", "reference", "checklist", "research", "reflection", "observation"]).optional(),
  isPinned: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const domainRefId = searchParams.get("domain_ref_id");
    const noteType = searchParams.get("note_type");
    const pinned = searchParams.get("pinned");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (domain) where.domain = domain;
    if (domainRefId) where.domainRefId = domainRefId;
    if (noteType) where.noteType = noteType;
    if (pinned === "true") where.isPinned = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const notes = await prisma.note.findMany({
      where,
      include: { _count: { select: { actions: true } } },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = notes.length > limit;
    if (hasMore) notes.pop();

    return NextResponse.json({
      data: notes,
      nextCursor: hasMore ? notes[notes.length - 1].id : null,
    });
  } catch (error) {
    console.error("Failed to list notes:", error);
    return NextResponse.json({ error: "Failed to list notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createNoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        domain: parsed.data.domain,
        domainRefId: parsed.data.domainRefId || null,
        noteType: parsed.data.noteType || "general",
        isPinned: parsed.data.isPinned || false,
      },
    });

    logActivity({
      domain: note.domain,
      domainRefId: note.domainRefId ?? undefined,
      module: "notes",
      activityType: "created",
      title: `Created note '${note.title}'`,
      refType: "note",
      refId: note.id,
    });

    // Fire-and-forget embedding
    embedNote(note.id, note.title, note.content).catch(() => {});

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error("Failed to create note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
