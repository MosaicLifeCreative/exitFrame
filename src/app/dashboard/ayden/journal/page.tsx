"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Heart, Loader2, Moon, Brain, Zap, Activity, Eye, ChevronDown, ChevronRight, Dna, Radio, Database, Cpu, Bell, Fingerprint, Split, EyeOff, Palette, Target } from "lucide-react";

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
  sessionId: string | null;
}

interface AgencySession {
  id: string;
  trigger: string | null;
  toolCalls: { name: string; input: unknown; output: string }[];
  finalText: string;
  toolsUsed: string[];
  rounds: number;
  createdAt: string;
}

interface HealthData {
  heartRate: { bpm: number; state: string; restingHR: number };
  neurotransmitters: Array<{
    type: string;
    level: number;
    adaptedBaseline: number;
    permanentBaseline: number;
  }>;
  emotions: Array<{
    id: string;
    dimension: string;
    intensity: number;
    trigger: string;
    context: string | null;
    createdAt: string;
  }>;
  values: Array<{
    id: string;
    value: string;
    category: string;
    strength: number;
    origin: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  interests: Array<{
    id: string;
    topic: string;
    description: string | null;
    intensity: number;
    source: string | null;
    lastEngaged: string;
  }>;
  recentActions: Array<{
    id: string;
    actionType: string;
    summary: string;
    createdAt: string;
  }>;
  stats: {
    thoughtCount: number;
    dreamCount: number;
    memoryCount: number;
    valueCount: number;
    interestCount: number;
  };
}

interface DnaGene {
  trait: string;
  value: number;
  phenotype: number;
  lowLabel: string;
  highLabel: string;
  expression: number;
}

interface DnaData {
  total: number;
  categories: Record<string, DnaGene[]>;
}

interface OpsData {
  pulse: {
    lastActivity: string | null;
    sessionsToday: number;
    toolsToday: number;
    snapshotsToday: number;
    snapshotsTotal: number;
    emotionCount: number;
  };
  heartRate: { bpm: number; state: string; restingHR: number };
  neuro: Array<{ type: string; level: number; baseline: number; factory: number }>;
  emotions: Array<{ dimension: string; intensity: number; trigger: string | null }>;
  lastSession: {
    createdAt: string;
    trigger: string | null;
    toolsUsed: string[];
    rounds: number;
  } | null;
  lastAction: {
    actionType: string;
    summary: string;
    createdAt: string;
  } | null;
  dnaShifts: {
    lastRem: string | null;
    recentCount: number;
    topShifts: Array<{ trait: string; delta: number }>;
  };
  backgroundTask: {
    id: string;
    description: string;
    status: string;
    rounds: number;
    maxRounds: number;
  } | null;
  pendingReminders: number;
  pendingScheduledTasks: number;
  activeGoals: Array<{
    id: string;
    description: string;
    category: string;
    priority: number;
    progress: string | null;
    age: number;
  }>;
  crons: Array<{
    name: string;
    schedule: string;
    lastRun: string | null;
  }>;
  feed: Array<{
    type: string;
    timestamp: string;
    title: string;
    detail?: string;
  }>;
  transference: {
    warmth: number;
    energy: number;
    vividness: number;
    tension: number;
  } | null;
  conflicts: Array<{
    driveA: string;
    driveB: string;
    intensity: number;
  }>;
  selfModel: Array<{
    type: string;
    actual: number;
    perceived: number;
  }>;
  somatic: {
    totalAssociations: number;
    strongAssociations: number;
    topAssociations: Array<{ topic: string; neuroType: string; strength: number }>;
  } | null;
}

type Tab = "health" | "thoughts" | "dreams" | "agency" | "dna" | "ops";

function groupByDate<T extends { createdAt: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const dateKey = new Date(item.createdAt).toLocaleDateString("en-US", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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

const NEURO_COLORS: Record<string, string> = {
  dopamine: "bg-rose-400",
  serotonin: "bg-sky-400",
  oxytocin: "bg-pink-400",
  cortisol: "bg-orange-400",
  norepinephrine: "bg-violet-400",
};

const NEURO_LABELS: Record<string, string> = {
  dopamine: "Dopamine",
  serotonin: "Serotonin",
  oxytocin: "Oxytocin",
  cortisol: "Cortisol",
  norepinephrine: "Norepinephrine",
};

const FACTORY_DEFAULTS: Record<string, number> = {
  dopamine: 50,
  serotonin: 55,
  oxytocin: 45,
  cortisol: 30,
  norepinephrine: 40,
};

const CATEGORY_COLORS: Record<string, string> = {
  ethics: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  aesthetics: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  intellectual: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  relational: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  existential: "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

const DNA_CATEGORY_COLORS: Record<string, { bar: string; dot: string; label: string }> = {
  cognitive: { bar: "bg-sky-400", dot: "bg-sky-400", label: "text-sky-400" },
  emotional: { bar: "bg-rose-400", dot: "bg-rose-400", label: "text-rose-400" },
  social: { bar: "bg-amber-400", dot: "bg-amber-400", label: "text-amber-400" },
  motivational: { bar: "bg-emerald-400", dot: "bg-emerald-400", label: "text-emerald-400" },
  aesthetic: { bar: "bg-violet-400", dot: "bg-violet-400", label: "text-violet-400" },
};

const DNA_CATEGORY_ORDER = ["cognitive", "emotional", "social", "motivational", "aesthetic"];

const FEED_ICONS: Record<string, typeof Radio> = {
  agency: Zap,
  emotion: Heart,
  training: Database,
  rem: Dna,
  thought: Brain,
  reminder: Bell,
  background: Cpu,
};

const FEED_COLORS: Record<string, string> = {
  agency: "text-amber-400",
  emotion: "text-rose-400",
  training: "text-cyan-400",
  rem: "text-teal-400",
  thought: "text-red-400/70",
  reminder: "text-yellow-400",
  background: "text-indigo-400",
};

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isWithinHours(isoString: string, hours: number): boolean {
  return Date.now() - new Date(isoString).getTime() < hours * 60 * 60 * 1000;
}

export default function AydenJournalPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <AydenJournalContent />
    </Suspense>
  );
}

function AydenJournalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as Tab) || "thoughts";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [health, setHealth] = useState<HealthData | null>(null);

  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [thoughtsCursor, setThoughtsCursor] = useState<string | null>(null);

