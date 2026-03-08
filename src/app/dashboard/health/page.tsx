"use client";

import { useEffect, useState, useCallback } from "react";
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

interface HealthPageData {
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

function ScoreChart({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: Array<{ date: string; value: number | null }>;
  dataKey: string;
  color: string;
}) {
  const chartData = data.filter((d) => d.value !== null).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    [dataKey]: d.value,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            No data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
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
      </CardContent>
    </Card>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthPageData | null>(null);
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
      toast.error("Failed to load health data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle OAuth callback query params
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

  // Chat context
  const latestSleep = data?.oura?.sleep?.at(-1)?.score;
  const latestReadiness = data?.oura?.readiness?.at(-1)?.score;
  const latestActivity = data?.oura?.activity?.at(-1)?.score;
  useChatContext(
    "Health",
    data?.status?.connected
      ? `Oura Ring connected. Latest scores — Sleep: ${latestSleep ?? "N/A"}, Readiness: ${latestReadiness ?? "N/A"}, Activity: ${latestActivity ?? "N/A"}. ${data?.oura?.sleep?.length || 0} days of sleep data available.`
      : "Oura Ring not connected."
  );

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
        body: JSON.stringify({ action: "sync", daysBack: 30 }),
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

  // Latest HRV
  const latestHrv = oura?.sleep?.filter((d) => d.hrvAverage).at(-1)?.hrvAverage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Health</h1>
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
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Health Data</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Connect your Oura Ring to track sleep quality, readiness, activity scores,
              and heart rate variability. Data syncs automatically every 6 hours.
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

      {/* Connected — Score Cards */}
      {connected && oura && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ScoreCard
              title="Sleep Score"
              icon={Moon}
              score={oura.sleep.at(-1)?.score ?? null}
              trend={sleepTrend}
              color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
              subtitle={oura.sleep.at(-1)?.date ? `Last night` : undefined}
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
              score={latestHrv ? Math.round(latestHrv) : null}
              trend={null}
              color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
              subtitle="Average BPM"
            />
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScoreChart
              title="Sleep Score (30d)"
              data={oura.sleep.map((d) => ({ date: d.date, value: d.score }))}
              dataKey="sleep"
              color="#6366f1"
            />
            <ScoreChart
              title="Readiness Score (30d)"
              data={oura.readiness.map((d) => ({ date: d.date, value: d.score }))}
              dataKey="readiness"
              color="#10b981"
            />
            <ScoreChart
              title="Activity Score (30d)"
              data={oura.activity.map((d) => ({ date: d.date, value: d.score }))}
              dataKey="activity"
              color="#f97316"
            />
            <ScoreChart
              title="Resting Heart Rate (30d)"
              data={oura.sleep.map((d) => ({ date: d.date, value: d.hrvAverage ? Math.round(d.hrvAverage) : null }))}
              dataKey="hr"
              color="#ef4444"
            />
          </div>

          {/* Sleep Detail Table */}
          {oura.sleep.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Sleep Data</CardTitle>
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
