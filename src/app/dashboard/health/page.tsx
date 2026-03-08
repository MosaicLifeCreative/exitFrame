"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useChatContext } from "@/hooks/useChatContext";
import { useToolRefresh } from "@/hooks/useToolRefresh";
import {
  Moon,
  Dumbbell,
  Pill,
  Plus,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Thermometer,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────

interface OuraStatus {
  connected: boolean;
  lastSync?: string;
}

interface OuraDaySummary {
  date: string;
  score: number | null;
}

interface OuraData {
  status: OuraStatus;
  oura: {
    sleep: OuraDaySummary[];
    readiness: OuraDaySummary[];
    activity: OuraDaySummary[];
  } | null;
}

interface SymptomEntry {
  id: string;
  date: string;
  symptoms: string[];
  severity: number;
  notes: string | null;
  resolved: boolean;
  resolvedDate: string | null;
}

interface SupplementEntry {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string;
  category: string | null;
  isActive: boolean;
}

// ─── Page ────────────────────────────────────────────────

export default function HealthOverviewPage() {
  const [ouraData, setOuraData] = useState<OuraData | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [supplements, setSupplements] = useState<SupplementEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ouraRes, symptomsRes, supplementsRes] = await Promise.all([
        fetch("/api/oura").then((r) => r.json()),
        fetch("/api/health/symptoms").then((r) => r.json()),
        fetch("/api/health/supplements").then((r) => r.json()),
      ]);
      if (ouraRes.data) setOuraData(ouraRes.data);
      if (symptomsRes.data) setSymptoms(symptomsRes.data);
      if (supplementsRes.data) setSupplements(supplementsRes.data);
    } catch (err) {
      console.error("Health overview fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useToolRefresh(fetchData);

  // Chat context
  const chatContext = useMemo(() => {
    const parts: string[] = ["Page: Health Overview"];

    if (symptoms.length > 0) {
      const active = symptoms.filter((s) => !s.resolved);
      parts.push(`\nActive symptoms: ${active.length}`);
      for (const s of active.slice(0, 5)) {
        parts.push(`  ${s.date}: ${s.symptoms.join(", ")} (severity ${s.severity})`);
      }
    }

    if (supplements.length > 0) {
      parts.push(`\nCurrent supplements (${supplements.length}):`);
      for (const s of supplements) {
        parts.push(`  ${s.name} ${s.dosage || ""} (${s.frequency})`);
      }
    }

    return parts.join("\n");
  }, [symptoms, supplements]);

  useChatContext("Health", chatContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const latestSleep = ouraData?.oura?.sleep?.at(-1);
  const latestReadiness = ouraData?.oura?.readiness?.at(-1);
  const latestActivity = ouraData?.oura?.activity?.at(-1);
  const activeSymptoms = symptoms.filter((s) => !s.resolved);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Health</h1>
        <p className="text-sm text-muted-foreground">Overview of your health, symptoms, and supplements</p>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/health/sleep">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <Moon className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Sleep</div>
                    <div className="text-xs text-muted-foreground">
                      {latestSleep?.score != null
                        ? `Score: ${latestSleep.score}`
                        : ouraData?.status.connected ? "No data today" : "Not connected"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/health/fitness">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Dumbbell className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Fitness</div>
                    <div className="text-xs text-muted-foreground">
                      {latestActivity?.score != null
                        ? `Activity: ${latestActivity.score}`
                        : "View workouts"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/health/supplements">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Pill className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Supplements</div>
                    <div className="text-xs text-muted-foreground">
                      {supplements.length > 0
                        ? `${supplements.length} in your stack`
                        : "No supplements tracked"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Active Symptoms */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Symptoms
            </CardTitle>
            <div className="flex items-center gap-2">
              {activeSymptoms.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {activeSymptoms.length} active
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">Log via chat</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeSymptoms.length === 0 && symptoms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No symptoms logged</p>
              <p className="text-xs mt-1">Tell Claude how you&apos;re feeling to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {symptoms.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    entry.resolved ? "border-border/50 opacity-60" : "border-border"
                  )}
                >
                  <div className="mt-0.5">
                    {entry.resolved ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className={cn(
                        "h-4 w-4",
                        entry.severity >= 4 ? "text-red-500" :
                        entry.severity >= 3 ? "text-amber-500" : "text-muted-foreground"
                      )} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.symptoms.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s.replace(/-/g, " ")}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <SeverityDots severity={entry.severity} />
                      {entry.resolved && entry.resolvedDate && (
                        <span className="text-xs text-emerald-500">
                          Resolved{" "}
                          {new Date(entry.resolvedDate + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplement Stack */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Current Supplements
            </CardTitle>
            <Link href="/dashboard/health/supplements">
              <Button variant="ghost" size="sm" className="text-xs h-7">
                <Plus className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {supplements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Pill className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No supplements tracked</p>
              <p className="text-xs mt-1">Tell Claude what you&apos;re taking to start tracking</p>
            </div>
          ) : (
            <div className="space-y-2">
              {supplements.map((sup) => (
                <div
                  key={sup.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Pill className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{sup.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[sup.dosage, sup.frequency !== "daily" ? sup.frequency : null]
                          .filter(Boolean)
                          .join(" · ") || "No dosage set"}
                      </div>
                    </div>
                  </div>
                  {sup.category && (
                    <Badge variant="outline" className="text-xs">
                      {sup.category}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Oura Quick Stats */}
      {ouraData?.status.connected && ouraData.oura && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s Oura Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <ScoreStat label="Sleep" score={latestSleep?.score ?? null} color="text-indigo-500" />
              <ScoreStat label="Readiness" score={latestReadiness?.score ?? null} color="text-emerald-500" />
              <ScoreStat label="Activity" score={latestActivity?.score ?? null} color="text-amber-500" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SeverityDots({ severity }: { severity: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < severity
              ? severity >= 4 ? "bg-red-500" : severity >= 3 ? "bg-amber-500" : "bg-emerald-500"
              : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

function ScoreStat({ label, score, color }: { label: string; score: number | null; color: string }) {
  return (
    <div className="text-center">
      <div className={cn("text-2xl font-bold tabular-nums", score !== null ? color : "text-muted-foreground")}>
        {score ?? "--"}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
