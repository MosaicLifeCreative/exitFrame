import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Add a condition to a family member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { conditionName, ageOfOnset, notes } = body as {
      conditionName: string;
      ageOfOnset?: number;
      notes?: string;
    };

    if (!conditionName) {
      return NextResponse.json({ error: "Condition is required" }, { status: 400 });
    }

    // Verify the family member exists
    const member = await prisma.familyMember.findUnique({ where: { id } });
    if (!member) {
      return NextResponse.json({ error: "Family member not found" }, { status: 404 });
    }

    const created = await prisma.familyCondition.create({
      data: {
        familyMemberId: id,
        condition: conditionName,
        ageOfOnset: ageOfOnset ?? null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      data: {
        id: created.id,
        familyMemberId: created.familyMemberId,
        conditionName: created.condition,
        ageOfOnset: created.ageOfOnset,
        notes: created.notes,
      },
    });
  } catch (error) {
    console.error("Family condition POST error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Remove a condition by query param ?conditionId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const conditionId = searchParams.get("conditionId");

    if (!conditionId) {
      return NextResponse.json({ error: "conditionId query param is required" }, { status: 400 });
    }

    // Verify the condition belongs to this family member
    const condition = await prisma.familyCondition.findUnique({
      where: { id: conditionId },
    });

    if (!condition) {
      return NextResponse.json({ error: "Condition not found" }, { status: 404 });
    }

    if (condition.familyMemberId !== id) {
      return NextResponse.json({ error: "Condition does not belong to this family member" }, { status: 400 });
    }

    await prisma.familyCondition.delete({ where: { id: conditionId } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Family condition DELETE error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
