import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// ─── Tool Definitions (Anthropic format) ────────────────

export const noteTools: Anthropic.Tool[] = [
  {
    name: "create_note",
    description:
      "Create a note. Use when Trey asks you to jot something down, or during agency sessions to capture your own ideas and reflections. Notes are displayed in a rich text editor, so ALWAYS write content as HTML (use <h2>, <h3>, <p>, <strong>, <em>, <ul>/<ol>/<li>, <br> tags). NEVER write raw markdown — it won't render correctly.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title of the note",
        },
        content: {
          type: "string",
          description: "Note content as HTML. Use <p> for paragraphs, <h2>/<h3> for headings, <strong> for bold, <ul>/<ol> for lists, <br> for line breaks. Structure content with clear sections — avoid wall-of-text paragraphs.",
        },
        noteType: {
          type: "string",
          enum: ["general", "idea", "meeting_notes", "reference", "checklist"],
          description: "Type of note (default: general)",
        },
        domain: {
          type: "string",
          enum: ["life", "mlc", "product"],
          description: "Domain the note belongs to (default: life)",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "search_notes",
    description:
      "Search notes by keyword — includes both Trey's notes and notes you created during agency sessions. Use when looking for something previously written down.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term to match against note titles and content",
        },
        noteType: {
          type: "string",
          enum: ["general", "idea", "meeting_notes", "reference", "checklist"],
          description: "Filter by note type (optional)",
        },
        domain: {
          type: "string",
          enum: ["life", "mlc", "product"],
          description: "Filter by domain (optional)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "update_note",
    description:
      "Update an existing note. Use when Trey asks you to edit, add to, or modify a note. Get the id from search_notes first.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "UUID of the note to update (get from search_notes or list_notes)",
        },
        title: {
          type: "string",
          description: "Updated title (optional)",
        },
        content: {
          type: "string",
          description: "Updated content as HTML (optional). Use <p>, <h2>, <h3>, <strong>, <ul>/<ol>, etc.",
        },
        noteType: {
          type: "string",
          enum: ["general", "idea", "meeting_notes", "reference", "checklist"],
          description: "Updated note type (optional)",
        },
        isPinned: {
          type: "boolean",
          description: "Pin or unpin the note (optional)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "list_notes",
    description:
      "List recent notes — includes both Trey's notes and notes you created during agency sessions.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of notes to return (default: 10, max: 25)",
        },
        noteType: {
          type: "string",
          enum: ["general", "idea", "meeting_notes", "reference", "checklist"],
          description: "Filter by note type (optional)",
        },
        domain: {
          type: "string",
          enum: ["life", "mlc", "product"],
          description: "Filter by domain (optional)",
        },
        pinnedOnly: {
          type: "boolean",
          description: "Only return pinned notes (optional)",
        },
      },
      required: [],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

export async function executeNoteTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "create_note":
      return createNote(toolInput as unknown as CreateNoteInput);
    case "search_notes":
      return searchNotes(toolInput as unknown as SearchNotesInput);
    case "update_note":
      return updateNote(toolInput as unknown as UpdateNoteInput);
    case "list_notes":
      return listNotes(toolInput as unknown as ListNotesInput);
    default:
      return JSON.stringify({ error: `Unknown note tool: ${toolName}` });
  }
}

// ─── Input Types ─────────────────────────────────────────

interface CreateNoteInput {
  title: string;
  content?: string;
  noteType?: string;
  domain?: string;
}

interface SearchNotesInput {
  query: string;
  noteType?: string;
  domain?: string;
}

interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  noteType?: string;
  isPinned?: boolean;
}

interface ListNotesInput {
  limit?: number;
  noteType?: string;
  domain?: string;
  pinnedOnly?: boolean;
}

// ─── Tool Implementations ────────────────────────────────

async function createNote(input: CreateNoteInput): Promise<string> {
  const note = await prisma.note.create({
    data: {
      title: input.title,
      content: input.content || "",
      noteType: input.noteType || "general",
      domain: input.domain || "life",
      createdBy: "ayden",
      isPinned: false,
    },
  });

  return JSON.stringify({
    success: true,
    note: {
      id: note.id,
      title: note.title,
      noteType: note.noteType,
      domain: note.domain,
      createdAt: note.createdAt.toISOString().slice(0, 10),
    },
  });
}

async function searchNotes(input: SearchNotesInput): Promise<string> {
  const where: Record<string, unknown> = {
    OR: [
      { title: { contains: input.query, mode: "insensitive" } },
      { content: { contains: input.query, mode: "insensitive" } },
    ],
  };

  if (input.noteType) where.noteType = input.noteType;
  if (input.domain) where.domain = input.domain;

  const notes = await prisma.note.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 10,
  });

  if (notes.length === 0) {
    return JSON.stringify({ found: 0, message: `No notes matching "${input.query}".` });
  }

  const results = notes.map((n) => ({
    id: n.id,
    title: n.title,
    snippet: n.content.length > 100 ? n.content.slice(0, 100) + "..." : n.content,
    noteType: n.noteType,
    domain: n.domain,
    isPinned: n.isPinned,
    createdAt: n.createdAt.toISOString().slice(0, 10),
    updatedAt: n.updatedAt.toISOString().slice(0, 10),
  }));

  return JSON.stringify({ found: results.length, notes: results });
}

async function updateNote(input: UpdateNoteInput): Promise<string> {
  const existing = await prisma.note.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    return JSON.stringify({ success: false, message: "Note not found." });
  }

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.content !== undefined) data.content = input.content;
  if (input.noteType !== undefined) data.noteType = input.noteType;
  if (input.isPinned !== undefined) data.isPinned = input.isPinned;

  const updated = await prisma.note.update({
    where: { id: input.id },
    data,
  });

  return JSON.stringify({
    success: true,
    note: {
      id: updated.id,
      title: updated.title,
      noteType: updated.noteType,
      domain: updated.domain,
      isPinned: updated.isPinned,
      updatedAt: updated.updatedAt.toISOString().slice(0, 10),
    },
  });
}

async function listNotes(input: ListNotesInput): Promise<string> {
  const where: Record<string, unknown> = {};

  if (input.noteType) where.noteType = input.noteType;
  if (input.domain) where.domain = input.domain;
  if (input.pinnedOnly) where.isPinned = true;

  const limit = Math.min(input.limit || 10, 25);

  const notes = await prisma.note.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  if (notes.length === 0) {
    return JSON.stringify({ found: 0, message: "No notes found." });
  }

  const results = notes.map((n) => ({
    id: n.id,
    title: n.title,
    snippet: n.content.length > 100 ? n.content.slice(0, 100) + "..." : n.content,
    noteType: n.noteType,
    domain: n.domain,
    isPinned: n.isPinned,
    createdAt: n.createdAt.toISOString().slice(0, 10),
    updatedAt: n.updatedAt.toISOString().slice(0, 10),
  }));

  return JSON.stringify({ found: results.length, notes: results });
}
