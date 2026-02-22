import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
export const dynamic = "force-dynamic";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  projectType: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedBudget: z.number().nullable().optional(),
  actualSpent: z.number().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        phases: {
          orderBy: { sortOrder: "asc" },
          include: { _count: { select: { tasks: true } } },
        },
        tasks: { orderBy: { sortOrder: "asc" } },
        _count: { select: { tasks: true, phases: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Resolve domain ref name
    let domainRefName: string | null = null;
    if (project.domainRefId) {
      if (project.domain === "mlc") {
        const client = await prisma.client.findUnique({
          where: { id: project.domainRefId },
          select: { name: true },
        });
        domainRefName = client?.name ?? null;
      } else if (project.domain === "product") {
        const product = await prisma.product.findUnique({
          where: { id: project.domainRefId },
          select: { name: true },
        });
        domainRefName = product?.name ?? null;
      }
    }

    return NextResponse.json({ data: { ...project, domainRefName } });
  } catch (error) {
    console.error("Failed to get project:", error);
    return NextResponse.json({ error: "Failed to get project" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (data.dueDate !== undefined) {
      data.dueDate = data.dueDate ? new Date(data.dueDate as string) : null;
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data,
    });

    logActivity({
      domain: project.domain,
      domainRefId: project.domainRefId ?? undefined,
      module: "projects",
      activityType: "updated",
      title: "Updated project",
      refType: "project",
      refId: project.id,
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.update({
      where: { id: params.id },
      data: { status: "archived" },
    });

    logActivity({
      domain: project.domain,
      domainRefId: project.domainRefId ?? undefined,
      module: "projects",
      activityType: "archived",
      title: "Archived project",
      refType: "project",
      refId: project.id,
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("Failed to archive project:", error);
    return NextResponse.json({ error: "Failed to archive project" }, { status: 500 });
  }
}
