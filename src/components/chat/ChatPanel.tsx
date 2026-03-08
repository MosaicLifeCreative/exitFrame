"use client";

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";

function MarkdownContent({ content }: { content: string }) {
  // Lightweight markdown: bold, italic, code blocks, inline code, headers, lists
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
            const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={i} className="bg-muted rounded-md p-3 my-2 overflow-x-auto text-xs font-mono">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="font-semibold text-sm mt-3 mb-1">{formatInline(line.slice(4))}</h4>);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="font-semibold mt-3 mb-1">{formatInline(line.slice(3))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="font-bold mt-3 mb-1">{formatInline(line.slice(2))}</h2>);
      i++;
      continue;
    }

    // List items
    if (line.match(/^[-*]\s/)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-muted-foreground shrink-0">•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
      i++;
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-muted-foreground shrink-0">{num}.</span>
          <span>{formatInline(text)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i}>{formatInline(line)}</p>);
    i++;
  }

  return <div className="text-sm leading-relaxed space-y-0.5">{elements}</div>;
}

function formatInline(text: string): React.ReactNode {
  // Process inline code, bold, italic
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(processEmphasis(codeMatch[1], key++));
      parts.push(
        <code key={key++} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
      continue;
    }

    // No more inline code, process emphasis on the rest
    parts.push(processEmphasis(remaining, key++));
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function processEmphasis(text: string, key: number): React.ReactNode {
  // Bold
  const boldParts = text.split(/\*\*(.*?)\*\*/g);
  if (boldParts.length > 1) {
    return (
      <span key={key}>
        {boldParts.map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i}>{part}</strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  }

  return <span key={key}>{text}</span>;
}

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
};

function formatToolName(name: string): string {
  return TOOL_LABELS[name] || name.replace(/_/g, " ");
}

export default function ChatPanel() {
  const {
    isOpen,
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
  } = useChatStore();

  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessageCountRef = useRef(0);

  // Close chat when route changes
  useEffect(() => {
    if (prevPathnameRef.current !== pathname && isOpen) {
      closeChat();
    }
    prevPathnameRef.current = pathname;
  }, [pathname, isOpen, closeChat]);

  // Auto-scroll to bottom on initial load and new messages (not when loading older via scroll-up)
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

    // Scroll to bottom on: initial load (prev=0), or new messages at end (small delta, not from loadMore)
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
          // Maintain scroll position after prepending older messages
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
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={closeChat}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-background border-l border-border z-50 flex flex-col transition-transform duration-300 ease-in-out",
          "w-full sm:w-[440px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Ayden</span>
            {pageContext && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {pageContext.page}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
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
            <Button
              size="sm"
              variant="ghost"
              onClick={closeChat}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Hey, I&apos;m Ayden
              </h3>
              <p className="text-xs text-muted-foreground/60 max-w-[280px]">
                I have context about the page you&apos;re viewing. Ask about your data, get analysis, or brainstorm ideas.
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
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
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
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 shrink-0">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Ayden..."
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="h-[44px] w-[44px] shrink-0 p-0"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
            Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
