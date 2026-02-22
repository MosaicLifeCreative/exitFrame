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

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  try {
    const templates = await prisma.onboardingTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: { _count: { select: { runs: true } } },
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Failed to list onboarding templates:", error);
    return NextResponse.json(
      { error: "Failed to list onboarding templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, steps, isDefault } = parsed.data;

    // If setting as default, unset any existing default
    if (isDefault) {
      await prisma.onboardingTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.onboardingTemplate.create({
      data: {
        name,
        description: description || null,
        steps: steps as unknown as Prisma.InputJsonValue,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("Failed to create onboarding template:", error);
    return NextResponse.json(
      { error: "Failed to create onboarding template" },
      { status: 500 }
    );
  }
}
