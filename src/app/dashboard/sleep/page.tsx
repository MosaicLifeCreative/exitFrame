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
  AlertTriangle,
  AlertCircle,
  XCircle,
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

interface OuraData {
  sleep: OuraDay[];
  readiness: OuraDay[];
  activity: OuraDay[];
}

interface SleepPageData {
  status: OuraStatus;
  oura: OuraData | null;
}

function ScoreCard({
  title,
  icon: Icon,
  score,
  trend,
  color,
  subtitle,
}: {
  title: string;
  icon: React.ElementType;
  score: number | null;
  trend: number | null;
  color: string;
  subtitle?: string;
}) {
  const scoreColor =
    score === null
      ? "text-muted-foreground"
      : score >= 85
        ? "text-emerald-500"
        : score >= 70
          ? "text-amber-500"
          : "text-red-500";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{title}</div>
              <div className={`text-2xl font-bold tabular-nums ${scoreColor}`}>
                {score ?? "--"}
              </div>
            </div>
          </div>
          {trend !== null && (
            <div className={`flex items-center gap-1 text-xs ${
              trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"
            }`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {trend > 0 ? "+" : ""}{trend}
            </div>
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-2">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}

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

const statusConfig: Record<SystemStatus, { label: string; color: string; bg: string; icon: React.ElementType; barColor: string }> = {
  optimal: { label: "Optimal", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", icon: CheckCircle2, barColor: "#10b981" },
  good: { label: "Good", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", icon: AlertTriangle, barColor: "#f59e0b" },
  attention: { label: "Pay Attention", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500", icon: AlertCircle, barColor: "#f97316" },
  critical: { label: "Critical", color: "text-red-600 dark:text-red-400", bg: "bg-red-500", icon: XCircle, barColor: "#ef4444" },
};

function getOverallStatus(statuses: SystemStatus[]): { status: SystemStatus; message: string } {
  if (statuses.every((s) => s === "optimal")) return { status: "optimal", message: "All Systems Optimal" };
  if (statuses.some((s) => s === "critical")) return { status: "critical", message: "Needs Attention — Recovery Impaired" };
  if (statuses.some((s) => s === "attention")) return { status: "attention", message: "Degraded Performance" };
  return { status: "good", message: "All Systems Operational" };
}

function getBarColor(score: number | null, isHr?: boolean): string {
  if (score === null) return "#374151"; // gray-700
  if (isHr) return statusConfig[getHrStatus(score)].barColor;
  return statusConfig[getScoreStatus(score)].barColor;
}

function UptimeBar({
  days,
  isHr,
}: {
  days: Array<{ date: string; value: number | null }>;
  isHr?: boolean;
}) {
  const last30 = days.slice(-30);

  return (
    <div className="flex items-center gap-[2px] h-8">
      {last30.map((day) => (
        <div
          key={day.date}
          className="flex-1 h-full rounded-[2px] min-w-[4px] transition-opacity hover:opacity-80 relative group"
          style={{ backgroundColor: getBarColor(day.value, isHr) }}
        >
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-md">
            <div className="font-medium">
              {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
            <div className="text-muted-foreground">
              {day.value !== null ? (isHr ? `${Math.round(day.value)} bpm` : day.value) : "No data"}
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
  isHr,
  expandedChart,
  onToggle,
}: {
  name: string;
  icon: React.ElementType;
  days: Array<{ date: string; value: number | null }>;
  isHr?: boolean;
  expandedChart: React.ReactNode;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const latestScore = days.at(-1)?.value ?? null;
  const status = isHr ? getHrStatus(latestScore) : getScoreStatus(latestScore);
  const config = statusConfig[status];

  // Compute trend
  const trend = useMemo(() => {
    const validDays = days.filter((d) => d.value !== null);
    if (validDays.length < 2) return null;
    const latest = validDays.at(-1)?.value;
    if (latest === null || latest === undefined) return null;
    const prev7 = validDays.slice(-8, -1);
    if (prev7.length === 0) return null;
    const avg = prev7.reduce((sum, d) => sum + (d.value ?? 0), 0) / prev7.length;
    return Math.round(latest - avg);
  }, [days]);

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggle();
  };

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-4 py-4 px-4 hover:bg-muted/30 transition-colors text-left"
      >
        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="w-32 shrink-0">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {latestScore !== null ? (isHr ? `${Math.round(latestScore)} bpm` : latestScore) : "--"}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <UptimeBar days={days} isHr={isHr} />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {trend !== null && (
            <div className={cn("flex items-center gap-0.5 text-xs tabular-nums", {
              "text-emerald-500": isHr ? trend < 0 : trend > 0,
              "text-red-500": isHr ? trend > 0 : trend < 0,
              "text-muted-foreground": trend === 0,
            })}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {trend > 0 ? "+" : ""}{trend}
            </div>
          )}
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
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={domain || [0, 100]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

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

  const chatContext = useMemo(() => {
    const oura = data?.oura;
    const connected = data?.status?.connected;
    if (!connected || !oura) return "Oura Ring not connected.";

    function computeTrendLocal(days: OuraDay[]): number | null {
      if (!days || days.length < 2) return null;
      const latest = days.at(-1)?.score;
      if (latest === null || latest === undefined) return null;
      const prev7 = days.slice(-8, -1).filter((d) => d.score !== null);
      if (prev7.length === 0) return null;
      const avg = prev7.reduce((sum, d) => sum + (d.score ?? 0), 0) / prev7.length;
      return Math.round(latest - avg);
    }

    const st = computeTrendLocal(oura.sleep);
    const rt = computeTrendLocal(oura.readiness);
    const at = computeTrendLocal(oura.activity);

    const recent7Sleep = oura.sleep.slice(-7);
    const recent7Readiness = oura.readiness.slice(-7);
    const recent7Activity = oura.activity.slice(-7);

    const sleepScores = recent7Sleep.map((d) => `${d.date}: ${d.score ?? "N/A"}`).join(", ");
    const readinessScores = recent7Readiness.map((d) => `${d.date}: ${d.score ?? "N/A"}`).join(", ");
    const activityScores = recent7Activity.map((d) => `${d.date}: ${d.score ?? "N/A"}`).join(", ");
    const hrvValues = recent7Sleep.filter((d) => d.hrvAverage).map((d) => `${d.date}: ${Math.round(d.hrvAverage!)} bpm`).join(", ");

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

    const fmt = (t: number | null) => t !== null ? (t > 0 ? "+" : "") + t : "N/A";

    return [
      `Oura Ring connected. ${oura.sleep.length} days of data.`,
      `Last 7 days sleep scores: ${sleepScores}`,
      `Last 7 days readiness: ${readinessScores}`,
      `Last 7 days activity: ${activityScores}`,
      hrvValues ? `Resting HR (avg BPM): ${hrvValues}` : "",
      contributors,
      `Trends vs 7-day avg — Sleep: ${fmt(st)}, Readiness: ${fmt(rt)}, Activity: ${fmt(at)}`,
    ].filter(Boolean).join("\n");
  }, [data]);
  useChatContext("Sleep", chatContext);

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
        toast.success(`Synced: ${s.sleep} sleep, ${s.readiness} readiness, ${s.activity} activity days`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connected = data?.status?.connected ?? false;
  const oura = data?.oura;

  // Prepare system data
  const sleepDays = (oura?.sleep || []).map((d) => ({ date: d.date, value: d.score }));
  const readinessDays = (oura?.readiness || []).map((d) => ({ date: d.date, value: d.score }));
  const activityDays = (oura?.activity || []).map((d) => ({ date: d.date, value: d.score }));
  const hrDays = (oura?.sleep || []).map((d) => ({ date: d.date, value: d.hrvAverage ? Math.round(d.hrvAverage) : null }));

  // Compute trends (today vs 7-day average)
  function computeTrend(days: OuraDay[]): number | null {
    if (!days || days.length < 2) return null;
    const latest = days.at(-1)?.score;
    if (latest === null || latest === undefined) return null;
    const prev7 = days.slice(-8, -1).filter((d) => d.score !== null);
    if (prev7.length === 0) return null;
    const avg = prev7.reduce((sum, d) => sum + (d.score ?? 0), 0) / prev7.length;
    return Math.round(latest - avg);
  }

  const sleepTrend = oura ? computeTrend(oura.sleep) : null;
  const readinessTrend = oura ? computeTrend(oura.readiness) : null;
  const activityTrend = oura ? computeTrend(oura.activity) : null;
  const latestHrvValue = oura?.sleep?.filter((d) => d.hrvAverage).at(-1)?.hrvAverage;

  // Current statuses for overall banner
  const latestSleep = sleepDays.at(-1)?.value ?? null;
  const latestReadiness = readinessDays.at(-1)?.value ?? null;
  const latestActivity = activityDays.at(-1)?.value ?? null;
  const latestHr = hrDays.at(-1)?.value ?? null;

  const systemStatuses: SystemStatus[] = [
    getScoreStatus(latestSleep),
    getScoreStatus(latestReadiness),
    getScoreStatus(latestActivity),
    getHrStatus(latestHr),
  ];
  const overall = getOverallStatus(systemStatuses);
  const overallConfig = statusConfig[overall.status];
  const OverallIcon = overallConfig.icon;

  // Uptime percentage (days with score >= 70 out of last 30)
  const uptimeDays = sleepDays.slice(-30).filter((d) => d.value !== null && d.value >= 70).length;
  const uptimeTotal = sleepDays.slice(-30).filter((d) => d.value !== null).length;
  const uptimePct = uptimeTotal > 0 ? Math.round((uptimeDays / uptimeTotal) * 100) : null;

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

      {/* Not Connected State */}
      {!connected && (
        <Card>
          <CardContent className="py-16 text-center">
            <Moon className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Sleep Data</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Connect your Oura Ring to track sleep quality, readiness, activity scores,
              and heart rate variability. Data syncs automatically daily.
            </p>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Connect Oura Ring
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
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

      {/* Body Status Indicator */}
      {connected && oura && (
        <>
          {/* Overall Status Banner */}
          <Card className={cn("border-l-4", {
            "border-l-emerald-500": overall.status === "optimal",
            "border-l-amber-500": overall.status === "good",
            "border-l-orange-500": overall.status === "attention",
            "border-l-red-500": overall.status === "critical",
          })}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <OverallIcon className={cn("h-5 w-5", overallConfig.color)} />
                  <div>
                    <div className={cn("text-sm font-semibold", overallConfig.color)}>
                      {overall.message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {uptimePct !== null ? `${uptimePct}% optimal over the past 30 days` : "Collecting data..."}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Uptime over the past 30 days
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
                onToggle={() => {}}
                expandedChart={
                  <ScoreChart
                    title="Sleep Score — 30 Day Trend"
                    data={sleepDays}
                    dataKey="sleep"
                    color="#6366f1"
                  />
                }
              />
              <SystemRow
                name="Recovery"
                icon={Zap}
                days={readinessDays}
                onToggle={() => {}}
                expandedChart={
                  <ScoreChart
                    title="Readiness Score — 30 Day Trend"
                    data={readinessDays}
                    dataKey="readiness"
                    color="#10b981"
                  />
                }
              />
              <SystemRow
                name="Activity"
                icon={Activity}
                days={activityDays}
                onToggle={() => {}}
                expandedChart={
                  <ScoreChart
                    title="Activity Score — 30 Day Trend"
                    data={activityDays}
                    dataKey="activity"
                    color="#f97316"
                  />
                }
              />
              <SystemRow
                name="Cardiovascular"
                icon={Heart}
                days={hrDays}
                isHr
                onToggle={() => {}}
                expandedChart={
                  <ScoreChart
                    title="Resting Heart Rate — 30 Day Trend"
                    data={hrDays}
                    dataKey="hr"
                    color="#ef4444"
                    domain={[40, 100]}
                  />
                }
              />
            </CardContent>
          </Card>

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ScoreCard
              title="Sleep Score"
              icon={Moon}
              score={oura.sleep.at(-1)?.score ?? null}
              trend={sleepTrend}
              color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
              subtitle={oura.sleep.at(-1)?.date ? "Last night" : undefined}
            />
            <ScoreCard
              title="Readiness"
              icon={Zap}
              score={oura.readiness.at(-1)?.score ?? null}
              trend={readinessTrend}
              color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              subtitle="How recovered you are"
            />
            <ScoreCard
              title="Activity"
              icon={Activity}
              score={oura.activity.at(-1)?.score ?? null}
              trend={activityTrend}
              color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
              subtitle="Daily movement goal"
            />
            <ScoreCard
              title="Resting HR"
              icon={Heart}
              score={latestHrvValue ? Math.round(latestHrvValue) : null}
              trend={null}
              color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
              subtitle="Average BPM"
            />
          </div>

          {/* Detail Table */}
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
                        <th className="text-right py-2 px-4 font-medium">Sleep</th>
                        <th className="text-right py-2 px-4 font-medium">Readiness</th>
                        <th className="text-right py-2 px-4 font-medium">Activity</th>
                        <th className="text-right py-2 pl-4 font-medium">HR (avg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set([
                        ...oura.sleep.map((d) => d.date),
                        ...oura.readiness.map((d) => d.date),
                        ...oura.activity.map((d) => d.date),
                      ]))
                        .sort((a, b) => b.localeCompare(a))
                        .slice(0, 14)
                        .map((date) => {
                          const sleep = oura.sleep.find((d) => d.date === date);
                          const readiness = oura.readiness.find((d) => d.date === date);
                          const activity = oura.activity.find((d) => d.date === date);
                          return (
                            <tr key={date} className="border-b border-border/50">
                              <td className="py-2 pr-4 font-mono text-xs">
                                {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="text-right py-2 px-4 tabular-nums">
                                <ScoreBadge score={sleep?.score ?? null} />
                              </td>
                              <td className="text-right py-2 px-4 tabular-nums">
                                <ScoreBadge score={readiness?.score ?? null} />
                              </td>
                              <td className="text-right py-2 px-4 tabular-nums">
                                <ScoreBadge score={activity?.score ?? null} />
                              </td>
                              <td className="text-right py-2 pl-4 tabular-nums text-muted-foreground">
                                {sleep?.hrvAverage ? Math.round(sleep.hrvAverage) : "--"}
                              </td>
                            </tr>
                          );
                        })}
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
