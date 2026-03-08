import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Bulk import family members with conditions
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const members = body.members as Array<{
      relation: string;
      name?: string;
      isAlive?: boolean;
      notes?: string;
      conditions?: Array<{
        condition: string;
        ageOfOnset?: number;
        notes?: string;
      }>;
    }>;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: "members array is required and must not be empty" },
        { status: 400 }
      );
    }

    const results = [];
    for (const m of members) {
      if (!m.relation) continue;

      const member = await prisma.familyMember.create({
        data: {
          relation: m.relation,
          name: m.name,
          isAlive: m.isAlive,
          notes: m.notes,
          conditions: m.conditions
            ? {
                create: m.conditions.map((c) => ({
                  condition: c.condition,
                  ageOfOnset: c.ageOfOnset,
                  notes: c.notes,
                })),
              }
            : undefined,
        },
        include: { conditions: true },
      });

      results.push({
        id: member.id,
        relation: member.relation,
        name: member.name,
        conditionCount: member.conditions.length,
      });
    }

    return NextResponse.json({
      data: { count: results.length, members: results },
    });
  } catch (error) {
    console.error("Family import error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
