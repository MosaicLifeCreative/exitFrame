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
  // ─── Bloodwork Tools ────────────────────────────────────
  {
    name: "add_bloodwork_panel",
    description:
      "Create a bloodwork panel with lab results. Use when the user shares lab results, blood test values, or mentions getting bloodwork done. Auto-computes flagged markers based on reference ranges.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Panel name (e.g. 'Annual Physical 2026', 'Lipid Panel March 2026')",
        },
        date: {
          type: "string",
          description: "Date of the lab work in YYYY-MM-DD format",
        },
        provider: {
          type: "string",
          description: "Doctor or clinic name",
        },
        labName: {
          type: "string",
          description: "Lab name (e.g. 'Quest Diagnostics', 'LabCorp')",
        },
        notes: {
          type: "string",
          description: "Optional notes about this panel",
        },
        markers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Marker name (e.g. 'Total Cholesterol', 'HDL', 'Hemoglobin A1C')",
              },
              value: {
                type: "number",
                description: "The measured value",
              },
              unit: {
                type: "string",
                description: "Unit of measurement (e.g. 'mg/dL', 'mmol/L', '%', 'ng/dL')",
              },
              referenceLow: {
                type: "number",
                description: "Low end of reference range (optional)",
              },
              referenceHigh: {
                type: "number",
                description: "High end of reference range (optional)",
              },
              category: {
                type: "string",
                enum: ["lipids", "metabolic", "hormones", "cbc", "thyroid", "liver", "kidney", "vitamins", "inflammation", "other"],
                description: "Marker category",
              },
            },
            required: ["name", "value", "unit"],
          },
          description: "Array of biomarker results",
        },
      },
      required: ["name", "date", "markers"],
    },
  },
  {
    name: "get_bloodwork_panels",
    description:
      "List bloodwork panels with marker summaries. Shows panel name, date, total markers, and how many are flagged out of range.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of panels to return (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_bloodwork_trends",
    description:
      "Get historical values for a specific biomarker across all panels. Use to track how a marker has changed over time (e.g. cholesterol trends, A1C progression).",
    input_schema: {
      type: "object" as const,
      properties: {
        markerName: {
          type: "string",
          description: "Name of the marker to track (e.g. 'Total Cholesterol', 'HDL', 'Hemoglobin A1C'). Case-insensitive search.",
        },
      },
      required: ["markerName"],
    },
  },
  // ─── Family History Tools ───────────────────────────────
  {
    name: "add_family_member",
    description:
      "Add a family member with their health conditions. Use when the user shares family medical history (e.g. 'my dad has high blood pressure').",
    input_schema: {
      type: "object" as const,
      properties: {
        relation: {
          type: "string",
          description: "Relation to user (e.g. 'mother', 'father', 'sibling', 'grandparent-maternal', 'grandparent-paternal', 'uncle-paternal', 'aunt-maternal')",
        },
        name: {
          type: "string",
          description: "Optional display name",
        },
        isAlive: {
          type: "boolean",
          description: "Whether the family member is alive",
        },
        notes: {
          type: "string",
          description: "Optional notes",
        },
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              condition: {
                type: "string",
                description: "Health condition (e.g. 'high cholesterol', 'type 2 diabetes', 'hypertension', 'heart disease', 'cancer')",
              },
              ageOfOnset: {
                type: "number",
                description: "Age when condition was diagnosed",
              },
              notes: {
                type: "string",
                description: "Optional notes about this condition",
              },
            },
            required: ["condition"],
          },
          description: "Health conditions for this family member",
        },
      },
      required: ["relation"],
    },
  },
  {
    name: "get_family_history",
    description:
      "List all family members and their health conditions. Use to review family medical history for risk assessment or when contextualizing bloodwork results.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // ─── Oura Ring Tools ──────────────────────────────────
  {
    name: "get_oura_data",
    description:
      "Get Oura Ring data: sleep scores, readiness, activity, HRV, heart rate, SpO2, stress, and resilience. Use this to check how Trey slept, his recovery status, activity levels, or any biometric data from his ring. The cross-domain context only shows last night's summary — use this tool for detailed data or historical trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        dataType: {
          type: "string",
          enum: ["sleep", "readiness", "activity", "heartrate", "spo2", "stress", "resilience", "all"],
          description: "Type of Oura data to retrieve. Use 'all' for a full overview (default: all)",
        },
        days: {
          type: "number",
          description: "Number of days to look back (default: 7, max: 90)",
        },
      },
      required: [],
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
    case "add_bloodwork_panel":
      return addBloodworkPanel(toolInput as unknown as AddBloodworkPanelInput);
    case "get_bloodwork_panels":
      return getBloodworkPanels(toolInput as unknown as GetBloodworkPanelsInput);
    case "get_bloodwork_trends":
      return getBloodworkTrends(toolInput as unknown as GetBloodworkTrendsInput);
    case "add_family_member":
      return addFamilyMember(toolInput as unknown as AddFamilyMemberInput);
    case "get_family_history":
      return getFamilyHistory();
    case "get_oura_data":
      return getOuraData(toolInput as unknown as GetOuraDataInput);
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

