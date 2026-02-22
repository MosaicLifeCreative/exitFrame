"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

interface Phase {
  id: string;
  name: string;
  status: string;
  sortOrder: number;
  _count: { tasks: number };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  domain: string;
  domainRefId: string | null;
  domainRefName: string | null;
  projectType: string;
  status: string;
  priority: string;
  dueDate: string | null;
  estimatedBudget: string | null;
  actualSpent: string | null;
  tasks: Task[];
  phases: Phase[];
  _count: { tasks: number; phases: number };
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const phaseStatusIcons: Record<string, React.ElementType> = {
  not_started: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  blocked: AlertCircle,
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [addingPhase, setAddingPhase] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`);
      const json = await res.json();
      if (res.ok) {
        setProject(json.data);
      } else {
        toast.error(json.error);
        router.push("/dashboard/projects");
      }
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success("Status updated");
        fetchProject();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const addPhase = async () => {
    if (!newPhaseName.trim()) return;
    setAddingPhase(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPhaseName }),
      });
      if (res.ok) {
        toast.success("Phase added");
        setNewPhaseName("");
        fetchProject();
      }
    } catch {
      toast.error("Failed to add phase");
    } finally {
      setAddingPhase(false);
    }
  };

  const updatePhaseStatus = async (phaseId: string, status: string) => {
    try {
      const res = await fetch(`/api/projects/${params.id}/phases/${phaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchProject();
    } catch {
      toast.error("Failed to update phase");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground py-12 text-center">Loading...</div>;
  }

  if (!project) return null;

  const completedTasks = project.tasks.filter((t) => t.status === "done").length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] ?? ""}`}>
              {project.status.replace("_", " ")}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[project.priority] ?? ""}`}>
              {project.priority}
            </span>
            <Badge variant="outline" className="capitalize text-xs">
              {project.domain}
            </Badge>
            {project.domainRefName && (
              <span className="text-xs text-muted-foreground">
                &middot; {project.domainRefName}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={project.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {project.description && (
        <p className="text-muted-foreground">{project.description}</p>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold">{totalTasks}</div>
            <div className="text-xs text-muted-foreground">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold">{completedTasks}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold">{project.phases.length}</div>
            <div className="text-xs text-muted-foreground">Phases</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold flex items-center gap-1">
              {project.dueDate ? (
                <>
                  <Calendar className="h-4 w-4" />
                  <span className="text-base">{new Date(project.dueDate).toLocaleDateString()}</span>
                </>
              ) : (
                "—"
              )}
            </div>
            <div className="text-xs text-muted-foreground">Due Date</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Phases */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Phases</CardTitle>
        </CardHeader>
        <CardContent>
          {project.phases.length > 0 ? (
            <div className="space-y-3">
              {project.phases.map((phase) => {
                const StatusIcon = phaseStatusIcons[phase.status] ?? Circle;
                return (
                  <div
                    key={phase.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{phase.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {phase._count.tasks} tasks
                      </span>
                    </div>
                    <Select
                      value={phase.status}
                      onValueChange={(v) => updatePhaseStatus(phase.id, v)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">No phases yet.</p>
          )}

          <div className="flex gap-2 mt-3">
            <Input
              placeholder="New phase name..."
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPhase()}
              className="max-w-xs"
            />
            <Button size="sm" onClick={addPhase} disabled={addingPhase || !newPhaseName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Phase
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks section — placeholder until Task management step */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Tasks</CardTitle>
          <Link href={`/dashboard/tasks?project_id=${project.id}`}>
            <Button variant="outline" size="sm">View All Tasks</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {project.tasks.length > 0 ? (
            <div className="space-y-2">
              {project.tasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {task.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={`text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </span>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority] ?? ""}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tasks yet. Tasks will be managed from the Tasks page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
