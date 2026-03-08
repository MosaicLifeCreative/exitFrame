import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Single family member with conditions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const member = await prisma.familyMember.findUnique({
      where: { id },
      include: { conditions: { orderBy: { createdAt: "asc" } } },
    });

    if (!member) {
      return NextResponse.json({ error: "Family member not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: member.id,
        relation: member.relation,
        name: member.name,
        isAlive: member.isAlive,
        notes: member.notes,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
        conditions: member.conditions.map((c) => ({
          id: c.id,
          condition: c.condition,
          ageOfOnset: c.ageOfOnset,
          notes: c.notes,
          createdAt: c.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Family member GET error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: Update family member fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { relation, name, isAlive, notes } = body as {
      relation?: string;
      name?: string;
      isAlive?: boolean;
      notes?: string;
    };

    const data: Record<string, unknown> = {};
    if (relation !== undefined) data.relation = relation;
    if (name !== undefined) data.name = name;
    if (isAlive !== undefined) data.isAlive = isAlive;
    if (notes !== undefined) data.notes = notes;

    const member = await prisma.familyMember.update({
      where: { id },
      data,
      include: { conditions: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({
      data: {
        id: member.id,
        relation: member.relation,
        name: member.name,
        isAlive: member.isAlive,
        notes: member.notes,
        conditions: member.conditions.map((c) => ({
          id: c.id,
          condition: c.condition,
          ageOfOnset: c.ageOfOnset,
          notes: c.notes,
        })),
      },
    });
  } catch (error) {
    console.error("Family member PATCH error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Delete family member (cascades to conditions)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.familyMember.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Family member DELETE error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
