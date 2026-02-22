import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const updatePhaseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["not_started", "in_progress", "completed", "blocked"]).optional(),
  sortOrder: z.number().int().optional(),
  dependsOnPhaseId: z.string().uuid().nullable().optional(),
  estimatedDurationDays: z.number().int().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; phaseId: string } }
) {
  try {
    const body = await request.json();
    const parsed = updatePhaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };

    // Auto-set timestamps based on status changes
    if (parsed.data.status === "in_progress") {
      data.startedAt = new Date();
    } else if (parsed.data.status === "completed") {
      data.completedAt = new Date();
    }

    const phase = await prisma.projectPhase.update({
      where: {
        id: params.phaseId,
        projectId: params.id,
      },
      data,
    });

    return NextResponse.json({ data: phase });
  } catch (error) {
    console.error("Failed to update phase:", error);
    return NextResponse.json({ error: "Failed to update phase" }, { status: 500 });
  }
}