interface BloodworkMarkerInput {
  name: string;
  value: number;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  category?: string;
}

interface AddBloodworkPanelInput {
  name: string;
  date: string;
  provider?: string;
  labName?: string;
  notes?: string;
  markers: BloodworkMarkerInput[];
}

interface GetBloodworkPanelsInput {
  limit?: number;
}

interface GetBloodworkTrendsInput {
  markerName: string;
}

interface GetOuraDataInput {
  dataType?: string;
  days?: number;
}

interface FamilyConditionInput {
  condition: string;
  ageOfOnset?: number;
  notes?: string;
}

interface AddFamilyMemberInput {
  relation: string;
  name?: string;
  isAlive?: boolean;
  notes?: string;
  conditions?: FamilyConditionInput[];
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

// ─── Bloodwork Implementations ──────────────────────────

async function addBloodworkPanel(input: AddBloodworkPanelInput): Promise<string> {
  const markersData = input.markers.map((m) => {
    let isFlagged = false;
    let flagDirection: string | null = null;

    if (m.referenceLow !== undefined && m.value < m.referenceLow) {
      isFlagged = true;
      flagDirection = "low";
    } else if (m.referenceHigh !== undefined && m.value > m.referenceHigh) {
      isFlagged = true;
      flagDirection = "high";
    }

    return {
      name: m.name,
      value: m.value,
      unit: m.unit,
      referenceLow: m.referenceLow ?? null,
      referenceHigh: m.referenceHigh ?? null,
      isFlagged,
      flagDirection,
      category: m.category ?? null,
    };
  });

  const panel = await prisma.bloodworkPanel.create({
    data: {
      name: input.name,
      date: new Date(input.date + "T00:00:00Z"),
      provider: input.provider,
      labName: input.labName,
      notes: input.notes,
      importedFrom: "claude",
      markers: {
        create: markersData,
      },
    },
    include: {
      markers: true,
    },
  });

  const flaggedCount = panel.markers.filter((m) => m.isFlagged).length;

  return JSON.stringify({
    success: true,
    panel: {
      id: panel.id,
      name: panel.name,
      date: input.date,
      provider: panel.provider,
      labName: panel.labName,
      markerCount: panel.markers.length,
      flaggedCount,
      flaggedMarkers: panel.markers
        .filter((m) => m.isFlagged)
        .map((m) => ({
          name: m.name,
          value: Number(m.value),
          unit: m.unit,
          flagDirection: m.flagDirection,
        })),
    },
  });
}

async function getBloodworkPanels(input: GetBloodworkPanelsInput): Promise<string> {
  const limit = input.limit || 10;

  const panels = await prisma.bloodworkPanel.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      markers: true,
    },
  });

  const result = panels.map((p) => ({
    id: p.id,
    name: p.name,
    date: p.date.toISOString().slice(0, 10),
    provider: p.provider,
    labName: p.labName,
    notes: p.notes,
    markerCount: p.markers.length,
    flaggedCount: p.markers.filter((m) => m.isFlagged).length,
    flaggedMarkers: p.markers
      .filter((m) => m.isFlagged)
      .map((m) => ({
        name: m.name,
        value: Number(m.value),
        unit: m.unit,
        flagDirection: m.flagDirection,
      })),
  }));

  return JSON.stringify({ panels: result, count: result.length });
}