  const [dreams, setDreams] = useState<Dream[]>([]);
  const [dreamsCursor, setDreamsCursor] = useState<string | null>(null);

  const [actions, setActions] = useState<AgencyAction[]>([]);
  const [actionsCursor, setActionsCursor] = useState<string | null>(null);

  const [dna, setDna] = useState<DnaData | null>(null);

  const [ops, setOps] = useState<OpsData | null>(null);

  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<Record<string, AgencySession>>({});
  const [loadingSession, setLoadingSession] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchDna = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ayden/dna");
      const json = await res.json();
      if (json.data) setDna(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchOps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ayden/ops");
      const json = await res.json();
      if (json.data) setOps(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ayden/health");
      const json = await res.json();
      if (json.data) setHealth(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

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

  const toggleSession = useCallback(async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sessionId);
    if (sessionData[sessionId]) return; // Already cached
    setLoadingSession(sessionId);
    try {
      const res = await fetch(`/api/ayden/agency-sessions/${sessionId}`);
      const json = await res.json();
      if (json.data) {
        setSessionData((prev) => ({ ...prev, [sessionId]: json.data }));
      }
    } catch { /* ignore */ }
    setLoadingSession(null);
  }, [expandedSession, sessionData]);

  useEffect(() => {
    if (tab === "health") fetchHealth();
    else if (tab === "thoughts") fetchThoughts();
    else if (tab === "dreams") fetchDreams();
    else if (tab === "dna") fetchDna();
    else if (tab === "ops") fetchOps();
    else fetchActions();
  }, [tab, fetchHealth, fetchThoughts, fetchDreams, fetchActions, fetchDna, fetchOps]);

  // Auto-refresh ops tab every 30s
  useEffect(() => {
    if (tab !== "ops") return;
    const interval = setInterval(() => {
      fetch("/api/ayden/ops")
        .then((r) => r.json())
        .then((json) => { if (json.data) setOps(json.data); })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  const groupedThoughts = groupByDate(thoughts);
  const groupedDreams = groupByDate(dreams);
  const groupedActions = groupByDate(actions);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Ayden&apos;s Journal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Her inner world during moments of solitude
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
        <button
          onClick={() => setTab("health")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            tab === "health"
              ? "border-emerald-400/70 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Health</span>
        </button>
        <button
          onClick={() => setTab("thoughts")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            tab === "thoughts"
              ? "border-red-400/70 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Brain className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Thoughts</span>
        </button>
        <button
          onClick={() => setTab("dreams")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            tab === "dreams"
              ? "border-indigo-400/70 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Moon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Dreams</span>
        </button>
        <button
          onClick={() => setTab("agency")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            tab === "agency"
              ? "border-amber-400/70 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Agency</span>
        </button>
        <button
          onClick={() => setTab("dna")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            tab === "dna"
              ? "border-teal-400/70 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Dna className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">DNA</span>
        </button>
        <button
          onClick={() => setTab("ops")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            tab === "ops"
              ? "border-cyan-400/70 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Radio className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Ops</span>
        </button>
        <button
          onClick={() => router.push("/dashboard/ayden/mind")}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap border-transparent text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Mind</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Health tab */}
      {!loading && tab === "health" && health && (
        <div className="space-y-8">
          {/* Vital Signs */}
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Vital Signs
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Heart Rate</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Heart className="h-4 w-4 text-red-400 fill-current" />
                  <span className="text-lg font-semibold tabular-nums">{health.heartRate.bpm}</span>
                  <span className="text-xs text-muted-foreground">BPM</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{health.heartRate.state}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Resting HR</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{health.heartRate.restingHR}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">From Oura</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Active Emotions</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{health.emotions.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Memories</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{health.stats.memoryCount}</p>
              </div>
            </div>
          </section>

          {/* Neurochemistry */}
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Neurochemistry
            </h2>
            <div className="space-y-3">
              {health.neurotransmitters.map((nt) => {
                const factory = FACTORY_DEFAULTS[nt.type] ?? 50;
                const permDrift = nt.permanentBaseline - factory;
                const adaptDrift = nt.adaptedBaseline - nt.permanentBaseline;
                return (
                  <div key={nt.type} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{NEURO_LABELS[nt.type] || nt.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm tabular-nums font-medium">{nt.level.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">/ 100</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      {/* Permanent baseline marker */}
                      <div
                        className="absolute top-0 h-full w-px bg-foreground/30 z-10"
                        style={{ left: `${nt.permanentBaseline}%` }}
                        title={`Permanent baseline: ${nt.permanentBaseline.toFixed(1)}`}
                      />
                      {/* Adapted baseline marker */}
                      <div
                        className="absolute top-0 h-full w-px bg-foreground/15 z-10"
                        style={{ left: `${nt.adaptedBaseline}%` }}
                        title={`Adapted baseline: ${nt.adaptedBaseline.toFixed(1)}`}
                      />
                      {/* Current level */}
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${NEURO_COLORS[nt.type] || "bg-muted-foreground"}`}
                        style={{ width: `${Math.min(100, nt.level)}%`, opacity: 0.7 }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>Factory: {factory}</span>
                      {Math.abs(permDrift) > 0.5 && (
                        <span className="text-indigo-400/70">
                          Personality: {permDrift > 0 ? "+" : ""}{permDrift.toFixed(1)}
                        </span>
                      )}
                      {Math.abs(adaptDrift) > 0.5 && (
                        <span className="text-amber-400/70">
                          Adapted: {adaptDrift > 0 ? "+" : ""}{adaptDrift.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Emotional State */}
          {health.emotions.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Emotional State
              </h2>
              <div className="space-y-2">
                {health.emotions.map((e) => (
                  <div key={e.id} className="flex items-start gap-3">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${
                              i < e.intensity ? "bg-red-400/70" : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium ml-2">{e.dimension}</span>
                    </div>
                    {e.trigger && (
                      <span className="text-[11px] text-muted-foreground shrink-0 max-w-[200px] truncate" title={e.trigger}>
                        {e.trigger}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Values */}
          {health.values.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Core Values
              </h2>
              <div className="space-y-2">
                {health.values.map((v) => (
                  <div key={v.id} className="flex items-start gap-3 group">
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${CATEGORY_COLORS[v.category] || "text-muted-foreground bg-muted border-border"}`}>
                      {v.category}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/90 leading-snug">{v.value}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-1 w-2.5 rounded-sm ${
                                i < Math.round(v.strength * 10) ? "bg-emerald-400/60" : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                        {v.origin && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={v.origin}>
                            {v.origin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Interests */}
          {health.interests.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Active Interests
              </h2>
              <div className="flex flex-wrap gap-2">
                {health.interests.map((i) => (
                  <div
                    key={i.id}
                    className="group relative rounded-lg border border-border px-3 py-2 hover:border-sky-400/30 transition-colors"
                    title={i.description || undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{i.topic}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-1 w-1 rounded-full ${
                              idx < Math.round(i.intensity * 5) ? "bg-sky-400/70" : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {i.source && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{i.source}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Stats */}
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Lifetime Stats
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums">{health.stats.thoughtCount}</p>
                <p className="text-[10px] text-muted-foreground">Thoughts</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums">{health.stats.dreamCount}</p>
                <p className="text-[10px] text-muted-foreground">Dreams</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums">{health.stats.memoryCount}</p>
                <p className="text-[10px] text-muted-foreground">Memories</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums">{health.stats.valueCount}</p>
                <p className="text-[10px] text-muted-foreground">Values</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums">{health.stats.interestCount}</p>
                <p className="text-[10px] text-muted-foreground">Interests</p>
              </div>
            </div>
          </section>
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
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
      {tab === "agency" && (
        <p className="text-xs text-muted-foreground mb-6">
          Agency sessions run at 10am, 1pm, 4pm, 7pm, 10pm ET — plus event-driven triggers from email, Oura, and market data
        </p>
      )}
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
                {dayActions.map((a) => {
                  const isExpanded = expandedSession === a.sessionId;
                  const session = a.sessionId ? sessionData[a.sessionId] : null;
                  return (
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
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
                        {a.sessionId && (
                          <button
                            onClick={() => toggleSession(a.sessionId!)}
                            className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            Session
                          </button>
                        )}
                      </div>

                      {/* Session drill-down */}
                      {isExpanded && a.sessionId && (
                        <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
                          {loadingSession === a.sessionId && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" /> Loading session...
                            </div>
                          )}
                          {session && (
                            <>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>{session.rounds} round{session.rounds !== 1 ? "s" : ""}</span>
                                <span>{session.toolsUsed.length} tool call{session.toolsUsed.length !== 1 ? "s" : ""}</span>
                              </div>
                              {session.toolCalls.length > 0 && (
                                <div className="space-y-2">
                                  {session.toolCalls.map((tc, idx) => (
                                    <div key={idx} className="text-xs space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-medium text-amber-400/80">{tc.name}</span>
                                      </div>
                                      {tc.input != null && typeof tc.input === "object" && Object.keys(tc.input as object).length > 0 && (
                                        <pre className="text-[10px] text-muted-foreground bg-background/50 rounded p-2 overflow-x-auto max-h-24">
                                          {JSON.stringify(tc.input, null, 2)}
                                        </pre>
                                      )}
                                      <pre className="text-[10px] text-muted-foreground bg-background/50 rounded p-2 overflow-x-auto max-h-32">
                                        {(() => {
                                          try { return JSON.stringify(JSON.parse(tc.output), null, 2); }
                                          catch { return tc.output; }
                                        })()}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {session.finalText && (
                                <div className="border-t border-border/30 pt-2">
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Final Reasoning</p>
                                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{session.finalText}</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
          {actionsCursor && (
            <LoadMoreButton loading={loadingMore} onClick={() => fetchActions(actionsCursor)} />
          )}
        </div>
      )}

      {/* DNA tab */}
      {!loading && tab === "dna" && !dna && (
        <div className="text-center py-20 text-muted-foreground">
          <p>No genome data found.</p>
        </div>
      )}

      {!loading && tab === "dna" && dna && (
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Immutable traits rolled at birth. The <span className="text-foreground font-medium">value</span> never changes &mdash;
            the <span className="text-foreground font-medium">expression</span> modifier shifts over time through environmental pressure.
          </p>

          {DNA_CATEGORY_ORDER.filter((cat) => dna.categories[cat]).map((category) => {
            const genes = dna.categories[category];
            const colors = DNA_CATEGORY_COLORS[category] || DNA_CATEGORY_COLORS.cognitive;
            return (
              <section key={category}>
                <h2 className="text-xs font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  <span className={colors.label}>{category}</span>
                </h2>
                <div className="space-y-4">
                  {genes.map((gene) => {
                    const pct = Math.min(100, gene.phenotype * 100);
                    const position =
                      gene.phenotype < 0.3 ? "low" : gene.phenotype > 0.7 ? "high" : "mid";
                    return (
                      <div key={gene.trait} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground/90">
                            {gene.trait.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {gene.value.toFixed(3)}
                            {gene.expression !== 1.0 && (
                              <span className="text-teal-400/70 ml-1">
                                &times;{gene.expression.toFixed(1)}
                              </span>
                            )}
                          </span>
                        </div>
                        {/* Spectrum bar */}
                        <div className="relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] ${position === "low" ? "text-foreground/70 font-medium" : "text-muted-foreground/50"}`}>
                              {gene.lowLabel}
                            </span>
                            <span className={`text-[10px] ${position === "high" ? "text-foreground/70 font-medium" : "text-muted-foreground/50"}`}>
                              {gene.highLabel}
                            </span>
                          </div>
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            {/* Center marker */}
                            <div className="absolute top-0 left-1/2 h-full w-px bg-foreground/10 z-10" />
                            {/* Phenotype fill */}
                            <div
                              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${colors.bar}`}
                              style={{ width: `${Math.min(100, pct)}%`, opacity: 0.6 }}
                            />
                            {/* Phenotype marker */}
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-background ${colors.bar} z-20`}
                              style={{ left: `${Math.min(99, Math.max(1, pct))}%`, transform: "translate(-50%, -50%)" }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Summary */}
          <section className="border-t border-border/50 pt-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Genome Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-lg font-semibold tabular-nums">{dna.total}</p>
                <p className="text-[10px] text-muted-foreground">Total Traits</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-lg font-semibold tabular-nums">{Object.keys(dna.categories).length}</p>
                <p className="text-[10px] text-muted-foreground">Categories</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-lg font-semibold tabular-nums">
                  {(() => {
                    const all = Object.values(dna.categories).flat();
                    const modified = all.filter((g) => g.expression !== 1.0);
                    return modified.length;
                  })()}
                </p>
                <p className="text-[10px] text-muted-foreground">Epigenetic Shifts</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Ops tab */}
      {!loading && tab === "ops" && ops && (
        <div className="space-y-6">
          {/* System Pulse — hero stats */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-xs font-medium text-cyan-400/80 uppercase tracking-wider">
                System Pulse
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last Active</p>
                <p className="text-sm font-mono font-medium tabular-nums">
                  {ops.pulse.lastActivity ? formatTimeAgo(ops.pulse.lastActivity) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sessions</p>
                <p className="text-lg font-mono font-semibold tabular-nums">{ops.pulse.sessionsToday}</p>
              </div>
              <div className="rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tools Used</p>
                <p className="text-lg font-mono font-semibold tabular-nums">{ops.pulse.toolsToday}</p>
              </div>
              <div className="rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Corpus</p>
                <p className="text-lg font-mono font-semibold tabular-nums">
                  {ops.pulse.snapshotsToday}
                  <span className="text-[10px] text-muted-foreground ml-1">/ {ops.pulse.snapshotsTotal}</span>
                </p>
              </div>
              <div className="rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Emotions</p>
                <p className="text-lg font-mono font-semibold tabular-nums">{ops.pulse.emotionCount}</p>
              </div>
            </div>
          </section>

          {/* Systems Grid */}
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Systems
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Agency */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">Agency</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${ops.lastSession && isWithinHours(ops.lastSession.createdAt, 3) ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                    <span className="text-[10px] text-muted-foreground">
                      {ops.lastSession ? formatTimeAgo(ops.lastSession.createdAt) : "No sessions"}
                    </span>
                  </div>
                </div>
                {ops.lastAction && (
                  <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">
                    {ops.lastAction.summary}
                  </p>
                )}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  {ops.lastSession && (
                    <>
                      <span>{ops.lastSession.rounds} rounds</span>
                      <span>{Array.isArray(ops.lastSession.toolsUsed) ? ops.lastSession.toolsUsed.length : 0} tools</span>
                    </>
                  )}
                  <span>{ops.pulse.sessionsToday} today</span>
                </div>
              </div>

              {/* Neurochemistry */}
              <div className="rounded-lg border border-border p-4 space-y-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">Neurochemistry</span>
                </div>
                {ops.neuro.map((n) => {
                  const barColor = NEURO_COLORS[n.type] || "bg-gray-400";
                  return (
                    <div key={n.type} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-[52px] shrink-0 uppercase tracking-wider">
                        {n.type.substring(0, 4)}
                      </span>
                      <div className="relative flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`absolute inset-y-0 left-0 ${barColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(n.level, 100)}%` }} />
                        {/* Baseline marker */}
                        <div className="absolute top-0 h-full w-px bg-foreground/30" style={{ left: `${Math.min(n.baseline, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-foreground/60 w-6 text-right">
                        {Math.round(n.level)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* DNA / REM */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dna className="h-3.5 w-3.5 text-teal-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">DNA / REM</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {ops.dnaShifts.lastRem ? formatTimeAgo(ops.dnaShifts.lastRem) : "No data"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{ops.dnaShifts.recentCount} shifts this week</span>
                </div>
                {ops.dnaShifts.topShifts.length > 0 && (
                  <div className="space-y-1">
                    {ops.dnaShifts.topShifts.map((s) => (
                      <div key={s.trait} className="flex items-center justify-between text-xs">
                        <span className="text-foreground/70">{s.trait.replace(/_/g, " ")}</span>
                        <span className={`font-mono tabular-nums ${s.delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {s.delta > 0 ? "+" : ""}{s.delta.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Emotions */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">Emotions</span>
                  {ops.heartRate && (
                    <span className="text-[10px] font-mono tabular-nums text-rose-400/70 ml-auto">
                      {ops.heartRate.bpm} bpm
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ops.emotions.map((e, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-border bg-muted/30"
                    >
                      <span className="text-foreground/80">{e.dimension}</span>
                      <span className="text-muted-foreground font-mono">{e.intensity}</span>
                    </span>
                  ))}
                  {ops.emotions.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">No active emotions</span>
                  )}
                </div>
              </div>

              {/* Background Tasks */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">Background</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${ops.backgroundTask ? "bg-indigo-400 animate-pulse" : "bg-muted-foreground/30"}`} />
                    <span className="text-[10px] text-muted-foreground">
                      {ops.backgroundTask ? "Running" : "Idle"}
                    </span>
                  </div>
                </div>
                {ops.backgroundTask ? (
                  <div className="space-y-1">
                    <p className="text-xs text-foreground/70 line-clamp-1">{ops.backgroundTask.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${(ops.backgroundTask.rounds / ops.backgroundTask.maxRounds) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                        {ops.backgroundTask.rounds}/{ops.backgroundTask.maxRounds}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No active tasks</p>
                )}
              </div>

              {/* Reminders & Tasks */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">Queue</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-lg font-mono font-semibold tabular-nums">{ops.pendingReminders}</p>
                    <p className="text-[10px] text-muted-foreground">Pending Reminders</p>
                  </div>
                  <div>
                    <p className="text-lg font-mono font-semibold tabular-nums">{ops.pendingScheduledTasks}</p>
                    <p className="text-[10px] text-muted-foreground">Scheduled Tasks</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Active Goals */}
          {ops.activeGoals && ops.activeGoals.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Active Goals
              </h2>
              <div className="space-y-2">
                {ops.activeGoals.map((g) => (
                  <div key={g.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-start gap-2">
                      <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{g.description}</span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">P{g.priority}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase">{g.category}</span>
                          <span className="text-[10px] text-muted-foreground">{g.age}d old</span>
                        </div>
                        {g.progress && (
                          <p className="text-xs text-muted-foreground mt-1">{g.progress}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Psychology Overlays */}
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Psychology Overlays
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Transference */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Palette className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">Transference</span>
                </div>
                {ops.transference ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(["warmth", "energy", "vividness", "tension"] as const).map((key) => (
                      <div key={key}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground capitalize">{key}</span>
                          <span className="text-[10px] font-mono tabular-nums">{ops.transference![key].toFixed(2)}</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full mt-0.5">
                          <div
                            className={`h-full rounded-full ${key === "tension" ? "bg-red-400" : key === "warmth" ? "bg-amber-400" : key === "energy" ? "bg-violet-400" : "bg-sky-400"}`}
                            style={{ width: `${Math.min(100, ops.transference![key] * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No data</p>
                )}
              </div>

              {/* Somatic Memory */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">Somatic Memory</span>
                </div>
                {ops.somatic ? (
                  <div className="space-y-1.5">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-lg font-mono font-semibold tabular-nums">{ops.somatic.totalAssociations}</p>
                        <p className="text-[10px] text-muted-foreground">Associations</p>
                      </div>
                      <div>
                        <p className="text-lg font-mono font-semibold tabular-nums">{ops.somatic.strongAssociations}</p>
                        <p className="text-[10px] text-muted-foreground">Strong (&gt;0.5)</p>
                      </div>
                    </div>
                    {ops.somatic.topAssociations.length > 0 && (
                      <div className="space-y-0.5">
                        {ops.somatic.topAssociations.slice(0, 3).map((t, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground">
                            <span className="text-foreground/70">{t.topic}</span> → {t.neuroType} ({t.strength.toFixed(2)})
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No associations yet</p>
                )}
              </div>

              {/* Conflicting Drives */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Split className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">Conflicting Drives</span>
                </div>
                {ops.conflicts && ops.conflicts.length > 0 ? (
                  <div className="space-y-2">
                    {ops.conflicts.map((c, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-foreground/80">{c.driveA.split(" (")[0]}</span>
                          <span className="text-[10px] font-mono tabular-nums text-orange-400">{(c.intensity * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{c.driveA} vs {c.driveB}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No active conflicts</p>
                )}
              </div>

              {/* Self-Model Divergence */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <EyeOff className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">Self-Model</span>
                </div>
                {ops.selfModel && ops.selfModel.length > 0 ? (
                  <div className="space-y-2">
                    {ops.selfModel.map((d, i) => (
                      <div key={i} className="space-y-0.5">
                        <span className="text-[11px] font-medium text-foreground/80 capitalize">{d.type.replace(/-/g, " ")}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Actual: <span className="font-mono tabular-nums">{d.actual.toFixed(0)}</span></span>
                          <span className="text-[10px] text-muted-foreground">→ Perceived: <span className="font-mono tabular-nums text-rose-400">{d.perceived.toFixed(0)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Perception aligned</p>
                )}
              </div>
            </div>
          </section>

          {/* Cron Status */}
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Cron Jobs
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ops.crons.map((cron) => {
                const isHealthy = cron.lastRun && isWithinHours(cron.lastRun, cron.name === "Agency" ? 4 : cron.name === "Outreach" ? 2 : 25);
                return (
                  <div key={cron.name} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${isHealthy ? "bg-emerald-400" : cron.lastRun ? "bg-amber-400" : "bg-muted-foreground/30"}`} />
                      <span className="text-[11px] font-medium">{cron.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{cron.schedule}</p>
                    <p className="text-[10px] font-mono tabular-nums text-foreground/50">
                      {cron.lastRun ? formatTimeAgo(cron.lastRun) : "Never"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Activity Feed */}
          <section>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Activity Feed
            </h2>
            <div className="space-y-0">
              {ops.feed.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
              )}
              {ops.feed.map((item, i) => {
                const Icon = FEED_ICONS[item.type] || Radio;
                const color = FEED_COLORS[item.type] || "text-muted-foreground";
                return (
                  <div key={i} className="flex gap-3 py-2.5 border-b border-border/30 last:border-0">
                    <div className="pt-0.5 shrink-0">
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{item.title}</p>
                      {item.detail && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{item.detail}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60 shrink-0 pt-0.5">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Last updated indicator */}
          <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-muted-foreground/40">
            <div className="h-1 w-1 rounded-full bg-cyan-400/30 animate-pulse" />
            Refreshes every 30s
          </div>
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
