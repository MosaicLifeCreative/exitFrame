import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: List all family members with their conditions
export async function GET() {
  try {
    const members = await prisma.familyMember.findMany({
      include: { conditions: { orderBy: { createdAt: "asc" } } },
      orderBy: { relation: "asc" },
    });

    const data = members.map((m) => ({
      id: m.id,
      relation: m.relation,
      name: m.name,
      isAlive: m.isAlive,
      notes: m.notes,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      conditions: m.conditions.map((c) => ({
        id: c.id,
        condition: c.condition,
        ageOfOnset: c.ageOfOnset,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Family members GET error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Create a family member with optional conditions
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { relation, name, isAlive, notes, conditions } = body as {
      relation: string;
      name?: string;
      isAlive?: boolean;
      notes?: string;
      conditions?: Array<{ condition: string; ageOfOnset?: number; notes?: string }>;
    };

    if (!relation) {
      return NextResponse.json({ error: "Relation is required" }, { status: 400 });
    }

    const member = await prisma.familyMember.create({
      data: {
        relation,
        name: name || null,
        isAlive: isAlive ?? null,
        notes: notes || null,
        conditions: conditions?.length
          ? {
              create: conditions.map((c) => ({
                condition: c.condition,
                ageOfOnset: c.ageOfOnset ?? null,
                notes: c.notes || null,
              })),
            }
          : undefined,
      },
      include: { conditions: true },
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
    console.error("Family member POST error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
