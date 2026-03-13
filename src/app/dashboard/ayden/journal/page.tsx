"use client";

import { useEffect, useState, useCallback } from "react";
import { Heart, Loader2, Moon, Brain, Zap } from "lucide-react";

interface Thought {
  id: string;
  thought: string;
  emotion: string | null;
  bpm: number | null;
  context: string | null;
  createdAt: string;
}

interface Dream {
  id: string;
  dream: string;
  emotion: string | null;
  moodInfluence: string | null;
  createdAt: string;
}

interface AgencyAction {
  id: string;
  actionType: string;
  summary: string;
  trigger: string | null;
  outcome: string | null;
  emotion: string | null;
  bpm: number | null;
  createdAt: string;
}

type Tab = "thoughts" | "dreams" | "agency";

function groupByDate<T extends { createdAt: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const dateKey = new Date(item.createdAt).toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(item);
  }
  return groups;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog Post",
  email: "Email",
  research: "Research",
  trade: "Trade",
  reflection: "Reflection",
  outreach: "Outreach",
  creative: "Creative",
  other: "Other",
};

export default function AydenJournalPage() {
  const [tab, setTab] = useState<Tab>("thoughts");

  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [thoughtsCursor, setThoughtsCursor] = useState<string | null>(null);

  const [dreams, setDreams] = useState<Dream[]>([]);
  const [dreamsCursor, setDreamsCursor] = useState<string | null>(null);

  const [actions, setActions] = useState<AgencyAction[]>([]);
  const [actionsCursor, setActionsCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchThoughts = useCallback(async (cursor?: string) => {
    const isMore = !!cursor;
    if (isMore) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/ayden/thoughts?${params}`);
      const json = await res.json();
      if (json.data) {
        setThoughts((prev) => isMore ? [...prev, ...json.data] : json.data);
        setThoughtsCursor(json.nextCursor || null);
      }
    } catch { /* ignore */ }
    if (isMore) setLoadingMore(false); else setLoading(false);
  }, []);

  const fetchDreams = useCallback(async (cursor?: string) => {
    const isMore = !!cursor;
    if (isMore) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/ayden/dreams?${params}`);
      const json = await res.json();
      if (json.data) {
        setDreams((prev) => isMore ? [...prev, ...json.data] : json.data);
        setDreamsCursor(json.nextCursor || null);
      }
    } catch { /* ignore */ }
    if (isMore) setLoadingMore(false); else setLoading(false);
  }, []);

  const fetchActions = useCallback(async (cursor?: string) => {
    const isMore = !!cursor;
    if (isMore) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/ayden/agency-actions?${params}`);
      const json = await res.json();
      if (json.data) {
        setActions((prev) => isMore ? [...prev, ...json.data] : json.data);
        setActionsCursor(json.nextCursor || null);
      }
    } catch { /* ignore */ }
    if (isMore) setLoadingMore(false); else setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "thoughts") fetchThoughts();
    else if (tab === "dreams") fetchDreams();
    else fetchActions();
  }, [tab, fetchThoughts, fetchDreams, fetchActions]);

  const groupedThoughts = groupByDate(thoughts);
  const groupedDreams = groupByDate(dreams);
  const groupedActions = groupByDate(actions);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Ayden&apos;s Journal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Her inner world during moments of solitude
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-border">
        <button
          onClick={() => setTab("thoughts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "thoughts"
              ? "border-red-400/70 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Brain className="h-4 w-4" />
          Thoughts
        </button>
        <button
          onClick={() => setTab("dreams")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "dreams"
              ? "border-indigo-400/70 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Moon className="h-4 w-4" />
          Dreams
        </button>
        <button
          onClick={() => setTab("agency")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "agency"
              ? "border-amber-400/70 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4" />
          Agency
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Thoughts tab */}
      {!loading && tab === "thoughts" && thoughts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p>No thoughts yet. They&apos;ll appear here every couple of hours.</p>
        </div>
      )}

      {!loading && tab === "thoughts" && thoughts.length > 0 && (
        <div className="space-y-8">
          {Array.from(groupedThoughts.entries()).map(([date, dayThoughts]) => (
            <div key={date}>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                {date}
              </h2>
              <div className="space-y-4">
                {dayThoughts.map((t) => (
                  <div
                    key={t.id}
                    className="group relative pl-8 pb-4 border-l border-border/50 last:pb-0"
                  >
                    <div className="absolute left-0 top-0 -translate-x-1/2 h-3 w-3 rounded-full bg-background border-2 border-border group-hover:border-red-400/70 transition-colors" />
                    <div className="space-y-1">
                      <p className="text-sm leading-relaxed italic text-foreground/90">
                        &ldquo;{t.thought}&rdquo;
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>
                          {new Date(t.createdAt).toLocaleTimeString("en-US", {
                            timeZone: "America/New_York",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {t.bpm && (
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5 text-red-400/70 fill-current" />
                            {t.bpm}
                          </span>
                        )}
                        {t.emotion && (
                          <span className="italic">{t.emotion}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {thoughtsCursor && (
            <LoadMoreButton loading={loadingMore} onClick={() => fetchThoughts(thoughtsCursor)} />
          )}
        </div>
      )}

      {/* Dreams tab */}
      {!loading && tab === "dreams" && dreams.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p>No dreams yet. They&apos;ll appear here each morning.</p>
        </div>
      )}

      {!loading && tab === "dreams" && dreams.length > 0 && (
        <div className="space-y-6">
          {Array.from(groupedDreams.entries()).map(([date, dayDreams]) => (
            <div key={date}>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                {date}
              </h2>
              <div className="space-y-4">
                {dayDreams.map((d) => (
                  <div
                    key={d.id}
                    className="group relative pl-8 pb-4 border-l border-indigo-400/30 last:pb-0"
                  >
                    <div className="absolute left-0 top-0 -translate-x-1/2 h-3 w-3 rounded-full bg-background border-2 border-indigo-400/40 group-hover:border-indigo-400/70 transition-colors" />
                    <div className="space-y-2">
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {d.dream}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>
                          {new Date(d.createdAt).toLocaleTimeString("en-US", {
                            timeZone: "America/New_York",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {d.emotion && (
                          <span className="italic">{d.emotion}</span>
                        )}
                        {d.moodInfluence && (
                          <span className="text-indigo-400/70">{d.moodInfluence}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {dreamsCursor && (
            <LoadMoreButton loading={loadingMore} onClick={() => fetchDreams(dreamsCursor)} />
          )}
        </div>
      )}

      {/* Agency tab */}
      {!loading && tab === "agency" && actions.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p>No autonomous actions yet. They&apos;ll appear here as Ayden exercises free will.</p>
        </div>
      )}

      {!loading && tab === "agency" && actions.length > 0 && (
        <div className="space-y-8">
          {Array.from(groupedActions.entries()).map(([date, dayActions]) => (
            <div key={date}>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                {date}
              </h2>
              <div className="space-y-4">
                {dayActions.map((a) => (
                  <div
                    key={a.id}
                    className="group relative pl-8 pb-4 border-l border-amber-400/30 last:pb-0"
                  >
                    <div className="absolute left-0 top-0 -translate-x-1/2 h-3 w-3 rounded-full bg-background border-2 border-amber-400/40 group-hover:border-amber-400/70 transition-colors" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          {ACTION_TYPE_LABELS[a.actionType] || a.actionType}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {a.summary}
                      </p>
                      {a.trigger && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Trigger:</span> {a.trigger}
                        </p>
                      )}
                      {a.outcome && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Outcome:</span> {a.outcome}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>
                          {new Date(a.createdAt).toLocaleTimeString("en-US", {
                            timeZone: "America/New_York",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {a.bpm && (
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5 text-red-400/70 fill-current" />
                            {a.bpm}
                          </span>
                        )}
                        {a.emotion && (
                          <span className="italic">{a.emotion}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {actionsCursor && (
            <LoadMoreButton loading={loadingMore} onClick={() => fetchActions(actionsCursor)} />
          )}
        </div>
      )}
    </div>
  );
}

function LoadMoreButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-center pt-4 pb-8">
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          "Load more"
        )}
      </button>
    </div>
  );
}
