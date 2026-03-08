import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createProgressSchema = z.object({
  value: z.number().optional(),
  notes: z.string().optional(),
  source: z.enum(["manual", "claude"]).default("manual"),
});

// POST: Add a progress entry and optionally update currentValue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createProgressSchema.parse(body);

    // Create the progress entry
    const entry = await prisma.goalProgress.create({
      data: {
        goalId: id,
        value: parsed.value,
        notes: parsed.notes,
        source: parsed.source,
      },
    });

    // If a numeric value was provided, update the goal's currentValue
    if (parsed.value !== undefined) {
      await prisma.goal.update({
        where: { id },
        data: { currentValue: parsed.value },
      });
    }

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Progress POST error:", error);
    return NextResponse.json({ error: "Failed to log progress" }, { status: 500 });
  }
}
