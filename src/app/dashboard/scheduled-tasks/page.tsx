"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  Pencil,
  Loader2,
  CalendarClock,
  Bot,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ScheduledTask {
  id: string;
  task: string;
  reason: string | null;
  triggerAt: string;
  fired: boolean;
  firedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type FilterStatus = "pending" | "fired" | "all";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelative(iso: string): string {
  const now = new Date();
  const target = new Date(iso);
  const diffMs = target.getTime() - now.getTime();
  const absDiff = Math.abs(diffMs);
  const isPast = diffMs < 0;

  if (absDiff < 60_000) return isPast ? "just now" : "in <1m";
  if (absDiff < 3_600_000) {
    const mins = Math.round(absDiff / 60_000);
    return isPast ? `${mins}m ago` : `in ${mins}m`;
  }
  if (absDiff < 86_400_000) {
    const hrs = Math.round(absDiff / 3_600_000);
    return isPast ? `${hrs}h ago` : `in ${hrs}h`;
  }
  const days = Math.round(absDiff / 86_400_000);
  return isPast ? `${days}d ago` : `in ${days}d`;
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  // Convert to ET for the input
  const et = new Date(
    d.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${et.getFullYear()}-${pad(et.getMonth() + 1)}-${pad(et.getDate())}T${pad(et.getHours())}:${pad(et.getMinutes())}`;
}

function fromLocalDatetimeValue(local: string): string {
  // Interpret the datetime-local value as ET
  // Create a date string with explicit ET offset
  const d = new Date(local);
  // Get ET offset for this date
  const etStr = d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  });
  // Parse offset from string like "3/16/2026, 8:00 AM GMT-4"
  const offsetMatch = etStr.match(/GMT([+-]\d+)/);
  const offset = offsetMatch ? offsetMatch[1] : "-5";
  const paddedOffset =
    offset.length === 2
      ? `${offset[0]}0${offset[1]}:00`
      : `${offset}:00`;
  return `${local}:00${paddedOffset}`;
}

export default function ScheduledTasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);

  // Form state
  const [formTask, setFormTask] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formTriggerAt, setFormTriggerAt] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/ayden/scheduled-tasks?status=${filter}`
      );
      const json = await res.json();
      if (json.data) setTasks(json.data);
    } catch {
      toast.error("Failed to load scheduled tasks");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  const openCreate = () => {
    setFormTask("");
    setFormReason("");
    // Default to tomorrow 8am ET
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    setFormTriggerAt(toLocalDatetimeValue(tomorrow.toISOString()));
    setShowCreate(true);
    setEditingTask(null);
  };

  const openEdit = (task: ScheduledTask) => {
    setFormTask(task.task);
    setFormReason(task.reason || "");
    setFormTriggerAt(toLocalDatetimeValue(task.triggerAt));
    setEditingTask(task);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!formTask.trim() || !formTriggerAt) {
      toast.error("Task and trigger time are required");
      return;
    }

    setSaving(true);
    try {
      const triggerAtISO = fromLocalDatetimeValue(formTriggerAt);

      if (editingTask) {
        const res = await fetch("/api/ayden/scheduled-tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingTask.id,
            task: formTask.trim(),
            reason: formReason.trim() || null,
            triggerAt: triggerAtISO,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Task updated");
      } else {
        const res = await fetch("/api/ayden/scheduled-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: formTask.trim(),
            reason: formReason.trim() || null,
            triggerAt: triggerAtISO,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Task scheduled");
      }

      setShowCreate(false);
      fetchTasks();
    } catch {
      toast.error("Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/ayden/scheduled-tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleMarkFired = async (id: string, fired: boolean) => {
    try {
      const res = await fetch("/api/ayden/scheduled-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, fired }),
      });
      if (!res.ok) throw new Error();
      fetchTasks();
      toast.success(fired ? "Marked as completed" : "Marked as pending");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const now = new Date();

  const pendingCount = tasks.filter((t) => !t.fired).length;
  const overdueCount = tasks.filter(
    (t) => !t.fired && new Date(t.triggerAt) < now
  ).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scheduled Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tasks scheduled by you or Ayden for future execution
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Task
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-sm">
        {pendingCount > 0 && (
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{pendingCount}</span>{" "}
            pending
          </span>
        )}
        {overdueCount > 0 && (
          <span className="text-amber-400">
            <span className="font-medium">{overdueCount}</span> overdue
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["pending", "fired", "all"] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
              filter === s
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "fired" ? "Completed" : s}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>
            {filter === "pending"
              ? "No pending tasks"
              : filter === "fired"
                ? "No completed tasks"
                : "No scheduled tasks yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const triggerDate = new Date(task.triggerAt);
            const isOverdue = !task.fired && triggerDate < now;

            return (
              <Card
                key={task.id}
                className={`transition-colors ${
                  task.fired
                    ? "opacity-60"
                    : isOverdue
                      ? "border-amber-500/30"
                      : ""
                }`}
              >
                <CardContent className="flex items-start gap-3 py-3 px-4">
                  {/* Status toggle */}
                  <button
                    onClick={() => handleMarkFired(task.id, !task.fired)}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    title={task.fired ? "Mark pending" : "Mark completed"}
                  >
                    {task.fired ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${task.fired ? "line-through text-muted-foreground" : ""}`}
                    >
                      {task.task}
                    </p>
                    {task.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.reason}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          isOverdue
                            ? "text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {formatDateTime(task.triggerAt)}
                        <span className="opacity-60">
                          ({formatRelative(task.triggerAt)})
                        </span>
                      </span>
                      {task.reason?.toLowerCase().includes("trey") ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 py-0"
                        >
                          <User className="h-2.5 w-2.5" />
                          Trey
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 py-0"
                        >
                          <Bot className="h-2.5 w-2.5" />
                          Ayden
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-400 border-amber-400/30 py-0"
                        >
                          Overdue
                        </Badge>
                      )}
                      {task.fired && task.firedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          Fired {formatDateTime(task.firedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!task.fired && (
                      <button
                        onClick={() => openEdit(task)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Task" : "Schedule Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task">Task</Label>
              <Textarea
                id="task"
                value={formTask}
                onChange={(e) => setFormTask(e.target.value)}
                placeholder="What needs to be done..."
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="Why this was scheduled"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="triggerAt">Trigger Time (ET)</Label>
              <Input
                id="triggerAt"
                type="datetime-local"
                value={formTriggerAt}
                onChange={(e) => setFormTriggerAt(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreate(false)}
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editingTask ? "Update" : "Schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
