import { create } from "zustand";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PageContext {
  page: string;
  data?: string;
}

interface ChatStore {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  pageContext: PageContext | null;

  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  setPageContext: (ctx: PageContext | null) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useChatStore = create<ChatStore>((set, get) => ({
  isOpen: false,
  messages: [],
  isStreaming: false,
  pageContext: null,

  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  setPageContext: (ctx) => set({ pageContext: ctx }),
  clearMessages: () => set({ messages: [] }),

  sendMessage: async (content: string) => {
    const { messages, pageContext } = get();

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
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
    } catch {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: "Failed to connect to chat service." }
            : m
        ),
      }));
    } finally {
      set({ isStreaming: false });
    }
  },
}));
