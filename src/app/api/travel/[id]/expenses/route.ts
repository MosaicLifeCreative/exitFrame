import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const expenseSchema = z.object({
  category: z.string().min(1), // flights, lodging, food, transport, activities, shopping, other
  description: z.string().min(1),
  amount: z.number().min(0),
  date: z.string().min(1),
  isPaid: z.boolean().optional().default(false),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expenses = await prisma.tripExpense.findMany({
      where: { tripId: params.id },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ data: expenses });
  } catch (error) {
    console.error("Failed to list expenses:", error);
    return NextResponse.json({ error: "Failed to list expenses" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const expense = await prisma.tripExpense.create({
      data: {
        tripId: params.id,
        category: d.category,
        description: d.description,
        amount: d.amount,
        date: new Date(d.date),
        isPaid: d.isPaid || false,
        notes: d.notes || null,
      },
    });

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { expenseId, ...rest } = body;
    if (!expenseId) {
      return NextResponse.json({ error: "expenseId is required" }, { status: 400 });
    }

    const parsed = expenseSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const d = parsed.data;
    const data: Record<string, unknown> = {};
    if (d.category !== undefined) data.category = d.category;
    if (d.description !== undefined) data.description = d.description;
    if (d.amount !== undefined) data.amount = d.amount;
    if (d.date !== undefined) data.date = new Date(d.date);
    if (d.isPaid !== undefined) data.isPaid = d.isPaid;
    if (d.notes !== undefined) data.notes = d.notes;

    const expense = await prisma.tripExpense.update({
      where: { id: expenseId, tripId: params.id },
      data,
    });

    return NextResponse.json({ data: expense });
  } catch (error) {
    console.error("Failed to update expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get("expenseId");
    if (!expenseId) {
      return NextResponse.json({ error: "expenseId is required" }, { status: 400 });
    }

    await prisma.tripExpense.delete({ where: { id: expenseId, tripId: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
