"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2, Moon, Brain } from "lucide-react";

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

type Tab = "thoughts" | "dreams";

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

export default function AydenJournalPage() {
  const [tab, setTab] = useState<Tab>("thoughts");
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === "thoughts") {
      fetch("/api/ayden/thoughts?limit=50")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) setThoughts(json.data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      fetch("/api/ayden/dreams?limit=60")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) setDreams(json.data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const groupedThoughts = groupByDate(thoughts);
  const groupedDreams = groupByDate(dreams);

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
                    {/* Timeline dot */}
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
                    {/* Dream dot — moon-colored */}
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
        </div>
      )}
    </div>
  );
}
