"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/chat-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  Send,
  Trash2,
  Loader2,
  Sparkles,
  User,
  Wrench,
  Check,
  MessageCircle,
  Maximize2,
  Minimize2,
  Heart,
  Smile,
} from "lucide-react";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import {
  playNotificationSound,
  showBrowserNotification,
  requestNotificationPermission,
  setFaviconBadge,
  flashTitle,
  stopFlashTitle,
} from "@/lib/notifications";
import dynamic from "next/dynamic";
import emojiData from "@emoji-mart/data";

const EmojiPicker = dynamic(() => import("@emoji-mart/react").then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>,
});

const TOOL_LABELS: Record<string, string> = {
  list_exercises: "Searching exercises",
  get_recent_workouts: "Reviewing workout history",
  create_exercise: "Adding exercise",
  create_workout: "Creating workout",
  get_recent_cardio: "Checking cardio history",
  create_swim_workout: "Creating swim workout",
  log_symptoms: "Logging symptoms",
  get_symptom_history: "Checking symptom history",
  resolve_symptoms: "Resolving symptoms",
  add_supplement: "Adding supplement",
  list_supplements: "Checking supplements",
  update_supplement: "Updating supplement",
  add_bloodwork_panel: "Adding bloodwork",
  get_bloodwork_panels: "Checking bloodwork",
  get_bloodwork_trends: "Analyzing trends",
  add_family_member: "Adding family member",
  get_family_history: "Checking family history",
  list_goals: "Reviewing goals",
  create_goal: "Creating goal",
  update_goal: "Updating goal",
  log_goal_progress: "Logging progress",
  toggle_milestone: "Updating milestone",
  add_milestone: "Adding milestone",
  get_oura_data: "Checking Oura data",
  web_search: "Searching the web",
  fetch_url: "Reading webpage",
  get_weather: "Checking weather",
  get_trip_details: "Loading trip details",
  add_flight: "Adding flight",
  add_lodging: "Adding lodging",
  add_itinerary_items: "Building itinerary",
  add_packing_items: "Building packing list",
  add_expense: "Tracking expense",
  add_journal_entry: "Writing journal entry",
  get_journal_entries: "Reading journal",
};

function formatToolName(name: string): string {
  return TOOL_LABELS[name] || name.replace(/_/g, " ");
}

// ─── Timestamp formatting ───────────────────────────────

function formatMessageTime(date: Date): string {
  // Facebook Messenger style: "Mar 12, 2026, 10:14 AM"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + ", " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Show a timestamp between messages when sender changes or 5+ min gap
function shouldShowTimestamp(prev: { time: Date; role: string } | null, current: { time: Date; role: string }): boolean {
  if (!prev) return true;
  // Always show when role changes (like Messenger)
  if (prev.role !== current.role) return true;
  // Show if 5+ minutes between same-sender messages
  return current.time.getTime() - prev.time.getTime() > 5 * 60 * 1000;
}

// ─── Heartbeat hook ─────────────────────────────────────

interface HeartRateData {
  bpm: number;
  state: "resting" | "calm" | "elevated" | "racing";
  emotion: string | null;
  thought: string | null;
  thoughtAt: string | null;
}

function useHeartbeat() {
  const [hr, setHr] = useState<HeartRateData | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchHR = async () => {
      try {
        const res = await fetch("/api/ayden/heartrate");
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data) setHr(json.data);
        }
      } catch {
        // Silent
      }
    };
    fetchHR();
    const interval = setInterval(fetchHR, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return hr;
}

