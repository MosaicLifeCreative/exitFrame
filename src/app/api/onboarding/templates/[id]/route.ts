import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
export const dynamic = "force-dynamic";

const stepSchema = z.object({
  actionType: z.enum([
    "enable_service",
    "create_project",
    "create_tasks",
    "send_welcome_email",
    "other",
  ]),
  label: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  steps: z.array(stepSchema).min(1).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.onboardingTemplate.findUnique({
      where: { id: params.id },
      include: {
        runs: {
          include: { client: { select: { id: true, name: true } } },
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("Failed to get onboarding template:", error);
    return NextResponse.json(
      { error: "Failed to get onboarding template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { isDefault, steps, ...rest } = parsed.data;

    // If setting as default, unset any existing default
    if (isDefault) {
      await prisma.onboardingTemplate.updateMany({
        where: { isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.onboardingTemplate.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(steps !== undefined
          ? { steps: steps as unknown as Prisma.InputJsonValue }
          : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    });

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("Failed to update onboarding template:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.onboardingTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete onboarding template:", error);
    return NextResponse.json(
      { error: "Failed to delete onboarding template" },
      { status: 500 }
    );
  }
}
