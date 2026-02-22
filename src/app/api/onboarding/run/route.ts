import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/activity";

const runSchema = z.object({
  templateId: z.string().uuid(),
  clientId: z.string().uuid(),
});

interface OnboardingStep {
  actionType: string;
  label: string;
  config?: Record<string, unknown>;
}

interface StepResult {
  stepIndex: number;
  label: string;
  actionType: string;
  status: "success" | "failed" | "manual";
  message: string;
  createdId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = runSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { templateId, clientId } = parsed.data;

    // Verify template and client exist
    const [template, client] = await Promise.all([
      prisma.onboardingTemplate.findUnique({ where: { id: templateId } }),
      prisma.client.findUnique({ where: { id: clientId } }),
    ]);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const steps = template.steps as unknown as OnboardingStep[];
    const results: StepResult[] = [];

    // Execute each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      try {
        const result = await executeStep(step, clientId, client.name, i);
        results.push(result);
      } catch (error) {
        console.error(`Step ${i} failed:`, error);
        results.push({
          stepIndex: i,
          label: step.label,
          actionType: step.actionType,
          status: "failed",
          message: `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }

    const allSucceeded = results.every((r) => r.status !== "failed");

    // Create the run record
    const run = await prisma.onboardingRun.create({
      data: {
        templateId,
        clientId,
        status: allSucceeded ? "completed" : "failed",
        stepsCompleted: results as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    logActivity({
      domain: "mlc",
      domainRefId: clientId,
      module: "onboarding",
      activityType: "completed",
      title: `Ran onboarding '${template.name}' for client '${client.name}'`,
      refType: "client",
      refId: clientId,
    });

    return NextResponse.json({ data: { run, results } }, { status: 201 });
  } catch (error) {
    console.error("Failed to run onboarding:", error);
    return NextResponse.json(
      { error: "Failed to run onboarding" },
      { status: 500 }
    );
  }
}

async function executeStep(
  step: OnboardingStep,
  clientId: string,
  clientName: string,
  stepIndex: number
): Promise<StepResult> {
  const config = step.config || {};

  switch (step.actionType) {
    case "enable_service": {
      const serviceType = (config.serviceType as string) || "notes";

      // Check if service already exists
      const existing = await prisma.clientService.findFirst({
        where: { clientId, serviceType },
      });

      if (existing) {
        // Activate it if inactive
        if (!existing.isActive) {
          await prisma.clientService.update({
            where: { id: existing.id },
            data: { isActive: true },
          });
        }
        return {
          stepIndex,
          label: step.label,
          actionType: step.actionType,
          status: "success",
          message: `Service '${serviceType}' already exists, ensured active`,
          createdId: existing.id,
        };
      }

      const service = await prisma.clientService.create({
        data: {
          clientId,
          serviceType,
          isActive: true,
        },
      });

      return {
        stepIndex,
        label: step.label,
        actionType: step.actionType,
        status: "success",
        message: `Enabled service '${serviceType}'`,
        createdId: service.id,
      };
    }

    case "create_project": {
      const projectName =
        (config.projectName as string) || `${clientName} - New Project`;
      const projectType = (config.projectType as string) || "general";

      const project = await prisma.project.create({
        data: {
          name: projectName,
          domain: "mlc",
          domainRefId: clientId,
          projectType,
          status: "active",
          priority: "medium",
        },
      });

      logActivity({
        domain: "mlc",
        domainRefId: clientId,
        module: "projects",
        activityType: "created",
        title: `Created project '${projectName}' via onboarding`,
        refType: "project",
        refId: project.id,
      });

      return {
        stepIndex,
        label: step.label,
        actionType: step.actionType,
        status: "success",
        message: `Created project '${projectName}'`,
        createdId: project.id,
      };
    }

    case "create_tasks": {
      const tasks = (config.tasks as Array<{ title: string; priority?: string }>) || [];

      if (tasks.length === 0) {
        return {
          stepIndex,
          label: step.label,
          actionType: step.actionType,
          status: "success",
          message: "No tasks configured, skipped",
        };
      }

      // Find or create a project for these tasks
      let projectId: string | null = null;
      if (config.projectName) {
        const project = await prisma.project.findFirst({
          where: {
            domainRefId: clientId,
            name: config.projectName as string,
          },
        });
        if (project) projectId = project.id;
      }

      for (const task of tasks) {
        await prisma.task.create({
          data: {
            title: task.title,
            projectId,
            status: "todo",
            priority: task.priority || "medium",
          },
        });
      }

      return {
        stepIndex,
        label: step.label,
        actionType: step.actionType,
        status: "success",
        message: `Created ${tasks.length} task(s)`,
      };
    }

    case "send_welcome_email": {
      // Not automated in Phase 1 — log as manual task
      return {
        stepIndex,
        label: step.label,
        actionType: step.actionType,
        status: "manual",
        message: "Welcome email step logged as manual to-do (email integration comes later)",
      };
    }

    case "other":
    default: {
      return {
        stepIndex,
        label: step.label,
        actionType: step.actionType,
        status: "manual",
        message: `Manual step: ${step.label}`,
      };
    }
  }
}
