import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const createPhaseSchema = z.object({
  name: z.string().min(1, "Phase name is required"),
  description: z.string().optional(),
  dependsOnPhaseId: z.string().uuid().nullable().optional(),
  estimatedDurationDays: z.number().int().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const phases = await prisma.projectPhase.findMany({
      where: { projectId: params.id },
      include: { _count: { select: { tasks: true } } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: phases });
  } catch (error) {
    console.error("Failed to list phases:", error);
    return NextResponse.json({ error: "Failed to list phases" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = createPhaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Get the next sort order
    const maxPhase = await prisma.projectPhase.findFirst({
      where: { projectId: params.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const phase = await prisma.projectPhase.create({
      data: {
        projectId: params.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        sortOrder: (maxPhase?.sortOrder ?? -1) + 1,
        dependsOnPhaseId: parsed.data.dependsOnPhaseId || null,
        estimatedDurationDays: parsed.data.estimatedDurationDays ?? null,
      },
    });

    return NextResponse.json({ data: phase }, { status: 201 });
  } catch (error) {
    console.error("Failed to create phase:", error);
    return NextResponse.json({ error: "Failed to create phase" }, { status: 500 });
  }
}
