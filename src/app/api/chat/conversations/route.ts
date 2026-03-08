import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // Load the active conversation with all messages
    const conversation = await prisma.chatConversation.findFirst({
      where: { context, isActive: true },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({ data: conversation });
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
    const { context, userMessage, assistantMessage } = body as {
      context: string;
      userMessage: string;
      assistantMessage: string;
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

    // Save both messages
    await prisma.chatMessage.createMany({
      data: [
        { conversationId: conversation.id, role: "user", content: userMessage },
        { conversationId: conversation.id, role: "assistant", content: assistantMessage },
      ],
    });

    // Touch updatedAt
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

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
