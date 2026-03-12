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
  sessionId?: string;
  exercises: WorkoutDraftExercise[];
}

// ─── Pathname → Page Context ────────────────────────────

const PAGE_CONTEXT_MAP: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/health": "Health",
  "/dashboard/health/fitness": "Fitness",
  "/dashboard/health/sleep": "Sleep",
  "/dashboard/health/supplements": "Supplements",
  "/dashboard/health/bloodwork": "Bloodwork",
  "/dashboard/health/family": "Family History",
  "/dashboard/investing": "Investing",
  "/dashboard/goals": "Goals",
  "/dashboard/tasks": "Tasks",
  "/dashboard/travel": "Travel",
  "/dashboard/chat": "General",
  "/dashboard/settings": "Settings",
  "/dashboard/ayden/journal": "Ayden Journal",
};

export function getPageFromPathname(pathname: string): string {
  // Exact match first
  if (PAGE_CONTEXT_MAP[pathname]) return PAGE_CONTEXT_MAP[pathname];

  // Check parent paths (for detail pages like /dashboard/travel/[id])
  const segments = pathname.split("/");
  while (segments.length > 2) {
    segments.pop();
    const parent = segments.join("/");
    if (PAGE_CONTEXT_MAP[parent]) return PAGE_CONTEXT_MAP[parent];
  }

  return "General";
}

// ─── Store ──────────────────────────────────────────────

