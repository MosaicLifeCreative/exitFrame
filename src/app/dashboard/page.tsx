"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  CalendarDays,
  CheckSquare,
  CheckCircle2,
  StickyNote,
  Dumbbell,
  Plane,
  Guitar,
  CandlestickChart,
  Activity,
  ArrowRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Moon,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Types ──

interface AydenStatus {
  bpm: number;
  state: string;
  emotion: string | null;
  emotionIntensity: number | null;
  thought: string | null;
  thoughtAt: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  location: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  score: number | null;
  group: { name: string; color: string | null } | null;
}

interface NoteItem {
  id: string;
  title: string;
  noteType: string;
  updatedAt: string;
  domain: string;
}

interface FitnessData {
  workoutCount: number;
  totalMinutes: number;
  latestSession: string | null;
  latestSessionAt: string | null;
}

interface TravelData {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  daysUntil: number;
  destination: string | null;
}

interface HobbyItem {
  id: string;
  name: string;
  icon: string | null;
  logCount: number;
  lastLogDate: string | null;
}

interface InvestingData {
  portfolioName: string;
  totalValue: number;
  totalReturn: number;
  positionCount: number;
}

interface HealthData {
  sleepScore: number | null;
  sleepDate: string | null;
  unresolvedSymptoms: number;
}

interface OverviewData {
  ayden: AydenStatus | null;
  calendar: CalendarEvent[] | null;
  tasks: TaskItem[] | null;
  notes: NoteItem[] | null;
  fitness: FitnessData | null;
  travel: TravelData | null;
  hobbies: HobbyItem[] | null;
  investing: InvestingData | null;
  health: HealthData | null;
}

