"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useChatContext } from "@/hooks/useChatContext";
import { toast } from "sonner";
import {
  Heart,
  Moon,
  Zap,
  Activity,
  RefreshCw,
  Link2,
  Unlink,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Brain,
  Wind,
  Bed,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface OuraStatus {
  connected: boolean;
  lastSync: string | null;
  error: string | null;
}

interface OuraDay {
  date: string;
  score: number | null;
  hrvAverage?: number | null;
  data: Record<string, unknown>;
}

interface OuraGenericDay {
  date: string;
  data: Record<string, unknown>;
}

interface OuraData {
  sleep: OuraDay[];
  readiness: OuraDay[];
  activity: OuraDay[];
  sleepSessions: OuraGenericDay[];
  heartrate: OuraGenericDay[];
  spo2: OuraGenericDay[];
  stress: OuraGenericDay[];
  resilience: OuraGenericDay[];
}

interface SleepPageData {
  status: OuraStatus;
  oura: OuraData | null;
}

// ─── Utility functions ──────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "--";
  try {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "--";
  }
}

// ─── Score / Status helpers ─────────────────────────────

type SystemStatus = "optimal" | "good" | "attention" | "critical";

function getScoreStatus(score: number | null): SystemStatus {
  if (score === null) return "attention";
  if (score >= 85) return "optimal";
  if (score >= 70) return "good";
  if (score >= 60) return "attention";
  return "critical";
}

function getHrStatus(bpm: number | null): SystemStatus {
  if (bpm === null) return "attention";
  if (bpm < 60) return "optimal";
  if (bpm < 70) return "good";
  if (bpm < 80) return "attention";
  return "critical";
}

function getHrvStatus(hrv: number | null): SystemStatus {
  if (hrv === null) return "attention";
  if (hrv >= 50) return "optimal";
  if (hrv >= 30) return "good";
  if (hrv >= 20) return "attention";
  return "critical";
}

