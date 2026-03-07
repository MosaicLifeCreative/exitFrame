"use client";

import { useEffect } from "react";
import { useChatStore } from "@/lib/chat-store";

/**
 * Hook for pages to register their context with the chat panel.
 * When the user chats, this context is sent along so Claude knows
 * what the user is looking at.
 *
 * Usage:
 *   useChatContext("Investing", `Portfolio: ${holdings.length} holdings\nWatchlist: ...`);
 */
export function useChatContext(page: string, data?: string) {
  const setPageContext = useChatStore((s) => s.setPageContext);

  useEffect(() => {
    setPageContext({ page, data });
    return () => setPageContext(null);
  }, [page, data, setPageContext]);
}