function formatThoughtAge(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Widget Component ───────────────────────────────────

export default function ChatWidget() {
  const {
    isOpen,
    toggleChat,
    closeChat,
    messages,
    isStreaming,
    isLoadingHistory,
    isLoadingMore,
    hasMoreMessages,
    sendMessage,
    clearMessages,
    loadMoreMessages,
    pageContext,
    updatePageFromPathname,
    unreadCount,
    markAsRead,
    checkUnread,
  } = useChatStore();

  const pathname = usePathname();
  const hr = useHeartbeat();

  const [input, setInput] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [showHeartPopup, setShowHeartPopup] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [notifRequested, setNotifRequested] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const prevUnreadRef = useRef(0);

  // Auto-update page context when route changes
  useEffect(() => {
    updatePageFromPathname(pathname);
  }, [pathname, updatePageFromPathname]);

  // Close heart popup on outside click
  useEffect(() => {
    if (!showHeartPopup) return;
    const handleClick = () => setShowHeartPopup(false);
    const timer = setTimeout(() => document.addEventListener("click", handleClick), 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [showHeartPopup]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [showEmojiPicker]);

  // Poll for unread messages every 30 seconds
  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 30_000);
    return () => clearInterval(interval);
  }, [checkUnread]);

  // Handle unread count changes — trigger notifications
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && unreadCount > 0) {
      playNotificationSound();
      setFaviconBadge(unreadCount);

      if (document.hidden) {
        flashTitle("Ayden sent a message");
        showBrowserNotification("Ayden", "New message waiting for you", () => {
          toggleChat();
        });
      }
    }

    if (unreadCount === 0) {
      setFaviconBadge(0);
      stopFlashTitle();
    }

    prevUnreadRef.current = unreadCount;
  }, [unreadCount, toggleChat]);

  // Clear notifications when tab gains focus while chat is open
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen) {
        markAsRead();
        stopFlashTitle();
        setFaviconBadge(0);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isOpen, markAsRead]);

  // Auto-scroll to bottom on new messages (not when loading older via scroll-up)
  const isLoadingMoreRef = useRef(false);
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  useEffect(() => {
    if (messages.length === 0) {
      prevMessageCountRef.current = 0;
      return;
    }
    const wasLoadingMore = isLoadingMoreRef.current;
    const prevCount = prevMessageCountRef.current;
    if (prevCount === 0 || (!wasLoadingMore && messages.length - prevCount <= 2)) {
      messagesEndRef.current?.scrollIntoView({ behavior: prevCount === 0 ? "instant" : "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Load more messages on scroll to top
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
        const prevHeight = container.scrollHeight;
        loadMoreMessages().then(() => {
          requestAnimationFrame(() => {
            const newHeight = container.scrollHeight;
            container.scrollTop = newHeight - prevHeight;
          });
        });
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    setShowEmojiPicker(false);
    sendMessage(trimmed);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <>
      {/* ─── Floating Bubble ─────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => {
            // Request notification permission on first user gesture (Firefox requires this)
            if (!notifRequested) {
              requestNotificationPermission();
              setNotifRequested(true);
            }
            toggleChat();
          }}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "h-14 w-14 rounded-full",
            "bg-primary text-primary-foreground",
            "shadow-lg shadow-primary/25",
            "flex items-center justify-center",
            "hover:scale-105 active:scale-95",
            "transition-all duration-200",
          )}
          title="Chat with Ayden"
        >
          <MessageCircle className="h-6 w-6" />

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-in zoom-in-50 duration-200">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ─── Chat Window ─────────────────────────────────── */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          isMaximized
            ? "bottom-6 right-6 left-6 sm:left-auto sm:w-[700px]"
            : "bottom-6 right-6 w-[400px] max-w-[calc(100vw-48px)]",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
        style={{ height: isMaximized ? "calc(100vh - 120px)" : "min(600px, calc(100vh - 120px))" }}
      >
        <div className="h-full flex flex-col bg-background rounded-2xl border border-border shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-sm">
            <div className="relative flex items-center gap-2">
              {/* Heart with hover popup */}
              {hr ? (
                <>
                  <div
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHeartPopup((s) => !s);
                    }}
                    style={{
                      animation: `widget-heartbeat ${60 / hr.bpm}s ease-in-out infinite`,
                    }}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 fill-current transition-colors duration-1000",
                        hr.state === "racing" ? "text-red-500"
                          : hr.state === "elevated" ? "text-red-400"
                          : hr.state === "calm" ? "text-red-400/70"
                          : "text-red-400/50"
                      )}
                    />
                  </div>
                  {/* Heart popup — outside animated div so it doesn't bounce */}
                  {showHeartPopup && (
                    <div
                      className="absolute top-full left-0 mt-1 px-3 py-2 rounded-lg bg-popover border border-border shadow-lg text-xs text-popover-foreground z-[60] w-[220px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{hr.bpm} BPM</span>
                        <span className="text-muted-foreground capitalize">{hr.state}</span>
                      </div>
                      {hr.emotion && (
                        <p className="text-muted-foreground italic mb-1">Feeling {hr.emotion}</p>
                      )}
                      {hr.thought && (
                        <>
                          <div className="border-t border-border my-1.5" />
                          <p className="italic leading-relaxed">&ldquo;{hr.thought}&rdquo;</p>
                          {hr.thoughtAt && (
                            <p className="text-muted-foreground mt-1 text-[10px]">
                              {formatThoughtAge(hr.thoughtAt)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              <span className="font-semibold text-sm">Ayden</span>
              {pageContext && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {pageContext.page}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {messages.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearMessages}
                  title="Clear conversation"
                  className="h-7 w-7 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMaximized((s) => !s)}
                title={isMaximized ? "Restore size" : "Maximize"}
                className="h-7 w-7 p-0"
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={closeChat}
                title="Close"
                className="h-7 w-7 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {isLoadingMore && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground ml-2">Loading older messages...</span>
              </div>
            )}

            {isLoadingHistory && messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoadingHistory && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Hey, I&apos;m Ayden
                </p>
                <p className="text-xs text-muted-foreground/60 max-w-[260px]">
                  I can see what page you&apos;re on and help with anything. Ask me about your data, get analysis, or just talk.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showTime = shouldShowTimestamp(
                prevMsg ? { time: prevMsg.timestamp, role: prevMsg.role } : null,
                { time: msg.timestamp, role: msg.role }
              );

              return (
                <div key={msg.id}>
                  {/* Timestamp separator */}
                  {showTime && (
                    <div className="flex justify-center py-2">
                      <span className="text-[10px] text-muted-foreground/50">
                        {formatMessageTime(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex gap-2 py-1",
                      msg.role === "user" && "flex-row-reverse"
                    )}
                  >
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {msg.role === "user" ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex-1 min-w-0 rounded-lg px-3 py-2",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground text-sm"
                          : "bg-muted"
                      )}
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <>
                          {msg.toolUses && msg.toolUses.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {msg.toolUses.map((tool, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                                >
                                  {tool.status === "executing" ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3 text-green-500" />
                                  )}
                                  <Wrench className="h-3 w-3" />
                                  <span>{formatToolName(tool.name)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.content ? (
                            <MarkdownContent content={msg.content} />
                          ) : null}
                          {isStreaming && msg.id === messages[messages.length - 1]?.id && (
                            <div className={cn("flex items-center gap-2 py-1", msg.content && "mt-2 border-t border-border/50 pt-2")}>
                              <div className="flex gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {msg.toolUses?.some((t) => t.status === "executing")
                                  ? "Working..."
                                  : msg.content
                                    ? "Composing..."
                                    : "Thinking..."}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="border-t border-border [&>em-emoji-picker]:w-full [&>em-emoji-picker]:max-w-none [&>em-emoji-picker]:border-0 [&>em-emoji-picker]:rounded-none">
              <EmojiPicker
                data={emojiData}
                theme="dark"
                skinTonePosition="none"
                previewPosition="none"
                maxFrequentRows={1}
                perLine={9}
                onEmojiSelect={(emoji: { native: string }) => {
                  setInput((prev) => prev + emoji.native);
                  textareaRef.current?.focus();
                }}
              />
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3 shrink-0">
            <div className="flex gap-2 items-end">
              <button
                onClick={() => setShowEmojiPicker((s) => !s)}
                className={cn(
                  "h-[40px] w-[40px] shrink-0 flex items-center justify-center rounded-md transition-colors",
                  showEmojiPicker
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Emoji"
                type="button"
              >
                <Smile className="h-5 w-5" />
              </button>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Ayden..."
                className="min-h-[40px] max-h-[100px] resize-none text-sm"
                rows={1}
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="h-[40px] w-[40px] shrink-0 p-0"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Heartbeat keyframes */}
      <style jsx>{`
        @keyframes widget-heartbeat {
          0% { transform: scale(1); }
          15% { transform: scale(1.25); }
          30% { transform: scale(1); }
          45% { transform: scale(1.15); }
          60% { transform: scale(1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
