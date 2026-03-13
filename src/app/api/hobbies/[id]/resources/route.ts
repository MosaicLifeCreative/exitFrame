import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createResourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().nullable().optional(),
  resourceType: z.enum(["video", "article", "course", "tool", "book", "reference", "other"]),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resources = await prisma.hobbyResource.findMany({
      where: { hobbyId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: resources });
  } catch (error) {
    console.error("Failed to list hobby resources:", error);
    return NextResponse.json({ error: "Failed to list hobby resources" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify hobby exists
    const hobby = await prisma.hobby.findUnique({ where: { id } });
    if (!hobby) {
      return NextResponse.json({ error: "Hobby not found" }, { status: 404 });
    }

    const resource = await prisma.hobbyResource.create({
      data: {
        hobbyId: id,
        title: parsed.data.title,
        url: parsed.data.url || null,
        resourceType: parsed.data.resourceType,
        notes: parsed.data.notes || null,
      },
    });

    return NextResponse.json({ data: resource }, { status: 201 });
  } catch (error) {
    console.error("Failed to create hobby resource:", error);
    return NextResponse.json({ error: "Failed to create hobby resource" }, { status: 500 });
  }
}