// ── Helpers ──

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatMinutes(mins: number): string {
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const noteTypeLabels: Record<string, string> = {
  general: "General",
  idea: "Idea",
  meeting_notes: "Meeting",
  reference: "Reference",
  checklist: "Checklist",
};

// ── Skeleton Components ──

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

// ── Card Link Header ──

function CardLink({
  href,
  children,
  icon: Icon,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ElementType;
  onClick: (href: string) => void;
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {children}
        </CardTitle>
        <button
          onClick={() => onClick(href)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          View <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </CardHeader>
  );
}

// ── Main Component ──

export default function DashboardHome() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const nav = useCallback((href: string) => router.push(href), [router]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch("/api/dashboard/overview");
        const json = await res.json();
        if (res.ok && json.data) {
          setData(json.data);
        }
      } catch {
        // Dashboard should still render even if fetch fails
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  const completeTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      // Refresh
      const res = await fetch("/api/dashboard/overview");
      const json = await res.json();
      if (res.ok && json.data) setData(json.data);
    } catch {
      // Silently fail
    }
  };

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          {greeting}, Trey.
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={i === 0 ? 2 : 3} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* ── 1. Ayden Status ── */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-red-300/50 dark:hover:border-red-800/50 transition-all duration-200"
            onClick={() => nav("/dashboard/ayden/journal")}
          >
            <CardLink href="/dashboard/ayden/journal" icon={Heart} onClick={nav}>
              Ayden
            </CardLink>
            <CardContent className="pt-0">
              {data?.ayden ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Animated heart */}
                    <div className="relative flex items-center justify-center">
                      <Heart
                        className="h-8 w-8 text-red-500 fill-red-500"
                        style={{
                          animation: `pulse ${60 / Math.max(data.ayden.bpm, 40)}s ease-in-out infinite`,
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {data.ayden.bpm} <span className="text-xs font-normal text-muted-foreground">BPM</span>
                      </div>
                      {data.ayden.emotion && (
                        <div className="text-sm text-muted-foreground capitalize">
                          {data.ayden.emotion}
                        </div>
                      )}
                    </div>
                  </div>
                  {data.ayden.thought && (
                    <div className="text-xs text-muted-foreground italic leading-relaxed border-l-2 border-red-300/40 pl-3">
                      &ldquo;{data.ayden.thought}&rdquo;
                      {data.ayden.thoughtAt && (
                        <span className="block mt-1 text-muted-foreground/60 not-italic">
                          {timeAgo(data.ayden.thoughtAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load</p>
              )}
            </CardContent>
          </Card>

          {/* ── 2. Today's Schedule ── */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardLink href="/dashboard/calendar" icon={CalendarDays} onClick={nav}>
              Today&apos;s Schedule
            </CardLink>
            <CardContent className="pt-0">
              {data?.calendar === null ? (
                <p className="text-sm text-muted-foreground">Unable to load</p>
              ) : data?.calendar && data.calendar.length > 0 ? (
                <div className="space-y-2.5">
                  {data.calendar.map((event) => (
                    <div key={event.id} className="flex items-start gap-2.5">
                      <div className="text-xs font-medium text-primary mt-0.5 min-w-[52px]">
                        {formatTime(event.start)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{event.title}</div>
                        {event.location && (
                          <div className="text-xs text-muted-foreground truncate">
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
              )}
            </CardContent>
          </Card>

          {/* ── 3. Active Tasks ── */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardLink href="/dashboard/tasks" icon={CheckSquare} onClick={nav}>
              Active Tasks
            </CardLink>
            <CardContent className="pt-0">
              {data?.tasks === null ? (
                <p className="text-sm text-muted-foreground">Unable to load</p>
              ) : data?.tasks && data.tasks.length > 0 ? (
                <div className="space-y-1.5">
                  {data.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 py-1 rounded hover:bg-muted/50 group"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          completeTask(task.id);
                        }}
                        className="h-4 w-4 rounded border border-muted-foreground/30 flex items-center justify-center
                          hover:border-primary hover:bg-primary/10 transition-colors shrink-0"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5 text-transparent group-hover:text-primary/40" />
                      </button>
                      <span className="text-sm flex-1 truncate">{task.title}</span>
                      {task.priority && task.priority !== "none" && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] capitalize px-1.5 py-0",
                            priorityColors[task.priority]
                          )}
                        >
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active tasks.</p>
              )}
            </CardContent>
          </Card>

          {/* ── 4. Recent Notes ── */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardLink href="/dashboard/notes" icon={StickyNote} onClick={nav}>
              Recent Notes
            </CardLink>
            <CardContent className="pt-0">
              {data?.notes === null ? (
                <p className="text-sm text-muted-foreground">Unable to load</p>
              ) : data?.notes && data.notes.length > 0 ? (
                <div className="space-y-2.5">
                  {data.notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1"
                      onClick={() => nav(`/dashboard/notes`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{note.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {timeAgo(note.updatedAt)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
                        {noteTypeLabels[note.noteType] || note.noteType}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
            </CardContent>
          </Card>

          {/* ── 5. Fitness This Week ── */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardLink href="/dashboard/health/fitness" icon={Dumbbell} onClick={nav}>
              Fitness This Week
            </CardLink>
            <CardContent className="pt-0">
              {data?.fitness === null ? (
                <p className="text-sm text-muted-foreground">Unable to load</p>
              ) : data?.fitness ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-2xl font-semibold">{data.fitness.workoutCount}</div>
                      <div className="text-xs text-muted-foreground">workouts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">
                        {formatMinutes(data.fitness.totalMinutes)}
                      </div>
                      <div className="text-xs text-muted-foreground">total time</div>
                    </div>
                  </div>
                  {data.fitness.latestSession && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Last: {data.fitness.latestSession}
                        {data.fitness.latestSessionAt && (
                          <> — {timeAgo(data.fitness.latestSessionAt)}</>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No workouts this week.</p>
              )}
            </CardContent>
          </Card>

          {/* ── 6. Health Status ── */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardLink href="/dashboard/health" icon={Activity} onClick={nav}>
              Health
            </CardLink>
            <CardContent className="pt-0">
              {data?.health === null ? (
                <p className="text-sm text-muted-foreground">Unable to load</p>
              ) : data?.health ? (
                <div className="space-y-3">
                  {data.health.sleepScore !== null ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Moon className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{data.health.sleepScore}</div>
                        <div className="text-xs text-muted-foreground">Sleep Score</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sleep data</p>
                  )}
                  {data.health.unresolvedSymptoms > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{data.health.unresolvedSymptoms} unresolved symptom{data.health.unresolvedSymptoms > 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No health data.</p>
              )}
            </CardContent>
          </Card>

          {/* ── 7. Investing Snapshot ── */}
          {data?.investing && (
            <Card className="hover:shadow-md transition-all duration-200">
              <CardLink href="/dashboard/investing" icon={CandlestickChart} onClick={nav}>
                Ayden&apos;s Portfolio
              </CardLink>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-2xl font-semibold">
                    {formatCurrency(data.investing.totalValue)}
                  </div>
                  <div className="flex items-center gap-2">
                    {data.investing.totalReturn >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        data.investing.totalReturn >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {data.investing.totalReturn >= 0 ? "+" : ""}
                      {data.investing.totalReturn.toFixed(2)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      total return
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.investing.positionCount} position{data.investing.positionCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 8. Upcoming Travel ── */}
          {data?.travel && (
            <Card className="hover:shadow-md transition-all duration-200">
              <CardLink href="/dashboard/travel" icon={Plane} onClick={nav}>
                Upcoming Trip
              </CardLink>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-base font-medium">{data.travel.name}</div>
                  {data.travel.destination && (
                    <div className="text-sm text-muted-foreground">{data.travel.destination}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        data.travel.daysUntil <= 7
                          ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                          : "border-border"
                      )}
                    >
                      {data.travel.daysUntil === 0
                        ? "Today"
                        : data.travel.daysUntil === 1
                        ? "Tomorrow"
                        : `${data.travel.daysUntil} days away`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 9. Hobbies ── */}
          {data?.hobbies && data.hobbies.length > 0 && (
            <Card className="hover:shadow-md transition-all duration-200">
              <CardLink href="/dashboard/hobbies" icon={Guitar} onClick={nav}>
                Hobbies
              </CardLink>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {data.hobbies.map((hobby) => (
                    <div key={hobby.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {hobby.icon && <span className="text-sm">{hobby.icon}</span>}
                        <span className="text-sm">{hobby.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {hobby.lastLogDate ? timeAgo(hobby.lastLogDate) : "No activity"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* CSS animation for the heart */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
