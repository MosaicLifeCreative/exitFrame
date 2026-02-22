"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Server,
  Shield,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ServiceCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  details?: string;
}

interface TableCount {
  table: string;
  count: number;
}

interface EnvInfo {
  nodeVersion: string;
  nextjsEnv: string;
  vercelRegion: string;
  databaseUrlSet: boolean;
  directUrlSet: boolean;
  redisUrlSet: boolean;
  anthropicKeySet: boolean;
}

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: ServiceCheck[];
  tableCounts: TableCount[];
  envInfo: EnvInfo;
}

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

function StatusIcon({ status }: { status: "healthy" | "degraded" | "down" }) {
  switch (status) {
    case "healthy":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "degraded":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "down":
      return <XCircle className="h-5 w-5 text-red-500" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    degraded: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    unhealthy: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    down: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <Badge variant="outline" className={`uppercase text-xs ${colors[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

const serviceIcons: Record<string, React.ElementType> = {
  "Supabase Database": Database,
  "Upstash Redis": Server,
  "Supabase Auth": Shield,
};

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/system-health");
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
        setLastRefresh(new Date());
      } else {
        toast.error("Failed to fetch system health");
      }
    } catch {
      toast.error("Failed to connect to health API");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchHealth(), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        Failed to load system health data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-refreshes every 30 seconds
            {lastRefresh && (
              <> &middot; Last updated {lastRefresh.toLocaleTimeString()}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={data.status} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.services.map((service) => {
          const Icon = serviceIcons[service.name] ?? Server;
          return (
            <Card key={service.name}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      service.status === "healthy"
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : service.status === "degraded"
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : "bg-red-100 dark:bg-red-900/30"
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        service.status === "healthy"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : service.status === "degraded"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{service.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {service.details}
                      </div>
                    </div>
                  </div>
                  <StatusIcon status={service.status} />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Response time</span>
                  <span className={`font-mono font-medium ${
                    service.responseTime < 0
                      ? "text-red-500"
                      : service.responseTime < 200
                        ? "text-emerald-600 dark:text-emerald-400"
                        : service.responseTime < 1000
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-500"
                  }`}>
                    {service.responseTime < 0 ? "N/A" : `${service.responseTime}ms`}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table Row Counts */}
      {data.tableCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Database Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.tableCounts.map((tc) => (
                <div
                  key={tc.table}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <span className="text-sm font-mono">{tc.table}</span>
                  <span className={`text-sm font-semibold tabular-nums ${
                    tc.count < 0 ? "text-red-500" : "text-foreground"
                  }`}>
                    {tc.count < 0 ? "ERR" : tc.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Node.js</span>
              <span className="text-sm font-mono">{data.envInfo.nodeVersion}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Environment</span>
              <span className="text-sm font-mono">{data.envInfo.nextjsEnv}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Region</span>
              <span className="text-sm font-mono">{data.envInfo.vercelRegion}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Timestamp</span>
              <span className="text-sm font-mono">
                {new Date(data.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Environment Variables</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "DATABASE_URL", set: data.envInfo.databaseUrlSet },
                { label: "DIRECT_URL", set: data.envInfo.directUrlSet },
                { label: "REDIS_URL", set: data.envInfo.redisUrlSet },
                { label: "ANTHROPIC_KEY", set: data.envInfo.anthropicKeySet },
              ].map((env) => (
                <div
                  key={env.label}
                  className={`flex items-center gap-2 p-2 rounded text-xs font-mono ${
                    env.set
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {env.set ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 shrink-0" />
                  )}
                  {env.label}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
