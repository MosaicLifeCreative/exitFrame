"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";

interface Thought {
  id: string;
  thought: string;
  emotion: string | null;
  bpm: number | null;
  context: string | null;
  createdAt: string;
}

function groupByDate(thoughts: Thought[]): Map<string, Thought[]> {
  const groups = new Map<string, Thought[]>();
  for (const t of thoughts) {
    const dateKey = new Date(t.createdAt).toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(t);
  }
  return groups;
}

export default function AydenJournalPage() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ayden/thoughts?limit=50")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setThoughts(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = groupByDate(thoughts);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Ayden&apos;s Journal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Her inner thoughts during moments of solitude
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && thoughts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p>No thoughts yet. They&apos;ll appear here every couple of hours.</p>
        </div>
      )}

      {!loading && thoughts.length > 0 && (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, dayThoughts]) => (
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
    </div>
  );
}
