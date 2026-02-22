import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  contactFirstName: z.string().nullable().optional(),
  contactLastName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional().or(z.literal("")),
  contactPhone: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { services: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error("Failed to get client:", error);
    return NextResponse.json({ error: "Failed to get client" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = { ...parsed.data };
    // Clean empty email strings to null
    if (data.contactEmail === "") {
      data.contactEmail = null;
    }

    const client = await prisma.client.update({
      where: { id: params.id },
      data,
      include: { services: true },
    });

    logActivity({
      domain: "mlc",
      domainRefId: client.id,
      module: "clients",
      activityType: "updated",
      title: "Updated client",
      refType: "client",
      refId: client.id,
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error("Failed to update client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete: set is_active = false
    const client = await prisma.client.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    logActivity({
      domain: "mlc",
      domainRefId: client.id,
      module: "clients",
      activityType: "archived",
      title: "Archived client",
      refType: "client",
      refId: client.id,
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error("Failed to archive client:", error);
    return NextResponse.json({ error: "Failed to archive client" }, { status: 500 });
  }
}
