import { create } from "zustand";

interface ToolUseStatus {
  name: string;
  status: "executing" | "done";
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolUses?: ToolUseStatus[];
}

interface PageContext {
  page: string;
  data?: string;
}

interface WorkoutDraftExercise {
  exerciseId: string;
  exerciseName: string;
  notes: string;
  sets: Array<{
    setNumber: number;
    weight: string;
    reps: string;
    rpe: string;
    setType: string;
  }>;
}

interface WorkoutDraft {
  name: string;
  notes: string;
  exercises: WorkoutDraftExercise[];
}

interface ChatStore {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoadingHistory: boolean;
  pageContext: PageContext | null;
  conversationId: string | null;
  toolExecutedFlag: number;
  workoutDraft: WorkoutDraft | null;

  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  setPageContext: (ctx: PageContext | null) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  loadConversation: (context: string) => Promise<void>;
  clearWorkoutDraft: () => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useChatStore = create<ChatStore>((set, get) => ({
  isOpen: false,
  messages: [],
  isStreaming: false,
  isLoadingHistory: false,
  pageContext: null,
  conversationId: null,
  toolExecutedFlag: 0,
  workoutDraft: null,

  toggleChat: () => {
    const { isOpen, pageContext } = get();
    if (!isOpen && pageContext) {
      // Load history when opening
      get().loadConversation(pageContext.page);
    }
    set((s) => ({ isOpen: !s.isOpen }));
  },
  openChat: () => {
    const { pageContext } = get();
    if (pageContext) {
      get().loadConversation(pageContext.page);
    }
    set({ isOpen: true });
  },
  closeChat: () => set({ isOpen: false }),
  setPageContext: (ctx) => set({ pageContext: ctx }),
  clearWorkoutDraft: () => set({ workoutDraft: null }),

  loadConversation: async (context: string) => {
    set({ isLoadingHistory: true });
    try {
      const res = await fetch(`/api/chat/conversations?context=${encodeURIComponent(context)}`);
      if (!res.ok) return;
      const json = await res.json();
      const conversation = json.data;

      if (conversation && conversation.messages?.length > 0) {
        const messages: ChatMessage[] = conversation.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        set({ messages, conversationId: conversation.id });
      } else {
        set({ messages: [], conversationId: null });
      }
    } catch {
      // Failed to load — start fresh
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  clearMessages: async () => {
    const { pageContext } = get();
    const context = pageContext?.page || "General";

    // Archive in DB
    try {
      await fetch(`/api/chat/conversations?context=${encodeURIComponent(context)}`, {
        method: "DELETE",
      });
    } catch {
      // Best-effort archive
    }

    set({ messages: [], conversationId: null });
  },

  sendMessage: async (content: string) => {
    const { messages, pageContext } = get();
    const context = pageContext?.page || "General";

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    set({
      messages: [...messages, userMsg, assistantMsg],
      isStreaming: true,
    });

    let toolsWereUsed = false;

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          context: pageContext,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `Error: ${err.error || "Failed to get response"}` }
              : m
          ),
          isStreaming: false,
        }));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        set({ isStreaming: false });
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split("\n");
        // Keep the last element — it may be an incomplete line
        sseBuffer = parts.pop() || "";

        for (const line of parts) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: accumulated } : m
                  ),
                }));
              }
              if (parsed.toolUse) {
                toolsWereUsed = true;
                const tool = parsed.toolUse as ToolUseStatus;
                set((s) => ({
                  messages: s.messages.map((m) => {
                    if (m.id !== assistantMsg.id) return m;
                    const existing = m.toolUses || [];
                    if (tool.status === "done") {
                      return {
                        ...m,
                        toolUses: existing.map((t) =>
                          t.name === tool.name ? { ...t, status: "done" as const } : t
                        ),
                      };
                    }
                    return {
                      ...m,
                      toolUses: [...existing, tool],
                    };
                  }),
                }));
              }
              if (parsed.workoutDraft) {
                set({ workoutDraft: parsed.workoutDraft as WorkoutDraft });
              }
              if (parsed.error) {
                accumulated += `\n\nError: ${parsed.error}`;
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: accumulated } : m
                  ),
                }));
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }

      // Persist completed exchange to DB
      if (accumulated) {
        try {
          await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              context,
              userMessage: content,
              assistantMessage: accumulated,
            }),
          });
        } catch {
          // Best-effort persist
        }
      }
    } catch {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: "Failed to connect to chat service." }
            : m
        ),
      }));
    } finally {
      // Increment flag if any tools were executed — triggers page data refresh
      set((s) => ({
        isStreaming: false,
        toolExecutedFlag: toolsWereUsed ? s.toolExecutedFlag + 1 : s.toolExecutedFlag,
      }));
    }
  },
}));