async function getBloodworkTrends(input: GetBloodworkTrendsInput): Promise<string> {
  const markers = await prisma.bloodworkMarker.findMany({
    where: {
      name: {
        contains: input.markerName,
        mode: "insensitive",
      },
    },
    include: {
      panel: {
        select: {
          name: true,
          date: true,
        },
      },
    },
    orderBy: {
      panel: {
        date: "asc",
      },
    },
  });

  const trend = markers.map((m) => ({
    date: m.panel.date.toISOString().slice(0, 10),
    panelName: m.panel.name,
    value: Number(m.value),
    unit: m.unit,
    referenceLow: m.referenceLow ? Number(m.referenceLow) : null,
    referenceHigh: m.referenceHigh ? Number(m.referenceHigh) : null,
    isFlagged: m.isFlagged,
    flagDirection: m.flagDirection,
  }));

  return JSON.stringify({
    markerName: input.markerName,
    dataPoints: trend,
    count: trend.length,
  });
}

// ─── Family History Implementations ─────────────────────

async function addFamilyMember(input: AddFamilyMemberInput): Promise<string> {
  const member = await prisma.familyMember.create({
    data: {
      relation: input.relation,
      name: input.name,
      isAlive: input.isAlive,
      notes: input.notes,
      conditions: input.conditions
        ? {
            create: input.conditions.map((c) => ({
              condition: c.condition,
              ageOfOnset: c.ageOfOnset,
              notes: c.notes,
            })),
          }
        : undefined,
    },
    include: {
      conditions: true,
    },
  });

  return JSON.stringify({
    success: true,
    familyMember: {
      id: member.id,
      relation: member.relation,
      name: member.name,
      isAlive: member.isAlive,
      conditionCount: member.conditions.length,
      conditions: member.conditions.map((c) => ({
        id: c.id,
        condition: c.condition,
        ageOfOnset: c.ageOfOnset,
      })),
    },
  });
}

async function getFamilyHistory(): Promise<string> {
  const members = await prisma.familyMember.findMany({
    include: {
      conditions: true,
    },
    orderBy: { relation: "asc" },
  });

  const result = members.map((m) => ({
    id: m.id,
    relation: m.relation,
    name: m.name,
    isAlive: m.isAlive,
    notes: m.notes,
    conditions: m.conditions.map((c) => ({
      id: c.id,
      condition: c.condition,
      ageOfOnset: c.ageOfOnset,
      notes: c.notes,
    })),
  }));

  return JSON.stringify({ familyMembers: result, count: result.length });
}

// ─── Oura Ring Implementation ───────────────────────────

async function getOuraData(input: GetOuraDataInput): Promise<string> {
  const days = Math.min(input.days || 7, 90);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const requestedType = input.dataType || "all";
  const types =
    requestedType === "all"
      ? ["sleep", "readiness", "activity", "heartrate", "spo2", "stress", "resilience"]
      : [requestedType];

  const rows = await prisma.ouraData.findMany({
    where: {
      dataType: { in: types },
      date: { gte: startDate },
    },
    orderBy: { date: "desc" },
  });

  if (rows.length === 0) {
    return JSON.stringify({
      message: `No Oura data found for the last ${days} days. Oura data may not have synced yet today — check if the ring has synced recently.`,
      dataTypes: types,
      days,
    });
  }

  // Group by type for cleaner output
  const grouped: Record<string, unknown[]> = {};
  for (const row of rows) {
    const type = row.dataType;
    if (!grouped[type]) grouped[type] = [];

    const entry: Record<string, unknown> = {
      date: row.date.toISOString().slice(0, 10),
    };

    // Include scalar fields
    if (row.sleepScore != null) entry.sleepScore = row.sleepScore;
    if (row.readinessScore != null) entry.readinessScore = row.readinessScore;
    if (row.activityScore != null) entry.activityScore = row.activityScore;
    if (row.hrvAverage != null) entry.hrvAverage = parseFloat(String(row.hrvAverage));

    // Include detailed data from JSON column
    if (row.data && typeof row.data === "object") {
      entry.details = row.data;
    }

    grouped[type].push(entry);
  }

  return JSON.stringify({
    ouraData: grouped,
    days,
    dataTypes: Object.keys(grouped),
    totalEntries: rows.length,
  });
}

