import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const healthTools: Anthropic.Tool[] = [
  {
    name: "log_symptoms",
    description:
      "Log symptoms the user is experiencing. Use this when they mention feeling sick, having pain, or any health complaint. Creates a symptom log entry in the database.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (defaults to today)",
        },
        symptoms: {
          type: "array",
          items: { type: "string" },
          description:
            "List of symptom tags (e.g. 'congestion', 'sore-throat', 'fatigue', 'headache', 'fever', 'cough', 'body-aches', 'nausea', 'brain-fog', 'runny-nose', 'sneezing')",
        },
        severity: {
          type: "number",
          description: "Severity 1-5 (1=mild, 3=moderate, 5=severe). Infer from user's description.",
        },
        notes: {
          type: "string",
          description: "Free-text notes about the symptoms",
        },
      },
      required: ["symptoms", "severity"],
    },
  },
  {
    name: "get_symptom_history",
    description:
      "Get recent symptom log entries. Use this to review the user's illness history and track recovery progress.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days to look back (default 30)",
        },
        activeOnly: {
          type: "boolean",
          description: "Only return unresolved symptom entries (default false)",
        },
      },
      required: [],
    },
  },
  {
    name: "resolve_symptoms",
    description:
      "Mark a symptom log as resolved. Use when the user says they're feeling better or recovered.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the symptom log to resolve. Get from get_symptom_history.",
        },
        resolvedDate: {
          type: "string",
          description: "Date resolved in YYYY-MM-DD format (defaults to today)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "add_supplement",
    description:
      "Add a new supplement to the user's supplement stack. Use when they mention starting a new supplement.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Supplement name (e.g. 'Creatine Monohydrate', 'Vitamin D3', 'Fish Oil')",
        },
        dosage: {
          type: "string",
          description: "Dosage amount (e.g. '5g', '2000 IU', '1 capsule', '500mg')",
        },
        frequency: {
          type: "string",
          enum: ["daily", "twice-daily", "as-needed", "weekly"],
          description: "How often taken (default: daily)",
        },
        category: {
          type: "string",
          enum: ["vitamin", "mineral", "amino-acid", "herb", "probiotic", "protein", "other"],
          description: "Supplement category",
        },
        notes: {
          type: "string",
          description: "Optional notes (e.g. 'take with food', 'morning only')",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_supplements",
    description:
      "List the user's current supplement stack. Shows active supplements with dosage and frequency.",
    input_schema: {
      type: "object" as const,
      properties: {
        includeInactive: {
          type: "boolean",
          description: "Include discontinued supplements (default false)",
        },
      },
      required: [],
    },
  },
  {
    name: "update_supplement",
    description:
      "Update or discontinue a supplement. Use when user changes dosage, stops taking something, or resumes a supplement.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the supplement to update. Get from list_supplements.",
        },
        dosage: { type: "string", description: "New dosage" },
        frequency: {
          type: "string",
          enum: ["daily", "twice-daily", "as-needed", "weekly"],
        },
        notes: { type: "string" },
        isActive: {
          type: "boolean",
          description: "Set to false to discontinue, true to resume",
        },
      },
      required: ["id"],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeHealthTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "log_symptoms":
      return logSymptoms(toolInput as unknown as LogSymptomsInput);
    case "get_symptom_history":
      return getSymptomHistory(toolInput as unknown as GetSymptomHistoryInput);
    case "resolve_symptoms":
      return resolveSymptoms(toolInput as unknown as ResolveSymptomsInput);
    case "add_supplement":
      return addSupplement(toolInput as unknown as AddSupplementInput);
    case "list_supplements":
      return listSupplements(toolInput as unknown as ListSupplementsInput);
    case "update_supplement":
      return updateSupplement(toolInput as unknown as UpdateSupplementInput);
    default:
      return JSON.stringify({ error: `Unknown health tool: ${toolName}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface LogSymptomsInput {
  date?: string;
  symptoms: string[];
  severity: number;
  notes?: string;
}

interface GetSymptomHistoryInput {
  days?: number;
  activeOnly?: boolean;
}

interface ResolveSymptomsInput {
  id: string;
  resolvedDate?: string;
}

interface AddSupplementInput {
  name: string;
  dosage?: string;
  frequency?: string;
  category?: string;
  notes?: string;
}

interface ListSupplementsInput {
  includeInactive?: boolean;
}

interface UpdateSupplementInput {
  id: string;
  dosage?: string;
  frequency?: string;
  notes?: string;
  isActive?: boolean;
}

// ─── Tool Implementations ────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function logSymptoms(input: LogSymptomsInput): Promise<string> {
  const date = input.date || todayStr();
  const severity = Math.min(5, Math.max(1, Math.round(input.severity)));

  const entry = await prisma.symptomLog.create({
    data: {
      date: new Date(date + "T00:00:00Z"),
      symptoms: input.symptoms,
      severity,
      notes: input.notes,
      source: "claude",
    },
  });

  return JSON.stringify({
    success: true,
    entry: {
      id: entry.id,
      date,
      symptoms: entry.symptoms,
      severity: entry.severity,
      notes: entry.notes,
    },
  });
}

async function getSymptomHistory(input: GetSymptomHistoryInput): Promise<string> {
  const days = input.days || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const where: Record<string, unknown> = {
    date: { gte: since },
  };
  if (input.activeOnly) where.resolved = false;

  const entries = await prisma.symptomLog.findMany({
    where,
    orderBy: { date: "desc" },
    take: 50,
  });

  const history = entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    symptoms: e.symptoms,
    severity: e.severity,
    notes: e.notes,
    resolved: e.resolved,
    resolvedDate: e.resolvedDate?.toISOString().slice(0, 10) ?? null,
    source: e.source,
  }));

  return JSON.stringify({ entries: history, count: history.length });
}

async function resolveSymptoms(input: ResolveSymptomsInput): Promise<string> {
  const resolvedDate = input.resolvedDate || todayStr();

  const entry = await prisma.symptomLog.update({
    where: { id: input.id },
    data: {
      resolved: true,
      resolvedDate: new Date(resolvedDate + "T00:00:00Z"),
    },
  });

  return JSON.stringify({
    success: true,
    entry: {
      id: entry.id,
      date: entry.date.toISOString().slice(0, 10),
      resolved: true,
      resolvedDate,
    },
  });
}

async function addSupplement(input: AddSupplementInput): Promise<string> {
  const supplement = await prisma.supplement.create({
    data: {
      name: input.name,
      dosage: input.dosage,
      frequency: input.frequency || "daily",
      category: input.category,
      notes: input.notes,
      startDate: new Date(todayStr() + "T00:00:00Z"),
    },
  });

  return JSON.stringify({
    success: true,
    supplement: {
      id: supplement.id,
      name: supplement.name,
      dosage: supplement.dosage,
      frequency: supplement.frequency,
      category: supplement.category,
    },
  });
}

async function listSupplements(input: ListSupplementsInput): Promise<string> {
  const where: Record<string, unknown> = {};
  if (!input.includeInactive) where.isActive = true;

  const supplements = await prisma.supplement.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const result = supplements.map((s) => ({
    id: s.id,
    name: s.name,
    dosage: s.dosage,
    frequency: s.frequency,
    category: s.category,
    notes: s.notes,
    isActive: s.isActive,
    startDate: s.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: s.endDate?.toISOString().slice(0, 10) ?? null,
  }));

  return JSON.stringify({ supplements: result, count: result.length });
}

async function updateSupplement(input: UpdateSupplementInput): Promise<string> {
  const data: Record<string, unknown> = {};
  if (input.dosage !== undefined) data.dosage = input.dosage;
  if (input.frequency !== undefined) data.frequency = input.frequency;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
    if (!input.isActive) {
      data.endDate = new Date(todayStr() + "T00:00:00Z");
    } else {
      data.endDate = null;
      data.startDate = new Date(todayStr() + "T00:00:00Z");
    }
  }

  const supplement = await prisma.supplement.update({
    where: { id: input.id },
    data,
  });

  return JSON.stringify({
    success: true,
    supplement: {
      id: supplement.id,
      name: supplement.name,
      dosage: supplement.dosage,
      frequency: supplement.frequency,
      isActive: supplement.isActive,
    },
  });
}

