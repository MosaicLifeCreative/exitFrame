import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  domain: z.enum(["life", "mlc", "product"]),
  domainRefId: z.string().uuid().nullable().optional(),
  projectType: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedBudget: z.number().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const clientId = searchParams.get("client_id");
    const productId = searchParams.get("product_id");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (domain) where.domain = domain;
    if (status) where.status = status;
    if (clientId) {
      where.domain = "mlc";
      where.domainRefId = clientId;
    }
    if (productId) {
      where.domain = "product";
      where.domainRefId = productId;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: { select: { tasks: true, phases: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        domain: parsed.data.domain,
        domainRefId: parsed.data.domainRefId || null,
        projectType: parsed.data.projectType || "general",
        priority: parsed.data.priority || "medium",
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        estimatedBudget: parsed.data.estimatedBudget ?? null,
      },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
