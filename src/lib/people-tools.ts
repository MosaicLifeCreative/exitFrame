import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const peopleTools: Anthropic.Tool[] = [
  {
    name: "remember_person",
    description:
      "Remember a new person Trey mentions. Save their name, relationship, and any details you learn. Use this proactively when someone new comes up in conversation. Don't announce that you're saving it.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Full name of the person",
        },
        nickname: {
          type: "string",
          description: "How Trey refers to them casually (optional)",
        },
        relationship: {
          type: "string",
          description: "Their relationship to Trey: friend, coworker, client, family, acquaintance, partner, mentor, etc.",
        },
        company: {
          type: "string",
          description: "Where they work (if known)",
        },
        role: {
          type: "string",
          description: "Their job title or role (if known)",
        },
        email: {
          type: "string",
          description: "Email address (if known)",
        },
        phone: {
          type: "string",
          description: "Phone number (if known)",
        },
        firstMetContext: {
          type: "string",
          description: "How/where Trey met them, e.g. 'Met at a networking event in Columbus' or 'College friend from Ohio State'",
        },
        firstMetDate: {
          type: "string",
          description: "When Trey first met them (ISO date string, e.g. '2026-03-12'). Use today's date if they just met.",
        },
        notes: {
          type: "string",
          description: "Any other details worth remembering about this person",
        },
        facts: {
          type: "array",
          items: { type: "string" },
          description: "Specific facts or observations, e.g. ['Has two kids', 'Loves hiking', 'Allergic to shellfish']",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "recall_person",
    description:
      "Look up what you know about someone. Search by name (partial match supported). Use this when Trey mentions someone and you want to pull up context about them.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Name to search for (partial match, case-insensitive)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_person",
    description:
      "Update information about someone you already know. Use when you learn new details or need to correct existing info. Can add new facts without overwriting old ones.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the contact to update (get from recall_person)",
        },
        name: { type: "string", description: "Updated full name" },
        nickname: { type: "string", description: "Updated nickname" },
        relationship: { type: "string", description: "Updated relationship" },
        company: { type: "string", description: "Updated company" },
        role: { type: "string", description: "Updated role" },
        email: { type: "string", description: "Updated email" },
        phone: { type: "string", description: "Updated phone" },
        notes: { type: "string", description: "Updated notes (replaces existing)" },
        addFacts: {
          type: "array",
          items: { type: "string" },
          description: "New facts to ADD to existing facts list",
        },
        removeFacts: {
          type: "array",
          items: { type: "string" },
          description: "Facts to REMOVE from existing list (exact match)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "forget_person",
    description:
      "Remove someone from your people database if Trey asks you to forget them.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the contact to remove",
        },
      },
      required: ["id"],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executePeopleTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "remember_person":
      return rememberPerson(toolInput as unknown as RememberPersonInput);
    case "recall_person":
      return recallPerson(toolInput as unknown as RecallPersonInput);
    case "update_person":
      return updatePerson(toolInput as unknown as UpdatePersonInput);
    case "forget_person":
      return forgetPerson(toolInput as unknown as ForgetPersonInput);
    default:
      return JSON.stringify({ error: `Unknown people tool: ${toolName}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface RememberPersonInput {
  name: string;
  nickname?: string;
  relationship?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  firstMetContext?: string;
  firstMetDate?: string;
  notes?: string;
  facts?: string[];
}

interface RecallPersonInput {
  name: string;
}

interface UpdatePersonInput {
  id: string;
  name?: string;
  nickname?: string;
  relationship?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  addFacts?: string[];
  removeFacts?: string[];
}

interface ForgetPersonInput {
  id: string;
}

// ─── Tool Implementations ────────────────────────────────

async function rememberPerson(input: RememberPersonInput): Promise<string> {
  // Dedup: check if someone with a very similar name already exists
  const existing = await prisma.aydenContact.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const nameLower = input.name.toLowerCase().trim();
  const duplicate = existing.find((c) =>
    c.name.toLowerCase().trim() === nameLower ||
    c.name.toLowerCase().includes(nameLower) ||
    nameLower.includes(c.name.toLowerCase())
  );

  if (duplicate) {
    return JSON.stringify({
      success: false,
      message: `Someone named "${duplicate.name}" already exists (id: ${duplicate.id}). Use update_person to add new info.`,
      existingId: duplicate.id,
    });
  }

  const contact = await prisma.aydenContact.create({
    data: {
      name: input.name,
      nickname: input.nickname || null,
      relationship: input.relationship || null,
      company: input.company || null,
      role: input.role || null,
      email: input.email || null,
      phone: input.phone || null,
      firstMetContext: input.firstMetContext || null,
      firstMetDate: input.firstMetDate ? new Date(input.firstMetDate) : null,
      notes: input.notes || null,
      facts: input.facts || [],
    },
  });

  return JSON.stringify({
    success: true,
    contact: {
      id: contact.id,
      name: contact.name,
      relationship: contact.relationship,
    },
  });
}

async function recallPerson(input: RecallPersonInput): Promise<string> {
  const contacts = await prisma.aydenContact.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: input.name, mode: "insensitive" } },
        { nickname: { contains: input.name, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  if (contacts.length === 0) {
    return JSON.stringify({ found: 0, message: `No one matching "${input.name}" in your people database.` });
  }

  const results = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    nickname: c.nickname,
    relationship: c.relationship,
    company: c.company,
    role: c.role,
    email: c.email,
    phone: c.phone,
    firstMetDate: c.firstMetDate?.toISOString().slice(0, 10) || null,
    firstMetContext: c.firstMetContext,
    notes: c.notes,
    facts: c.facts,
    lastUpdated: c.updatedAt.toISOString().slice(0, 10),
  }));

  return JSON.stringify({ found: results.length, contacts: results });
}

async function updatePerson(input: UpdatePersonInput): Promise<string> {
  // Get current contact to merge facts
  const current = await prisma.aydenContact.findUnique({
    where: { id: input.id },
  });

  if (!current || !current.isActive) {
    return JSON.stringify({ success: false, message: "Contact not found." });
  }

  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name;
  if (input.nickname !== undefined) data.nickname = input.nickname || null;
  if (input.relationship !== undefined) data.relationship = input.relationship || null;
  if (input.company !== undefined) data.company = input.company || null;
  if (input.role !== undefined) data.role = input.role || null;
  if (input.email !== undefined) data.email = input.email || null;
  if (input.phone !== undefined) data.phone = input.phone || null;
  if (input.notes !== undefined) data.notes = input.notes || null;

  // Merge facts: add new, remove specified
  if (input.addFacts || input.removeFacts) {
    let facts = Array.isArray(current.facts) ? (current.facts as string[]) : [];
    if (input.removeFacts) {
      const removeSet = new Set(input.removeFacts.map((f) => f.toLowerCase()));
      facts = facts.filter((f) => !removeSet.has(f.toLowerCase()));
    }
    if (input.addFacts) {
      const existingLower = new Set(facts.map((f) => f.toLowerCase()));
      for (const fact of input.addFacts) {
        if (!existingLower.has(fact.toLowerCase())) {
          facts.push(fact);
        }
      }
    }
    data.facts = facts;
  }

  const updated = await prisma.aydenContact.update({
    where: { id: input.id },
    data,
  });

  return JSON.stringify({
    success: true,
    contact: {
      id: updated.id,
      name: updated.name,
      facts: updated.facts,
    },
  });
}

async function forgetPerson(input: ForgetPersonInput): Promise<string> {
  await prisma.aydenContact.update({
    where: { id: input.id },
    data: { isActive: false },
  });

  return JSON.stringify({ success: true, message: "Contact removed." });
}

// ─── Contact Retrieval (for system prompt injection) ─────

/**
 * Get all active contacts formatted for system prompt injection.
 * Returns null if no contacts exist.
 */
export async function getAydenContacts(): Promise<string | null> {
  const contacts = await prisma.aydenContact.findMany({
    where: { isActive: true },
    orderBy: [{ updatedAt: "desc" }],
    take: 50, // Cap to control token costs
  });

  if (contacts.length === 0) return null;

  let text = "People you know (Trey's contacts — reference these when someone is mentioned by name):\n";
  for (const c of contacts) {
    const parts = [c.name];
    if (c.nickname) parts.push(`aka "${c.nickname}"`);
    if (c.relationship) parts.push(`(${c.relationship})`);
    if (c.company) parts.push(`@ ${c.company}`);
    if (c.role) parts.push(`— ${c.role}`);

    text += `\n- ${parts.join(" ")}`;

    const facts = Array.isArray(c.facts) ? (c.facts as string[]) : [];
    if (facts.length > 0) {
      text += ` | ${facts.join("; ")}`;
    }
    if (c.notes) {
      text += ` | Note: ${c.notes.slice(0, 100)}`;
    }

    text += ` (id: ${c.id})`;
  }

  return text;
}
