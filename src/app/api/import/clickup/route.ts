import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
export const dynamic = "force-dynamic";

interface ClickUpTask {
  name?: string;
  title?: string;
  description?: string;
  content?: string;
  text_content?: string;
  status?: { status?: string } | string;
  date_created?: string;
  date_updated?: string;
  list?: { name?: string } | string;
  folder?: { name?: string } | string;
  space?: { name?: string } | string;
}

interface CsvRow {
  [key: string]: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const fileName = file.name.toLowerCase();

    let notes: Array<{
      title: string;
      content: string;
      noteType: string;
      domain: string;
      importedFrom: string;
      importedAt: Date;
    }> = [];

    if (fileName.endsWith(".json")) {
      notes = parseJsonExport(text);
    } else if (fileName.endsWith(".csv")) {
      notes = parseCsvExport(text);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a CSV or JSON file." },
        { status: 400 }
      );
    }

    if (notes.length === 0) {
      return NextResponse.json(
        { error: "No importable items found in the file." },
        { status: 400 }
      );
    }

    // Create notes in batch
    const created = await prisma.$transaction(
      notes.map((note) =>
        prisma.note.create({
          data: note,
        })
      )
    );

    logActivity({
      domain: "mlc",
      module: "notes",
      activityType: "created",
      title: `Imported ${created.length} note(s) from ClickUp`,
    });

    return NextResponse.json({
      data: {
        imported: created.length,
        notes: created.map((n) => ({ id: n.id, title: n.title })),
      },
    });
  } catch (error) {
    console.error("Failed to import from ClickUp:", error);
    return NextResponse.json(
      { error: "Failed to import from ClickUp" },
      { status: 500 }
    );
  }
}

function parseJsonExport(text: string) {
  const now = new Date();

  try {
    const data = JSON.parse(text);
    const items: ClickUpTask[] = Array.isArray(data)
      ? data
      : data.tasks || data.items || data.docs || [];

    return items
      .filter((item) => {
        const title = item.name || item.title;
        return title && title.trim();
      })
      .map((item) => {
        const title = (item.name || item.title || "Untitled").trim();
        const content = item.description || item.content || item.text_content || "";

        // Try to determine a note type based on content or list/folder name
        const listName =
          typeof item.list === "object" ? item.list?.name : item.list;
        const folderName =
          typeof item.folder === "object" ? item.folder?.name : item.folder;
        const context = [listName, folderName].filter(Boolean).join(" > ");

        const fullContent = context
          ? `> Imported from ClickUp: ${context}\n\n${content}`
          : content
            ? content
            : `> Imported from ClickUp`;

        return {
          title,
          content: fullContent,
          noteType: "general" as const,
          domain: "mlc",
          importedFrom: "clickup",
          importedAt: now,
        };
      });
  } catch {
    return [];
  }
}

function parseCsvExport(text: string) {
  const now = new Date();
  const rows = parseCsv(text);

  if (rows.length === 0) return [];

  return rows
    .filter((row) => {
      const title =
        row["Task Name"] || row["name"] || row["Name"] || row["title"] || row["Title"];
      return title && title.trim();
    })
    .map((row) => {
      const title = (
        row["Task Name"] ||
        row["name"] ||
        row["Name"] ||
        row["title"] ||
        row["Title"] ||
        "Untitled"
      ).trim();

      const description =
        row["Task Content"] ||
        row["description"] ||
        row["Description"] ||
        row["content"] ||
        row["Content"] ||
        "";

      const listName = row["List Name"] || row["list"] || row["List"] || "";
      const folderName = row["Folder Name"] || row["folder"] || row["Folder"] || "";
      const context = [listName, folderName].filter(Boolean).join(" > ");

      const fullContent = context
        ? `> Imported from ClickUp: ${context}\n\n${description}`
        : description
          ? description
          : `> Imported from ClickUp`;

      return {
        title,
        content: fullContent,
        noteType: "general" as const,
        domain: "mlc",
        importedFrom: "clickup",
        importedAt: now,
      };
    });
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: CsvRow = {};
    headers.forEach((h, j) => {
      row[h] = values[j] || "";
    });
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
