import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight endpoint for polling unread messages.
 * Returns count of assistant messages in the active "General" conversation
 * created after the given `since` timestamp.
 */
export async function GET(request: NextRequest) {
  const sinceParam = request.nextUrl.searchParams.get("since");
  if (!sinceParam) {
    return NextResponse.json({ data: { count: 0 } });
  }

  const sinceMs = parseInt(sinceParam, 10);
  if (isNaN(sinceMs)) {
    return NextResponse.json({ data: { count: 0 } });
  }

  const sinceDate = new Date(sinceMs);

  try {
    const conversation = await prisma.chatConversation.findFirst({
      where: { context: "General", isActive: true },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json({ data: { count: 0 } });
    }

    const count = await prisma.chatMessage.count({
      where: {
        conversationId: conversation.id,
        role: "assistant",
        createdAt: { gt: sinceDate },
      },
    });

    // If there are unread messages, fetch the latest one for preview
    let preview: string | null = null;
    if (count > 0) {
      const latest = await prisma.chatMessage.findFirst({
        where: {
          conversationId: conversation.id,
          role: "assistant",
          createdAt: { gt: sinceDate },
        },
        orderBy: { createdAt: "desc" },
        select: { content: true },
      });
      if (latest) {
        preview = latest.content.length > 120
          ? latest.content.slice(0, 120) + "..."
          : latest.content;
      }
    }

    return NextResponse.json({ data: { count, preview } });
  } catch (error) {
    console.error("Failed to check unread messages:", error);
    return NextResponse.json({ data: { count: 0 } });
  }
}
