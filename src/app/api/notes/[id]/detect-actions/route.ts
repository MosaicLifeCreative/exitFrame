import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const SYSTEM_PROMPT = `You are analyzing meeting notes for a small WordPress agency called Mosaic Life Creative.
The owner (Trey) takes notes during client meetings and internal planning sessions.

Analyze the following meeting notes and identify any actionable items. For each action item, return:
- detected_text: the exact excerpt from the notes that indicates an action
- suggested_action_type: one of "create_task", "add_to_content_calendar", "schedule_email", "create_reminder", "other"
- suggested_action_data: structured JSON with details (title, due date if mentioned, priority, assigned client if applicable)

Only identify clear, concrete action items. Do not flag general discussion points.

Return a JSON array of actions. If no actions found, return empty array.
IMPORTANT: Return ONLY the JSON array, no markdown formatting, no code blocks.`;

interface DetectedAction {
  detected_text: string;
  suggested_action_type: string;
  suggested_action_data: Record<string, unknown>;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const note = await prisma.note.findUnique({
      where: { id: params.id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${SYSTEM_PROMPT}\n\nMeeting Notes:\n---\n${note.content}\n---`,
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    let actions: DetectedAction[] = [];
    try {
      // Strip markdown code blocks if present
      const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      actions = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(actions)) {
      actions = [];
    }

    // Delete existing pending actions for this note
    await prisma.noteAction.deleteMany({
      where: { noteId: note.id, status: "pending" },
    });

    // Create new actions
    const created = await Promise.all(
      actions.map((action) =>
        prisma.noteAction.create({
          data: {
            noteId: note.id,
            clientId: note.domainRefId,
            detectedText: action.detected_text,
            suggestedActionType: action.suggested_action_type,
            suggestedActionData: action.suggested_action_data as object,
          },
        })
      )
    );

    // Update note's pending actions flag
    await prisma.note.update({
      where: { id: note.id },
      data: { hasPendingActions: created.length > 0 },
    });

    return NextResponse.json({ data: created });
  } catch (error) {
    console.error("Failed to detect actions:", error);
    return NextResponse.json({ error: "Failed to detect actions" }, { status: 500 });
  }
}
