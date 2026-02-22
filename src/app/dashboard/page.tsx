"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  AlertTriangle,
  FolderOpen,
  Clock,
  Activity,
  Target,
  TrendingUp,
  Moon,
  Utensils,
  DollarSign,
  Heart,
  Dumbbell,
  CalendarDays,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TaskItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  project: { id: string; name: string } | null;
}

interface ProjectItem {
  id: string;
  name: string;
  domain: string;
  status: string;
  priority: string;
  _count: { tasks: number };
}

interface ActivityItem {
  id: string;
  title: string;
  activityType: string;
  module: string;
  createdAt: string;
}

interface WidgetData {
  tasksDueToday: { count: number; items: TaskItem[] };
  overdueTasks: { count: number; items: TaskItem[] };
  activeProjects: { count: number; items: ProjectItem[] };
  recentActivity: ActivityItem[];
  timeTrackedToday: number;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const futureWidgets = [
  { label: "Oura Readiness", icon: Activity, phase: 2 },
  { label: "Active Goals", icon: Target, phase: 3 },
  { label: "Weekly Trends", icon: TrendingUp, phase: 2 },
  { label: "Sleep Score", icon: Moon, phase: 2 },
  { label: "Meal Plan", icon: Utensils, phase: 4 },
  { label: "Monthly Budget", icon: DollarSign, phase: 5 },
  { label: "Health Metrics", icon: Heart, phase: 2 },
  { label: "Workout Streak", icon: Dumbbell, phase: 3 },
  { label: "Upcoming Events", icon: CalendarDays, phase: 6 },
  { label: "Business Analytics", icon: BarChart3, phase: 7 },
];

function formatMinutes(mins: number) {
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours === 0) return `${remaining}m`;
  return `${hours}h ${remaining}m`;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardHome() {
  const router = useRouter();
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWidgets = async () => {
      try {
        const res = await fetch("/api/dashboard/widgets");
        const json = await res.json();
        if (res.ok) setData(json.data);
      } catch {
        // Silently fail — dashboard should still render
      } finally {
        setLoading(false);
      }
    };
    fetchWidgets();
  }, []);

  const completeTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      // Refresh widget data
      const res = await fetch("/api/dashboard/widgets");
      const json = await res.json();
      if (res.ok) setData(json.data);
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Welcome back, Trey.
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Mosaic Life Dashboard — your command center.
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">
          Loading dashboard...
        </div>
      ) : (
        <>
          {/* Row 1: Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => router.push("/dashboard/tasks")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <CheckSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-semibold">
                      {data?.tasksDueToday.count ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tasks Due Today
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer hover:border-primary/30 transition-colors ${
                (data?.overdueTasks.count ?? 0) > 0 ? "border-red-300 dark:border-red-800" : ""
              }`}
              onClick={() => router.push("/dashboard/tasks")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      (data?.overdueTasks.count ?? 0) > 0
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-muted"
                    }`}
                  >
                    <AlertTriangle
                      className={`h-6 w-6 ${
                        (data?.overdueTasks.count ?? 0) > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-3xl font-semibold">
                      {data?.overdueTasks.count ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Overdue Tasks
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => router.push("/dashboard/projects")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-semibold">
                      {data?.activeProjects.count ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Projects
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => router.push("/dashboard/time")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-semibold">
                      {formatMinutes(data?.timeTrackedToday ?? 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tracked Today
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Tasks Due Today */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tasks Due Today</CardTitle>
                <button
                  className="text-sm text-primary hover:underline"
                  onClick={() => router.push("/dashboard/tasks")}
                >
                  View All Tasks
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {!data?.tasksDueToday.items.length ? (
                <p className="text-sm text-muted-foreground py-3">
                  No tasks due today. Nice work!
                </p>
              ) : (
                <div className="space-y-2">
                  {data.tasksDueToday.items.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <button
                        onClick={() => completeTask(task.id)}
                        className="h-5 w-5 rounded border border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-colors shrink-0"
                      >
                        <CheckCircle2 className="h-3 w-3 text-transparent hover:text-primary" />
                      </button>
                      <span className="text-sm flex-1">{task.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${priorityColors[task.priority] ?? ""}`}
                      >
                        {task.priority}
                      </Badge>
                      {task.project && (
                        <span className="text-xs text-muted-foreground">
                          {task.project.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 3: Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <button
                  className="text-sm text-primary hover:underline"
                  onClick={() => router.push("/dashboard/activity")}
                >
                  View All Activity
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {!data?.recentActivity.length ? (
                <p className="text-sm text-muted-foreground py-3">
                  No recent activity.
                </p>
              ) : (
                <div className="space-y-1">
                  {data.recentActivity.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-2 rounded-lg"
                    >
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Activity className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-sm flex-1 truncate">
                        {entry.title}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(entry.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Future Phase Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {futureWidgets.map((widget) => {
              const Icon = widget.icon;
              return (
                <div
                  key={widget.label}
                  className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center
                    text-center space-y-3 min-h-[160px] hover:border-border/80 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {widget.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Coming in Phase {widget.phase}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
