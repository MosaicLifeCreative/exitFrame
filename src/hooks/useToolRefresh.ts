"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/chat-store";

/**
 * Hook that calls a callback whenever Claude executes a tool via chat.
 * Pages use this to auto-refresh their data after chat-based changes.
 *
 * Usage:
 *   useToolRefresh(fetchData);
 */
export function useToolRefresh(callback: () => void) {
  const toolExecutedFlag = useChatStore((s) => s.toolExecutedFlag);
  const prevFlag = useRef(toolExecutedFlag);

  useEffect(() => {
    if (toolExecutedFlag !== prevFlag.current) {
      prevFlag.current = toolExecutedFlag;
      callback();
    }
  }, [toolExecutedFlag, callback]);
}
