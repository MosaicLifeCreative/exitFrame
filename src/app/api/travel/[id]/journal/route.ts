import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const journalSchema = z.object({
  date: z.string().min(1),
  title: z.string().nullable().optional(),
  content: z.string().min(1),
  mood: z.enum(["great", "good", "okay", "rough"]).nullable().optional(),
  location: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entries = await prisma.tripJournalEntry.findMany({
      where: { tripId: params.id },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ data: entries });
  } catch (error) {
    console.error("Failed to list journal entries:", error);
    return NextResponse.json({ error: "Failed to list journal entries" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = journalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const entry = await prisma.tripJournalEntry.create({
      data: {
        tripId: params.id,
        date: new Date(d.date),
        title: d.title || null,
        content: d.content,
        mood: d.mood || null,
        location: d.location || null,
      },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error("Failed to create journal entry:", error);
    return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { entryId, ...rest } = body;
    if (!entryId) {
      return NextResponse.json({ error: "entryId is required" }, { status: 400 });
    }

    const parsed = journalSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const data: Record<string, unknown> = {};
    if (d.date !== undefined) data.date = new Date(d.date);
    if (d.title !== undefined) data.title = d.title;
    if (d.content !== undefined) data.content = d.content;
    if (d.mood !== undefined) data.mood = d.mood;
    if (d.location !== undefined) data.location = d.location;

    const entry = await prisma.tripJournalEntry.update({
      where: { id: entryId, tripId: params.id },
      data,
    });

    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("Failed to update journal entry:", error);
    return NextResponse.json({ error: "Failed to update journal entry" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entryId");
    if (!entryId) {
      return NextResponse.json({ error: "entryId is required" }, { status: 400 });
    }

    await prisma.tripJournalEntry.delete({ where: { id: entryId, tripId: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete journal entry:", error);
    return NextResponse.json({ error: "Failed to delete journal entry" }, { status: 500 });
  }
}
