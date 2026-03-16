"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, Search, Menu, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AydenHeartbeat from "./AydenHeartbeat";

// Map pathnames to display titles
function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "Dashboard";

  let last = segments[segments.length - 1];

  // If the last segment is a UUID (detail page), show the parent section name instead
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(last)) {
    last = segments.length > 2 ? segments[segments.length - 2] : "Dashboard";
  }

  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Header({
  onCommandPalette,
  onMenuToggle,
}: {
  onCommandPalette: () => void;
  onMenuToggle: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [bgTask, setBgTask] = useState<{ id: string; description: string; status: string; rounds: number } | null>(null);
  const [bgTaskDone, setBgTaskDone] = useState<string | null>(null); // description of completed task

  useEffect(() => setMounted(true), []);

  // Poll for active background tasks
  const pollBgTask = useCallback(async () => {
    try {
      const res = await fetch("/api/background-tasks?status=active");
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.[0]) {
        const task = json.data[0];
        setBgTask({ id: task.id, description: task.description, status: task.status, rounds: task.rounds });
        setBgTaskDone(null);
      } else if (bgTask) {
        // Task was running but is no longer active — it finished
        setBgTaskDone(bgTask.description);
        setBgTask(null);
        // Auto-dismiss after 8s
        setTimeout(() => setBgTaskDone(null), 8000);
      }
    } catch { /* silent */ }
  }, [bgTask]);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Initial check
    pollBgTask();
    // Poll every 10s
    pollIntervalRef.current = setInterval(pollBgTask, 10_000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [pollBgTask]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onCommandPalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCommandPalette]);

  return (
    <>
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
      {/* Left: Menu button (mobile) + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-md border border-input
            hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Ayden's heartbeat */}
        <AydenHeartbeat />

        <div className="h-5 w-px bg-border" />

        {/* Command palette trigger */}
        <button
          onClick={onCommandPalette}
          className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground
            hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 flex items-center justify-center rounded-md border border-input
              hover:bg-accent hover:text-accent-foreground transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="h-9 w-9 flex items-center justify-center rounded-md border border-input
            hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>

    {/* Background task alert bar */}
    {bgTask && (
      <div className="h-8 bg-primary/10 border-b border-primary/20 flex items-center justify-center gap-2 px-4 text-xs text-primary">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="truncate max-w-md">Ayden is working: {bgTask.description}</span>
        {bgTask.rounds > 0 && (
          <span className="text-primary/60">({bgTask.rounds} rounds)</span>
        )}
      </div>
    )}
    {bgTaskDone && !bgTask && (
      <div className="h-8 bg-green-500/10 border-b border-green-500/20 flex items-center justify-center gap-2 px-4 text-xs text-green-600 dark:text-green-400">
        <span className="truncate max-w-md">Ayden finished: {bgTaskDone}</span>
      </div>
    )}
    </>
  );
}
