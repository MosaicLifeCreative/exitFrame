import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const SUMMARIZE_THRESHOLD = 20; // Summarize when messages exceed this count

// GET: Load active conversation for a context (or list recent archived ones)
export async function GET(request: NextRequest) {
  const context = request.nextUrl.searchParams.get("context") || "General";
  const includeArchived = request.nextUrl.searchParams.get("archived") === "true";

  try {
    if (includeArchived) {
      // Return recent conversations for this context (for history browsing)
      const conversations = await prisma.chatConversation.findMany({
        where: { context },
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 1, // Just first message for preview
          },
        },
      });
      return NextResponse.json({ data: conversations });
    }

    // Load the active conversation with paginated messages (newest first, then reversed)
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const before = request.nextUrl.searchParams.get("before"); // cursor: message ID

    const conversation = await prisma.chatConversation.findFirst({
      where: { context, isActive: true },
    });

    if (!conversation) {
      return NextResponse.json({ data: null });
    }

    // Fetch messages: newest first, optionally before a cursor
    let cursorDate: Date | undefined;
    if (before) {
      const cursorMsg = await prisma.chatMessage.findUnique({ where: { id: before }, select: { createdAt: true } });
      cursorDate = cursorMsg?.createdAt;
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId: conversation.id,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Reverse to chronological order for display
    messages.reverse();

    // Count total messages for "has more" check
    const totalMessages = await prisma.chatMessage.count({
      where: { conversationId: conversation.id },
    });

    const oldestLoadedId = messages.length > 0 ? messages[0].id : null;
    const hasMore = before
      ? messages.length === limit
      : totalMessages > limit;

    return NextResponse.json({
      data: {
        ...conversation,
        messages,
        totalMessages,
        hasMore,
        oldestMessageId: oldestLoadedId,
      },
    });
  } catch (error) {
    console.error("Load conversation error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to load conversation: ${msg}` }, { status: 500 });
  }
}

// POST: Save a message pair (user + assistant) to the active conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, userMessage, assistantMessage, toolContext } = body as {
      context: string;
      userMessage: string;
      assistantMessage: string;
      toolContext?: string;
    };

    if (!context || !userMessage || !assistantMessage) {
      return NextResponse.json({ error: "context, userMessage, and assistantMessage required" }, { status: 400 });
    }

    // Find or create active conversation
    let conversation = await prisma.chatConversation.findFirst({
      where: { context, isActive: true },
    });

    if (!conversation) {
      // Create new conversation, title from first user message
      const title = userMessage.length > 80 ? userMessage.slice(0, 77) + "..." : userMessage;
      conversation = await prisma.chatConversation.create({
        data: { context, title },
      });
    }

    // Save both messages sequentially to guarantee ordering
    // (createMany can assign identical timestamps, causing non-deterministic order on reload)
    await prisma.chatMessage.create({
      data: { conversationId: conversation.id, role: "user", content: userMessage },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantMessage,
        ...(toolContext ? { toolContext } : {}),
      },
    });

    // Touch updatedAt
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Check if summarization is needed (fire-and-forget)
    const messageCount = await prisma.chatMessage.count({
      where: { conversationId: conversation.id },
    });

    if (messageCount > SUMMARIZE_THRESHOLD && messageCount - conversation.summarizedUpTo >= 10) {
      // Summarize in background — don't block the response
      summarizeConversation(conversation.id).catch((err) => {
        console.error("Background summarization failed:", err);
      });
    }

    return NextResponse.json({ data: { conversationId: conversation.id } });
  } catch (error) {
    console.error("Save message error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to save message: ${msg}` }, { status: 500 });
  }
}

// DELETE: Archive the active conversation (clear chat)
export async function DELETE(request: NextRequest) {
  const context = request.nextUrl.searchParams.get("context") || "General";

  try {
    const updated = await prisma.chatConversation.updateMany({
      where: { context, isActive: true },
      data: { isActive: false },
    });

    return NextResponse.json({ data: { archived: updated.count } });
  } catch (error) {
    console.error("Archive conversation error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to archive: ${msg}` }, { status: 500 });
  }
}

// Background summarization: condense older messages into a rolling summary
async function summarizeConversation(conversationId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation || conversation.messages.length <= SUMMARIZE_THRESHOLD) return;

  // Take messages that haven't been summarized yet, minus the recent window we want to keep
  const keepRecent = 20; // Keep last 20 messages unsummarized
  const messagesToSummarize = conversation.messages.slice(
    conversation.summarizedUpTo,
    conversation.messages.length - keepRecent
  );

  if (messagesToSummarize.length < 6) return; // Not enough new messages to bother

  // Build the summarization prompt
  const existingSummary = conversation.summary
    ? `Previous summary:\n${conversation.summary}\n\nNew messages to incorporate:\n`
    : "";

  const messageText = messagesToSummarize
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const anthropic = new Anthropic({ apiKey, maxRetries: 3 });
  const result = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Summarize this conversation concisely. Capture key topics discussed, decisions made, important facts shared, and any ongoing context the assistant needs to continue helpfully. Keep it under 500 words.

${existingSummary}${messageText}`,
      },
    ],
  });

  const summaryText = result.content[0].type === "text" ? result.content[0].text : "";

  if (summaryText) {
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        summary: summaryText,
        summarizedUpTo: conversation.messages.length - keepRecent,
      },
    });
  }
}
