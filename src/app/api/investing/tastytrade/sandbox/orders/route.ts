import { NextRequest, NextResponse } from "next/server";
import {
  placeSandboxOrder,
  getSandboxOrders,
  cancelSandboxOrder,
  dryRunSandboxOrder,
} from "@/lib/tastytrade";
import type { TastyOrder } from "@/lib/tastytrade";
import { z } from "zod";

export const dynamic = "force-dynamic";

const orderLegSchema = z.object({
  instrumentType: z.enum(["Equity", "Equity Option"]),
  symbol: z.string().min(1),
  action: z.enum(["Buy to Open", "Sell to Close", "Sell to Open", "Buy to Close"]),
  quantity: z.number().int().positive(),
});

const orderSchema = z.object({
  timeInForce: z.enum(["Day", "GTC", "GTD"]).default("Day"),
  orderType: z.enum(["Limit", "Market", "Stop", "Stop Limit"]),
  price: z.number().optional(),
  stopTrigger: z.number().optional(),
  legs: z.array(orderLegSchema).min(1),
  dryRun: z.boolean().default(false),
});

export async function GET() {
  try {
    const orders = await getSandboxOrders();
    return NextResponse.json({ data: { orders, count: orders.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { dryRun, ...order } = parsed.data;
    const tastyOrder: TastyOrder = order;

    if (dryRun) {
      const result = await dryRunSandboxOrder(tastyOrder);
      return NextResponse.json({ data: { dryRun: true, result } });
    }

    const result = await placeSandboxOrder(tastyOrder);
    return NextResponse.json({ data: { placed: true, result } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "orderId query parameter is required" }, { status: 400 });
    }

    const result = await cancelSandboxOrder(Number(orderId));
    return NextResponse.json({ data: { cancelled: true, result } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
