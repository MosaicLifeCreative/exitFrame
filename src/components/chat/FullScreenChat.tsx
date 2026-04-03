"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/chat-store";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import PwaBottomNav from "@/components/layout/PwaBottomNav";
import {
  Send,
  Loader2,
  Sparkles,
  User,
  Wrench,
  Check,
  ImagePlus,
  X,
  Trash2,
  ArrowLeft,
  Bell,
  BellOff,
} from "lucide-react";
import Link from "next/link";
import AydenHeartbeat from "@/components/layout/AydenHeartbeat";

const TOOL_LABELS: Record<string, string> = {
  list_exercises: "Searching exercises",
  get_recent_workouts: "Reviewing workouts",
  create_exercise: "Adding exercise",
  create_workout: "Creating workout",
  get_recent_cardio: "Checking cardio",
  create_swim_workout: "Creating swim workout",
  log_symptoms: "Logging symptoms",
  get_symptom_history: "Checking symptoms",
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
  get_weather: "Checking weather",
  web_search: "Searching the web",
  fetch_url: "Reading page",
  save_memory: "Saving memory",
  update_emotional_state: "Processing emotions",
  start_background_task: "Starting background task",
};

function formatToolName(name: string): string {
  return TOOL_LABELS[name] || name.replace(/_/g, " ");
}

interface ImagePreview {
  file: File;
  dataUrl: string;
}

export default function FullScreenChat() {
  const {
    messages,
    isStreaming,
    isLoadingHistory,
    isLoadingMore,
    hasMoreMessages,
    sendMessage,
    clearMessages,
    loadMoreMessages,
    loadConversation,
    setPageContext,
    activeBackgroundTask,
    cancelBackgroundTask,
    pollBackgroundTask,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [pushState, setPushState] = useState<"unsupported" | "prompt" | "subscribed" | "denied">("unsupported");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  // Set context and load conversation on mount
  useEffect(() => {
    setPageContext({ page: "General" });
    loadConversation("General");
  }, [setPageContext, loadConversation]);

  // Reload messages when app regains focus (e.g. after tapping push notification)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isStreaming) {
        loadConversation("General");
        // Also check for active background tasks on refocus
        fetch("/api/background-tasks?status=active")
          .then((res) => res.json())
          .then((json) => {
            if (json.data?.[0]) {
              const task = json.data[0];
              useChatStore.setState({
                activeBackgroundTask: {
                  id: task.id,
                  description: task.description,
                  status: task.status,
                  rounds: task.rounds,
                },
              });
            }
          })
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadConversation, isStreaming]);

  // Poll background task status every 10s
  useEffect(() => {
    if (!activeBackgroundTask || !["pending", "running"].includes(activeBackgroundTask.status)) return;
    const interval = setInterval(pollBackgroundTask, 10_000);
    return () => clearInterval(interval);
  }, [activeBackgroundTask, pollBackgroundTask]);

  // Check for active background task on mount
  useEffect(() => {
    fetch("/api/background-tasks?status=active")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.[0]) {
          const task = json.data[0];
          useChatStore.setState({
            activeBackgroundTask: {
              id: task.id,
              description: task.description,
              status: task.status,
              rounds: task.rounds,
            },
          });
        }
      })
      .catch(() => {});
  }, []);

  // Check push notification status
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setPushState(sub ? "subscribed" : "prompt");
      });
    });
  }, []);

  const subscribeToPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      setPushState("subscribed");
    } catch (err) {
      console.error("Push subscription failed:", err);
      if (Notification.permission === "denied") setPushState("denied");
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushState("prompt");
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    }
  };

  // Track loading more state
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  // Auto-scroll to bottom on initial load and new messages
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

  // Load more on scroll to top
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

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && images.length === 0) || isStreaming) return;

    const currentImages = images;
    setInput("");
    setImages([]);

    if (currentImages.length > 0) {
      // Convert images to base64 and send with message
      const imageData: Array<{ base64: string; mediaType: string }> = [];
      for (const img of currentImages) {
        const buffer = await img.file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        imageData.push({ base64, mediaType: img.file.type });
      }
      sendMessage(trimmed || "[photo]", imageData);
    } else {
      sendMessage(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImagePreview[] = [];
    const maxImages = 4 - images.length; // Max 4 images total

    for (let i = 0; i < Math.min(files.length, maxImages); i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const dataUrl = URL.createObjectURL(file);
      newImages.push({ file, dataUrl });
    }

    setImages((prev) => [...prev, ...newImages]);
    // Reset file input so same file can be re-selected
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].dataUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 safe-top">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="pwa-hidden">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Ayden</span>
          </div>
          <div className="h-4 w-px bg-border mx-1" />
          <div className="max-w-[160px] overflow-visible">
            <AydenHeartbeat />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {pushState === "prompt" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={subscribeToPush}
              title="Enable notifications"
              className="h-8 w-8 p-0"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {pushState === "subscribed" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={unsubscribeFromPush}
              title="Disable notifications"
              className="h-8 w-8 p-0"
            >
              <BellOff className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {messages.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearMessages}
              title="Clear conversation"
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {/* Background task status bar */}
      {activeBackgroundTask && ["pending", "running"].includes(activeBackgroundTask.status) && (
        <div className="px-4 py-2 bg-indigo-950/50 border-b border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="truncate">Working in background: {activeBackgroundTask.description}</span>
            {activeBackgroundTask.rounds !== undefined && activeBackgroundTask.rounds > 0 && (
              <span className="text-xs text-indigo-400/60">({activeBackgroundTask.rounds} rounds)</span>
            )}
          </div>
          <button
            onClick={cancelBackgroundTask}
            className="text-xs text-indigo-400 hover:text-indigo-200 transition-colors shrink-0 ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {isLoadingMore && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground ml-2">Loading older messages...</span>
            </div>
          )}

          {isLoadingHistory && messages.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <Sparkles className="h-16 w-16 text-muted-foreground/20 mb-6" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Hey, I&apos;m Ayden
              </h3>
              <p className="text-sm text-muted-foreground/60 max-w-[320px]">
                Ask me anything. I can check your health data, manage workouts, track goals, search the web, and more.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  "flex-1 min-w-0 rounded-2xl px-4 py-2.5",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground max-w-[85%] ml-auto"
                    : "bg-muted max-w-[90%]"
                )}
              >
                {msg.role === "user" ? (
                  <div>
                    {msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {msg.imageUrls.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt={`Sent image ${i + 1}`}
                            className="max-w-[200px] max-h-[150px] rounded object-cover"
                          />
                        ))}
                      </div>
                    )}
                    {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                  </div>
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
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="border-t border-border px-4 py-2 shrink-0">
          <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <div key={i} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-0 right-0 bg-black/60 rounded-bl-lg p-0.5"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0 safe-bottom pwa-input-lift">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || images.length >= 4}
            className="h-10 w-10 shrink-0 p-0"
          >
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </Button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Ayden..."
            className={cn(
              "flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "min-h-[52px] max-h-[200px]"
            )}
            rows={2}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={(!input.trim() && images.length === 0) || isStreaming}
            className="h-10 w-10 shrink-0 p-0 rounded-full"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <PwaBottomNav />
    </div>
  );
}