const statusConfig: Record<SystemStatus, { label: string; color: string; bg: string; icon: React.ElementType; barColor: string }> = {
  optimal: { label: "Optimal", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", icon: CheckCircle2, barColor: "#10b981" },
  good: { label: "Good", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", icon: CheckCircle2, barColor: "#22c55e" },
  attention: { label: "Pay Attention", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500", icon: AlertCircle, barColor: "#f97316" },
  critical: { label: "Critical", color: "text-red-600 dark:text-red-400", bg: "bg-red-500", icon: XCircle, barColor: "#ef4444" },
};

const SYSTEM_NAMES = ["Sleep", "Recovery", "Activity", "Resting HR", "HRV"];

function getOverallStatus(statuses: SystemStatus[]): { status: SystemStatus; message: string; flagged: string[] } {
  const flagged: string[] = [];
  statuses.forEach((s, i) => {
    if (s === "attention" || s === "critical") flagged.push(SYSTEM_NAMES[i]);
  });

  if (statuses.every((s) => s === "optimal")) return { status: "optimal", message: "All Systems Optimal", flagged };
  if (statuses.some((s) => s === "critical")) return { status: "critical", message: "Needs Attention", flagged };
  if (statuses.some((s) => s === "attention")) return { status: "attention", message: "Some Systems Flagged", flagged };
  return { status: "good", message: "All Systems Operational", flagged };
}

function getBarColor(score: number | null, mode?: "hr" | "hrv"): string {
  if (score === null) return "#374151";
  if (mode === "hr") return statusConfig[getHrStatus(score)].barColor;
  if (mode === "hrv") return statusConfig[getHrvStatus(score)].barColor;
  return statusConfig[getScoreStatus(score)].barColor;
}

function computeTrend(days: Array<{ value: number | null }>): number | null {
  const valid = days.filter((d) => d.value !== null);
  if (valid.length < 2) return null;
  const latest = valid.at(-1)?.value;
  if (latest === null || latest === undefined) return null;
  const prev7 = valid.slice(-8, -1);
  if (prev7.length === 0) return null;
  const avg = prev7.reduce((sum, d) => sum + (d.value ?? 0), 0) / prev7.length;
  return Math.round(latest - avg);
}

// ─── Components ─────────────────────────────────────────

function ScoreCard({
  title,
  icon: Icon,
  score,
  trend,
  color,
  subtitle,
  unit,
}: {
  title: string;
  icon: React.ElementType;
  score: number | null;
  trend: number | null;
  color: string;
  subtitle?: string;
  unit?: string;
}) {
  const scoreColor =
    score === null
      ? "text-muted-foreground"
      : title === "HRV"
        ? statusConfig[getHrvStatus(score)].color
        : title === "Resting HR"
          ? statusConfig[getHrStatus(score)].color
          : score >= 85
            ? "text-emerald-500"
            : score >= 70
              ? "text-amber-500"
              : "text-red-500";

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">{title}</div>
          </div>
          {trend !== null && (
            <div className={`flex items-center gap-0.5 text-xs shrink-0 ${
              title === "Resting HR"
                ? (trend < 0 ? "text-emerald-500" : trend > 0 ? "text-red-500" : "text-muted-foreground")
                : (trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground")
            }`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {trend > 0 ? "+" : ""}{trend}
            </div>
          )}
        </div>
        <div className={`text-2xl font-bold tabular-nums ${scoreColor}`}>
          {score ?? "--"}
          {unit && score !== null && <span className="text-sm font-normal ml-0.5">{unit}</span>}
        </div>
        {subtitle && (
          <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}

function UptimeBar({
  days,
  mode,
}: {
  days: Array<{ date: string; value: number | null }>;
  mode?: "hr" | "hrv";
}) {
  // Always render exactly 30 cells, filling missing dates with null
  const normalized = useMemo(() => {
    const dayMap = new Map(days.map((d) => [d.date, d.value]));
    const cells: Array<{ date: string; value: number | null }> = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      cells.push({ date: dateStr, value: dayMap.get(dateStr) ?? null });
    }
    return cells;
  }, [days]);

  return (
    <div className="grid h-8" style={{ gridTemplateColumns: "repeat(30, 1fr)", gap: "2px" }}>
      {normalized.map((day) => (
        <div
          key={day.date}
          className="h-full rounded-[2px] transition-opacity hover:opacity-80 relative group"
          style={{ backgroundColor: getBarColor(day.value, mode) }}
        >
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-md">
            <div className="font-medium">
              {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
            <div className="text-muted-foreground">
              {day.value !== null
                ? mode === "hr" ? `${Math.round(day.value)} bpm`
                  : mode === "hrv" ? `${Math.round(day.value)} ms`
                  : day.value
                : "No data"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SystemRow({
  name,
  icon: Icon,
  days,
  mode,
  expandedChart,
}: {
  name: string;
  icon: React.ElementType;
  days: Array<{ date: string; value: number | null }>;
  mode?: "hr" | "hrv";
  expandedChart: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const latestScore = days.at(-1)?.value ?? null;
  const status = mode === "hr"
    ? getHrStatus(latestScore)
    : mode === "hrv"
      ? getHrvStatus(latestScore)
      : getScoreStatus(latestScore);
  const config = statusConfig[status];
  const invertTrend = mode === "hr";

  const trend = useMemo(() => computeTrend(days), [days]);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 py-4 px-4 hover:bg-muted/30 transition-colors text-left"
      >
        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="w-32 shrink-0">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {latestScore !== null
              ? mode === "hr" ? `${Math.round(latestScore)} bpm`
                : mode === "hrv" ? `${Math.round(latestScore)} ms`
                : latestScore
              : "--"}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <UptimeBar days={days} mode={mode} />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={cn("flex items-center justify-end gap-0.5 text-xs tabular-nums w-14", {
              "text-emerald-500": invertTrend ? (trend ?? 0) < 0 : (trend ?? 0) > 0,
              "text-red-500": invertTrend ? (trend ?? 0) > 0 : (trend ?? 0) < 0,
              "text-muted-foreground": trend === null || trend === 0,
            })}>
              {trend !== null && (
                <>
                  {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {trend > 0 ? "+" : ""}{trend}
                </>
              )}
          </div>
          <span className={cn("text-xs font-medium w-24 text-right", config.color)}>
            {config.label}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {expandedChart}
        </div>
      )}
    </div>
  );
}

function ScoreChart({
  title,
  data,
  dataKey,
  color,
  domain,
}: {
  title: string;
  data: Array<{ date: string; value: number | null }>;
  dataKey: string;
  color: string;
  domain?: [number, number];
}) {
  const chartData = data.filter((d) => d.value !== null).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    [dataKey]: d.value,
  }));

  if (chartData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No data available yet
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">{title}</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis domain={domain || [0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">--</span>;
  const color =
    score >= 85
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return <span className={`font-medium ${color}`}>{score}</span>;
}

function ResilienceBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-muted-foreground">--</span>;
  const colors: Record<string, string> = {
    exceptional: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    strong: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    adequate: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    limited: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    compromised: "bg-red-500/10 text-red-500 border-red-500/20",
  };
  const cls = colors[level.toLowerCase()] || "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={cn("text-[10px] capitalize", cls)}>{level}</Badge>;
}

function StressBadge({ summary }: { summary: string | null }) {
  if (!summary) return <span className="text-muted-foreground">--</span>;
  const colors: Record<string, string> = {
    restored: "text-emerald-500",
    normal: "text-emerald-400",
    stressful: "text-amber-500",
    elevated: "text-orange-500",
  };
  const color = colors[summary.toLowerCase()] || "text-muted-foreground";
  return <span className={cn("text-xs capitalize", color)}>{summary}</span>;
}

// ─── Main Page ──────────────────────────────────────────

export default function SleepPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <SleepPage />
    </Suspense>
  );
}

function SleepPage() {
  const [data, setData] = useState<SleepPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const searchParams = useSearchParams();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/oura");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      toast.error("Failed to load sleep data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const ouraParam = searchParams.get("oura");
    if (ouraParam === "connected") {
      toast.success("Oura Ring connected! Syncing your data...");
      fetchData();
    } else if (ouraParam === "error") {
      const msg = searchParams.get("message") || "Connection failed";
      toast.error(`Oura connection error: ${msg}`);
    }
  }, [searchParams, fetchData]);

  // ─── Derived data ───────────────────────────────────

  const oura = data?.oura;
  const connected = data?.status?.connected ?? false;

  const sleepDays = useMemo(() => (oura?.sleep || []).map((d) => ({ date: d.date, value: d.score })), [oura?.sleep]);
  const readinessDays = useMemo(() => (oura?.readiness || []).map((d) => ({ date: d.date, value: d.score })), [oura?.readiness]);
  const activityDays = useMemo(() => (oura?.activity || []).map((d) => ({ date: d.date, value: d.score })), [oura?.activity]);
  const hrvDays = useMemo(() => (oura?.sleep || []).map((d) => ({ date: d.date, value: d.hrvAverage ? Math.round(d.hrvAverage) : null })), [oura?.sleep]);

  // Resting HR from sleep sessions (lowest_heart_rate) or heartrate records
  const hrDays = useMemo(() => {
    if (oura?.sleepSessions && oura.sleepSessions.length > 0) {
      return oura.sleepSessions.map((d) => ({
        date: d.date,
        value: (d.data.lowest_heart_rate as number | null) ?? (d.data.average_heart_rate as number | null),
      }));
    }
    return (oura?.heartrate || []).map((d) => ({
      date: d.date,
      value: (d.data.averageBpm as number) ?? null,
    }));
  }, [oura?.sleepSessions, oura?.heartrate]);

  // SpO2, stress, resilience lookups by date
  const spo2Map = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const d of oura?.spo2 || []) {
      const pct = (d.data.spo2_percentage as { average: number | null } | null)?.average ?? null;
      m.set(d.date, pct);
    }
    return m;
  }, [oura?.spo2]);

  const stressMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const d of oura?.stress || []) {
      m.set(d.date, (d.data.day_summary as string | null) ?? null);
    }
    return m;
  }, [oura?.stress]);

  const resilienceMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const d of oura?.resilience || []) {
      m.set(d.date, (d.data.level as string | null) ?? null);
    }
    return m;
  }, [oura?.resilience]);

  // Trends
  const sleepTrend = useMemo(() => computeTrend(sleepDays), [sleepDays]);
  const readinessTrend = useMemo(() => computeTrend(readinessDays), [readinessDays]);
  const activityTrend = useMemo(() => computeTrend(activityDays), [activityDays]);
  const hrvTrend = useMemo(() => computeTrend(hrvDays), [hrvDays]);
  const hrTrend = useMemo(() => computeTrend(hrDays), [hrDays]);

  // Latest values
  const latestHrv = hrvDays.filter((d) => d.value !== null).at(-1)?.value ?? null;
  const latestHr = hrDays.filter((d) => d.value !== null).at(-1)?.value ?? null;

  // Overall status
  const systemStatuses: SystemStatus[] = useMemo(() => [
    getScoreStatus(sleepDays.at(-1)?.value ?? null),
    getScoreStatus(readinessDays.at(-1)?.value ?? null),
    getScoreStatus(activityDays.at(-1)?.value ?? null),
    getHrStatus(latestHr),
    getHrvStatus(latestHrv),
  ], [sleepDays, readinessDays, activityDays, latestHr, latestHrv]);

  const overall = useMemo(() => getOverallStatus(systemStatuses), [systemStatuses]);
  const overallConfig = statusConfig[overall.status];
  const OverallIcon = overallConfig.icon;

  // Chat context
  const chatContext = useMemo(() => {
    if (!connected || !oura) return "Oura Ring not connected.";

    const fmt = (t: number | null) => t !== null ? (t > 0 ? "+" : "") + t : "N/A";
    const recent7Sleep = oura.sleep.slice(-7);
    const sleepScores = recent7Sleep.map((d) => `${d.date}: ${d.score ?? "N/A"}`).join(", ");
    const readinessScores = oura.readiness.slice(-7).map((d) => `${d.date}: ${d.score ?? "N/A"}`).join(", ");
    const activityScores = oura.activity.slice(-7).map((d) => `${d.date}: ${d.score ?? "N/A"}`).join(", ");
    const hrvValues = recent7Sleep.filter((d) => d.hrvAverage).map((d) => `${d.date}: ${Math.round(d.hrvAverage!)} ms`).join(", ");

    const latestReadinessRaw = oura.readiness.at(-1)?.data as Record<string, unknown> | undefined;
    const latestSleepRaw = oura.sleep.at(-1)?.data as Record<string, unknown> | undefined;
    let contributors = "";
    if (latestReadinessRaw?.contributors) {
      const c = latestReadinessRaw.contributors as Record<string, number>;
      contributors += `\nReadiness contributors: ${Object.entries(c).map(([k, v]) => `${k}=${v}`).join(", ")}`;
    }
    if (latestSleepRaw?.contributors) {
      const c = latestSleepRaw.contributors as Record<string, number>;
      contributors += `\nSleep contributors: ${Object.entries(c).map(([k, v]) => `${k}=${v}`).join(", ")}`;
    }

    return [
      `Oura Ring connected. ${oura.sleep.length} days of data.`,
      `Last 7 days sleep scores: ${sleepScores}`,
      `Last 7 days readiness: ${readinessScores}`,
      `Last 7 days activity: ${activityScores}`,
      hrvValues ? `HRV (RMSSD): ${hrvValues}` : "",
      `Resting HR: ${latestHr ? Math.round(latestHr) + " bpm" : "N/A"}`,
      contributors,
      `Trends vs 7-day avg — Sleep: ${fmt(sleepTrend)}, Readiness: ${fmt(readinessTrend)}, Activity: ${fmt(activityTrend)}, HRV: ${fmt(hrvTrend)}`,
    ].filter(Boolean).join("\n");
  }, [connected, oura, latestHr, sleepTrend, readinessTrend, activityTrend, hrvTrend]);
  useChatContext("Sleep", chatContext);

  // ─── Actions ────────────────────────────────────────

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/oura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect" }),
      });
      const json = await res.json();
      if (json.data?.authUrl) {
        window.location.href = json.data.authUrl;
      } else {
        toast.error(json.error || "Failed to get auth URL");
        setConnecting(false);
      }
    } catch {
      toast.error("Failed to initiate connection");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/oura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      toast.success("Oura Ring disconnected");
      setData({ status: { connected: false, lastSync: null, error: null }, oura: null });
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/oura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", daysBack: 7 }),
      });
      const json = await res.json();
      if (res.ok) {
        const s = json.data.synced;
        toast.success(`Synced: ${s.sleep} sleep, ${s.readiness} readiness, ${s.activity} activity, ${s.hrv} HRV days`);
        await fetchData();
      } else {
        toast.error(json.error || "Sync failed");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // ─── Render ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sleep</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {connected
              ? `Oura Ring connected${data?.status?.lastSync ? ` — Last synced ${new Date(data.status.lastSync).toLocaleString()}` : ""}`
              : "Connect your Oura Ring to start tracking"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                Sync
              </Button>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-1" />
              )}
              Connect Oura Ring
            </Button>
          )}
        </div>
      </div>

      {/* Not Connected */}
      {!connected && (
        <Card>
          <CardContent className="py-16 text-center">
            <Moon className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Sleep Data</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Connect your Oura Ring to track sleep quality, readiness, activity scores,
              HRV, SpO2, stress, and resilience. Data syncs automatically daily.
            </p>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Connect Oura Ring
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {data?.status?.error && (
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Badge variant="destructive">Error</Badge>
              <span className="text-sm">{data.status.error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Data */}
      {connected && oura && (
        <>
          {/* Overall Status Banner */}
          <Card className={cn("border-l-4", {
            "border-l-emerald-500": overall.status === "optimal" || overall.status === "good",
            "border-l-orange-500": overall.status === "attention",
            "border-l-red-500": overall.status === "critical",
          })}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <OverallIcon className={cn("h-5 w-5", overallConfig.color)} />
                <div>
                  <div className={cn("text-sm font-semibold", overallConfig.color)}>
                    {overall.message}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {overall.flagged.length > 0
                      ? `${overall.flagged.join(", ")} ${overall.flagged.length === 1 ? "needs" : "need"} attention`
                      : "All metrics within healthy ranges"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Rows */}
          <Card>
            <CardContent className="p-0">
              <SystemRow
                name="Sleep Quality"
                icon={Moon}
                days={sleepDays}
                expandedChart={<ScoreChart title="Sleep Score — 30 Day Trend" data={sleepDays} dataKey="sleep" color="#6366f1" />}
              />
              <SystemRow
                name="Recovery"
                icon={Zap}
                days={readinessDays}
                expandedChart={<ScoreChart title="Readiness Score — 30 Day Trend" data={readinessDays} dataKey="readiness" color="#10b981" />}
              />
              <SystemRow
                name="Activity"
                icon={Activity}
                days={activityDays}
                expandedChart={<ScoreChart title="Activity Score — 30 Day Trend" data={activityDays} dataKey="activity" color="#f97316" />}
              />
              <SystemRow
                name="HRV"
                icon={Brain}
                days={hrvDays}
                mode="hrv"
                expandedChart={<ScoreChart title="HRV (RMSSD) — 30 Day Trend" data={hrvDays} dataKey="hrv" color="#8b5cf6" domain={[0, 100]} />}
              />
              <SystemRow
                name="Resting HR"
                icon={Heart}
                days={hrDays}
                mode="hr"
                expandedChart={<ScoreChart title="Resting Heart Rate — 30 Day Trend" data={hrDays} dataKey="hr" color="#ef4444" domain={[40, 100]} />}
              />
            </CardContent>
          </Card>

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <ScoreCard
              title="Sleep Score"
              icon={Moon}
              score={oura.sleep.at(-1)?.score ?? null}
              trend={sleepTrend}
              color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
              subtitle="Last night"
            />
            <ScoreCard
              title="Readiness"
              icon={Zap}
              score={oura.readiness.at(-1)?.score ?? null}
              trend={readinessTrend}
              color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              subtitle="Recovery level"
            />
            <ScoreCard
              title="Activity"
              icon={Activity}
              score={oura.activity.at(-1)?.score ?? null}
              trend={activityTrend}
              color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
              subtitle="Movement goal"
            />
            <ScoreCard
              title="HRV"
              icon={Brain}
              score={latestHrv}
              trend={hrvTrend}
              color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
              subtitle="RMSSD average"
              unit="ms"
            />
            <ScoreCard
              title="Resting HR"
              icon={Heart}
              score={latestHr ? Math.round(latestHr) : null}
              trend={hrTrend}
              color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
              subtitle="Lowest overnight"
              unit="bpm"
            />
            <ScoreCard
              title="SpO2"
              icon={Wind}
              score={(() => {
                const vals = Array.from(spo2Map.values()).filter((v): v is number => v !== null);
                return vals.length > 0 ? Math.round(vals.at(-1)!) : null;
              })()}
              trend={null}
              color="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
              subtitle="Blood oxygen"
              unit="%"
            />
          </div>

          {/* Sleep Detail Card (latest night) */}
          {(() => {
            // Prefer today's session; fall back to most recent
            const today = new Date().toISOString().slice(0, 10);
            const todaySession = oura.sleepSessions?.find((s: { date: string }) => s.date === today);
            const latestSession = todaySession || oura.sleepSessions?.at(-1);
            if (!latestSession) return null;
            const s = latestSession.data;
            const isStale = latestSession.date !== today && oura.sleep?.some((sl: { date: string }) => sl.date === today);
            // Also grab stress/resilience for this date
            const dayStress = stressMap.get(latestSession.date);
            const dayResilience = resilienceMap.get(latestSession.date);
            const daySpo2 = spo2Map.get(latestSession.date);
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bed className="h-4 w-4" />
                    {isStale ? "Previous Night\u2019s Sleep" : "Last Night\u2019s Sleep"}
                    <span className="text-xs text-muted-foreground font-normal ml-auto">
                      {new Date(latestSession.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </span>
                  </CardTitle>
                  {isStale && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last night&apos;s detailed session data hasn&apos;t synced from Oura yet. Score: {oura.sleep.find((sl: { date: string }) => sl.date === today)?.score ?? "--"}/100
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Sleep</div>
                      <div className="text-sm font-medium">{formatDuration(s.total_sleep_duration as number | null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Deep</div>
                      <div className="text-sm font-medium">{formatDuration(s.deep_sleep_duration as number | null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">REM</div>
                      <div className="text-sm font-medium">{formatDuration(s.rem_sleep_duration as number | null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Light</div>
                      <div className="text-sm font-medium">{formatDuration(s.light_sleep_duration as number | null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Bedtime</div>
                      <div className="text-sm font-medium">{formatTime(s.bedtime_start as string | null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Wake</div>
                      <div className="text-sm font-medium">{formatTime(s.bedtime_end as string | null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Efficiency</div>
                      <div className="text-sm font-medium">{s.efficiency != null ? `${s.efficiency}%` : "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Awake</div>
                      <div className="text-sm font-medium">{formatDuration(s.awake_time as number | null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Latency</div>
                      <div className="text-sm font-medium">{formatDuration(s.latency as number | null)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Temp Delta</div>
                      <div className="text-sm font-medium">
                        {(() => {
                          const readiness = s.readiness as { temperature_deviation?: number } | null;
                          const td = readiness?.temperature_deviation;
                          if (td == null) return "--";
                          return `${td > 0 ? "+" : ""}${td.toFixed(2)}\u00b0C`;
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Avg HRV</div>
                      <div className="text-sm font-medium">{s.average_hrv != null ? `${Math.round(s.average_hrv as number)} ms` : "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Lowest HR</div>
                      <div className="text-sm font-medium">{s.lowest_heart_rate != null ? `${s.lowest_heart_rate} bpm` : "--"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Avg Breath</div>
                      <div className="text-sm font-medium">{s.average_breath != null ? `${s.average_breath} rpm` : "--"}</div>
                    </div>
                    {daySpo2 != null && (
                      <div>
                        <div className="text-xs text-muted-foreground">SpO2</div>
                        <div className="text-sm font-medium">{Math.round(daySpo2)}%</div>
                      </div>
                    )}
                    {dayStress && (
                      <div>
                        <div className="text-xs text-muted-foreground">Stress</div>
                        <div className="text-sm font-medium"><StressBadge summary={dayStress} /></div>
                      </div>
                    )}
                    {dayResilience && (
                      <div>
                        <div className="text-xs text-muted-foreground">Resilience</div>
                        <div className="text-sm font-medium"><ResilienceBadge level={dayResilience} /></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Recent Data Table */}
          {oura.sleep.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4 font-medium">Date</th>
                        <th className="text-right py-2 px-3 font-medium">Sleep</th>
                        <th className="text-right py-2 px-3 font-medium">Readiness</th>
                        <th className="text-right py-2 px-3 font-medium">Activity</th>
                        <th className="text-right py-2 px-3 font-medium">HRV</th>
                        <th className="text-right py-2 px-3 font-medium">HR</th>
                        <th className="text-right py-2 px-3 font-medium">SpO2</th>
                        <th className="text-right py-2 pl-3 font-medium">Stress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Collect all unique dates
                        const allDates = new Set<string>();
                        oura.sleep.forEach((d) => allDates.add(d.date));
                        oura.readiness.forEach((d) => allDates.add(d.date));
                        oura.activity.forEach((d) => allDates.add(d.date));

                        const sleepMap = new Map(oura.sleep.map((d) => [d.date, d]));
                        const readinessMap = new Map(oura.readiness.map((d) => [d.date, d]));
                        const activityMap = new Map(oura.activity.map((d) => [d.date, d]));
                        const hrMap = new Map(hrDays.map((d) => [d.date, d.value]));

                        return Array.from(allDates)
                          .sort((a, b) => b.localeCompare(a))
                          .slice(0, 14)
                          .map((date) => {
                            const sleep = sleepMap.get(date);
                            const readiness = readinessMap.get(date);
                            const activity = activityMap.get(date);
                            const hrv = sleep?.hrvAverage ? Math.round(sleep.hrvAverage) : null;
                            const hr = hrMap.get(date);
                            const spo2 = spo2Map.get(date);
                            const stress = stressMap.get(date);
                            return (
                              <tr key={date} className="border-b border-border/50">
                                <td className="py-2 pr-4 font-mono text-xs">
                                  {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className="text-right py-2 px-3 tabular-nums">
                                  <ScoreBadge score={sleep?.score ?? null} />
                                </td>
                                <td className="text-right py-2 px-3 tabular-nums">
                                  <ScoreBadge score={readiness?.score ?? null} />
                                </td>
                                <td className="text-right py-2 px-3 tabular-nums">
                                  <ScoreBadge score={activity?.score ?? null} />
                                </td>
                                <td className="text-right py-2 px-3 tabular-nums text-muted-foreground">
                                  {hrv !== null ? <span className={statusConfig[getHrvStatus(hrv)].color}>{hrv}</span> : "--"}
                                </td>
                                <td className="text-right py-2 px-3 tabular-nums text-muted-foreground">
                                  {hr != null ? Math.round(hr) : "--"}
                                </td>
                                <td className="text-right py-2 px-3 tabular-nums text-muted-foreground">
                                  {spo2 != null ? `${Math.round(spo2)}%` : "--"}
                                </td>
                                <td className="text-right py-2 pl-3">
                                  <StressBadge summary={stress ?? null} />
                                </td>
                              </tr>
                            );
                          });
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