interface ChatStore {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoadingHistory: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  pageContext: PageContext | null;
  conversationId: string | null;
  conversationSummary: string | null;
  toolExecutedFlag: number;
  workoutDraft: WorkoutDraft | null;
  unreadCount: number;
  lastSeenAt: number; // timestamp ms

  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  setPageContext: (ctx: PageContext | null) => void;
  updatePageFromPathname: (pathname: string) => void;
  sendMessage: (content: string, images?: Array<{ base64: string; mediaType: string }>) => Promise<void>;
  clearMessages: () => void;
  loadConversation: (context: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  clearWorkoutDraft: () => void;
  setUnreadCount: (count: number) => void;
  markAsRead: () => void;
  checkUnread: () => Promise<void>;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Strip *stage directions* from Ayden's responses without catching legitimate markdown italics.
 *  Stage directions are action/gesture phrases like *smiles warmly*, *leaning forward*, *eyes lighting up*.
 *  Legitimate italics like *HRV*, *really*, *this* should be preserved.
 *  Strategy: target patterns that start with common stage direction verbs/gerunds. */
function stripStageDirections(text: string): string {
  // Match *...*  where content starts with a lowercase word that looks like a stage direction
  // Gerunds: *leaning forward*, *settling back*, *smiling softly*
  // Verbs: *pauses*, *sighs*, *grins*, *nods*
  // Descriptive: *eyes lighting up*, *voice getting softer*, *a bit sheepish*
  return text
    .replace(/\*(?:(?:a |the )?(?:eyes?|voice|head|hands?|fingers?|face|lips?|gaze|expression|tone|brow|shoulders?|breath|heart|body)\b[^*\n]{1,70})\*/gi, "")
    .replace(/\*(?:[a-z]+ing\b[^*\n]{0,70})\*/g, "")
    .replace(/\*(?:(?:pauses?|sighs?|grins?|nods?|smiles?|laughs?|chuckles?|winks?|blinks?|gasps?|blushes?|shrugs?|fidgets?|hesitates?|beams?|glances?|softens?|brightens?|stiffens?|relaxes?|tenses?|snorts?|scoffs?|gulps?|swallows?|shivers?|trembles?|squirms?|frowns?|pouts?|squeals?|sniffles?|whispers?|murmurs?)\b[^*\n]{0,70})\*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Persist lastSeenAt in localStorage
function getLastSeenAt(): number {
  if (typeof window === "undefined") return Date.now();
  const stored = localStorage.getItem("ayden-last-seen");
  return stored ? parseInt(stored, 10) : Date.now();
}

function saveLastSeenAt(ts: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("ayden-last-seen", String(ts));
}

export const useChatStore = create<ChatStore>((set, get) => ({
  isOpen: false,
  messages: [],
  isStreaming: false,
  isLoadingHistory: false,
  isLoadingMore: false,
  hasMoreMessages: false,
  pageContext: null,
  conversationId: null,
  conversationSummary: null,
  toolExecutedFlag: 0,
  workoutDraft: null,
  unreadCount: 0,
  lastSeenAt: getLastSeenAt(),

  toggleChat: () => {
    const { isOpen } = get();
    if (!isOpen) {
      // Opening — load conversation history
      get().loadConversation("General");
      get().markAsRead();
    }
    set((s) => ({ isOpen: !s.isOpen }));
  },
  openChat: () => {
    get().loadConversation("General");
    get().markAsRead();
    set({ isOpen: true });
  },
  closeChat: () => set({ isOpen: false }),
  setPageContext: (ctx) => set({ pageContext: ctx }),

  updatePageFromPathname: (pathname: string) => {
    const page = getPageFromPathname(pathname);
    const current = get().pageContext;
    // Only update the page name; preserve any page-specific data
    if (current?.page !== page) {
      set({ pageContext: { page, data: current?.data } });
    }
  },

  clearWorkoutDraft: () => set({ workoutDraft: null }),

  setUnreadCount: (count: number) => set({ unreadCount: count }),

  markAsRead: () => {
    const now = Date.now();
    saveLastSeenAt(now);
    set({ unreadCount: 0, lastSeenAt: now });
  },

  checkUnread: async () => {
    const { lastSeenAt, isOpen, isStreaming } = get();
    // Don't check while chat is open (user is reading) or while streaming
    if (isOpen || isStreaming) return;

    try {
      const res = await fetch(`/api/chat/unread?since=${lastSeenAt}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.count > 0) {
        set({ unreadCount: json.data.count });
      }
    } catch {
      // Silent fail
    }
  },

  loadConversation: async (context: string) => {
    set({ isLoadingHistory: true });
    try {
      const res = await fetch(`/api/chat/conversations?context=${encodeURIComponent(context)}&limit=50`);
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
        set({
          messages,
          conversationId: conversation.id,
          conversationSummary: conversation.summary || null,
          hasMoreMessages: conversation.hasMore || false,
        });
      } else {
        set({ messages: [], conversationId: null, conversationSummary: null, hasMoreMessages: false });
      }
    } catch {
      // Failed to load — start fresh
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  loadMoreMessages: async () => {
    const { messages, conversationId, isLoadingMore } = get();
    if (!conversationId || isLoadingMore || messages.length === 0) return;

    const oldestId = messages[0].id;
    set({ isLoadingMore: true });
    try {
      const res = await fetch(
        `/api/chat/conversations?context=General&limit=50&before=${oldestId}`
      );
      if (!res.ok) return;
      const json = await res.json();
      const conversation = json.data;

      if (conversation && conversation.messages?.length > 0) {
        const olderMessages: ChatMessage[] = conversation.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        set((s) => ({
          messages: [...olderMessages, ...s.messages],
          hasMoreMessages: conversation.hasMore || false,
        }));
      } else {
        set({ hasMoreMessages: false });
      }
    } catch {
      // Failed to load more
    } finally {
      set({ isLoadingMore: false });
    }
  },

  clearMessages: async () => {
    // Archive in DB
    try {
      await fetch(`/api/chat/conversations?context=General`, {
        method: "DELETE",
      });
    } catch {
      // Best-effort archive
    }

    set({ messages: [], conversationId: null, conversationSummary: null, hasMoreMessages: false });
  },

  sendMessage: async (content: string, images?: Array<{ base64: string; mediaType: string }>) => {
    const { messages, pageContext, conversationSummary } = get();

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
          ...(conversationSummary ? { conversationSummary } : {}),
          ...(images && images.length > 0 ? { images } : {}),
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

      // Strip stage directions from final response before display and DB save
      if (accumulated) {
        const cleaned = stripStageDirections(accumulated);
        if (cleaned !== accumulated) {
          accumulated = cleaned;
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: cleaned } : m
            ),
          }));
        }
      }

      // Persist completed exchange to DB
      if (accumulated) {
        try {
          await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              context: "General",
              userMessage: content,
              assistantMessage: accumulated,
            }),
          });
        } catch {
          // Best-effort persist
        }

        // Update lastSeenAt since we just had a conversation
        get().markAsRead();
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
