"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
  X,
  Star,
  AlertTriangle,
  ShoppingCart,
  RotateCcw,
  Bell,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// ────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────

interface TaskGroup {
  id: string;
  name: string;
  parentGroupId: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  children: TaskGroup[];
  _count: { tasks: number };
}

interface TaskTag {
  id: string;
  name: string;
  color: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  startDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  groupId: string | null;
  projectId: string | null;
  noteId: string | null;
  importanceScore: number;
  urgencyScore: number;
  effortScore: number;
  computedScore: number | null;
  isDailyHighlight: boolean;
  reminderEnabled: boolean;
  reminderInterval: string | null;
  isRecurring: boolean;
  source: string;
  group: { id: string; name: string; color: string | null; icon: string | null } | null;
  project: { id: string; name: string; domain: string; domainRefId: string | null } | null;
  note: { id: string; title: string } | null;
  tags: Array<{ tag: TaskTag }>;
}

// ────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  none: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const GROCERY_GROUP_NAME = "Grocery List";

// ────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground py-12 text-center">Loading...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const initialGroup = searchParams.get("group") || "all";

  // Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [, setAllTags] = useState<TaskTag[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroup);
  const [statusFilter, setStatusFilter] = useState("active"); // active, all, done
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");

  // Quick add
  const [quickTitle, setQuickTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  // Grocery auto-suggest
  const [grocerySuggestions, setGrocerySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pastGroceryItems, setPastGroceryItems] = useState<string[]>([]);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Edit dialog
  const [editTask, setEditTask] = useState<Task | null>(null);

  // Expanded groups in sidebar
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Detect grocery group
  const groceryGroup = useMemo(
    () => {
      for (const g of groups) {
        if (g.name === GROCERY_GROUP_NAME) return g;
        for (const c of g.children || []) {
          if (c.name === GROCERY_GROUP_NAME) return c;
        }
      }
      return null;
    },
    [groups]
  );

  const isGroceryMode = groceryGroup && selectedGroupId === groceryGroup.id;

  // ─── Fetchers ───────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedGroupId !== "all") params.set("group_id", selectedGroupId);
      if (statusFilter === "active") params.set("exclude_done", "true");
      if (statusFilter === "done") params.set("status", "done");
      params.set("sort_by", sortBy);
      const res = await fetch(`/api/tasks?${params}`);
      const json = await res.json();
      if (res.ok) setTasks(json.data);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId, statusFilter, sortBy]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/groups");
      const json = await res.json();
      if (res.ok) setGroups(json.data);
    } catch {
      console.error("Failed to load groups");
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/tags");
      const json = await res.json();
      if (res.ok) setAllTags(json.data.map((t: TaskTag & { _count?: { assignments: number } }) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })));
    } catch {
      console.error("Failed to load tags");
    }
  }, []);

  // Fetch past grocery items for auto-suggest
  const fetchPastGroceryItems = useCallback(async () => {
    if (!groceryGroup) return;
    try {
      const params = new URLSearchParams();
      params.set("group_id", groceryGroup.id);
      params.set("status", "done");
      params.set("sort_by", "created");
      const res = await fetch(`/api/tasks?${params}`);
      const json = await res.json();
      if (res.ok) {
        // Unique titles from past completed grocery items
        const titles = Array.from(new Set(
          (json.data as Task[]).map((t) => t.title)
        )) as string[];
        setPastGroceryItems(titles);
      }
    } catch {
      // Silently fail
    }
  }, [groceryGroup]);

  useEffect(() => {
    fetchTasks();
    fetchGroups();
    fetchTags();
  }, [fetchTasks, fetchGroups, fetchTags]);

  useEffect(() => {
    if (groceryGroup) fetchPastGroceryItems();
  }, [groceryGroup, fetchPastGroceryItems]);

  // ─── Grocery auto-suggest ─────────────────────────────

  useEffect(() => {
    if (isGroceryMode && quickTitle.length >= 2) {
      const lower = quickTitle.toLowerCase();
      const matches = pastGroceryItems
        .filter((item) => item.toLowerCase().includes(lower))
        .slice(0, 6);
      setGrocerySuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [quickTitle, isGroceryMode, pastGroceryItems]);

  // ─── Filtered / Sorted ────────────────────────────────

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, priorityFilter]);

  // Separate overdue tasks
  const { overdue, active, done } = useMemo(() => {
    const now = new Date();
    const overdueList: Task[] = [];
    const activeList: Task[] = [];
    const doneList: Task[] = [];

    for (const t of filtered) {
      if (t.status === "done" || t.status === "cancelled") {
        doneList.push(t);
      } else if (t.dueDate && new Date(t.dueDate) < now) {
        overdueList.push(t);
      } else {
        activeList.push(t);
      }
    }
    return { overdue: overdueList, active: activeList, done: doneList };
  }, [filtered]);

  // ─── Actions ──────────────────────────────────────────

  const quickAddTask = async () => {
    if (!quickTitle.trim()) return;
    setAddingTask(true);
    setShowSuggestions(false);
    try {
      const body: Record<string, unknown> = {
        title: quickTitle.trim(),
      };
      if (selectedGroupId !== "all") body.groupId = selectedGroupId;

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setQuickTitle("");
        fetchTasks();
        fetchGroups();
        toast.success("Task added");
      }
    } catch {
      toast.error("Failed to create task");
    } finally {
      setAddingTask(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchTasks();
        fetchGroups();
        toast.success("Task completed");
      }
    } catch {
      toast.error("Failed to complete task");
    }
  };

  const uncompleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "todo" }),
      });
      fetchTasks();
    } catch {
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      toast.success("Task deleted");
      setEditTask(null);
      fetchTasks();
      fetchGroups();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const saveTask = async (data: Record<string, unknown>) => {
    if (!editTask) return;
    try {
      const res = await fetch(`/api/tasks/${editTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Task updated");
        setEditTask(null);
        fetchTasks();
        fetchGroups();
      }
    } catch {
      toast.error("Failed to update task");
    }
  };

  // ─── Sidebar ──────────────────────────────────────────

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const totalActive = useMemo(() => {
    let count = 0;
    for (const g of groups) {
      count += g._count?.tasks || 0;
      for (const c of g.children || []) {
        count += c._count?.tasks || 0;
      }
    }
    return count;
  }, [groups]);

  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
    const isOverdue = d < now && d.toDateString() !== now.toDateString();
    const isToday = d.toDateString() === now.toDateString();

    let text: string;
    if (isToday) text = "Today";
    else if (diffDays === 1) text = "Tomorrow";
    else if (diffDays === -1) text = "Yesterday";
    else text = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return { text, isOverdue, isToday };
  };

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-56 shrink-0 space-y-1 overflow-y-auto">
        <button
          onClick={() => setSelectedGroupId("all")}
          className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between ${
            selectedGroupId === "all"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
        >
          <span>All Tasks</span>
          <Badge variant="secondary" className="text-xs">{totalActive}</Badge>
        </button>

        {groups.map((group) => (
          <div key={group.id}>
            <div className="flex items-center">
              {group.children?.length > 0 && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {expandedGroups.has(group.id) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
              <button
                onClick={() => setSelectedGroupId(group.id)}
                className={`flex-1 text-left px-2 py-1.5 rounded-md text-sm flex items-center justify-between ${
                  selectedGroupId === group.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  {group.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  {group.name}
                </span>
                {(group._count?.tasks || 0) > 0 && (
                  <span className="text-xs opacity-60">{group._count.tasks}</span>
                )}
              </button>
            </div>

            {expandedGroups.has(group.id) && group.children?.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedGroupId(child.id)}
                className={`w-full text-left pl-8 pr-3 py-1.5 rounded-md text-sm flex items-center justify-between ${
                  selectedGroupId === child.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  {child.name === GROCERY_GROUP_NAME ? (
                    <ShoppingCart className="h-3 w-3" />
                  ) : child.color ? (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: child.color }} />
                  ) : null}
                  {child.name}
                </span>
                {(child._count?.tasks || 0) > 0 && (
                  <span className="text-xs opacity-60">{child._count.tasks}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            {selectedGroupId === "all"
              ? "All Tasks"
              : isGroceryMode
                ? "Grocery List"
                : groups.flatMap((g) => [g, ...(g.children || [])]).find((g) => g.id === selectedGroupId)?.name || "Tasks"}
            {isGroceryMode && <ShoppingCart className="inline h-5 w-5 ml-2 text-muted-foreground" />}
          </h1>
        </div>

        {/* Quick add */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-lg">
              <Input
                ref={quickInputRef}
                placeholder={isGroceryMode ? "Add item..." : "Add task..."}
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !showSuggestions) quickAddTask();
                  if (e.key === "Escape") setShowSuggestions(false);
                }}
                onFocus={() => {
                  if (isGroceryMode && grocerySuggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {/* Auto-suggest dropdown for grocery */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                  {grocerySuggestions.map((item) => (
                    <button
                      key={item}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQuickTitle(item);
                        setShowSuggestions(false);
                        quickInputRef.current?.focus();
                      }}
                    >
                      <RotateCcw className="h-3 w-3 text-muted-foreground" />
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={quickAddTask} disabled={addingTask || !quickTitle.trim()} size="sm">
              {addingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1">Add</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">By Score</SelectItem>
              <SelectItem value="due_date">By Due Date</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
              <SelectItem value="created">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Circle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {statusFilter === "done" ? "No completed tasks." : "No tasks yet. Add one above."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Overdue section */}
            {overdue.length > 0 && statusFilter !== "done" && (
              <div>
                <h2 className="text-sm font-medium text-red-500 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue ({overdue.length})
                </h2>
                <div className="space-y-1">
                  {overdue.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onComplete={() => completeTask(task.id)}
                      onEdit={() => setEditTask(task)}
                      formatDueDate={formatDueDate}
                      isGroceryMode={isGroceryMode || false}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Active tasks */}
            {active.length > 0 && statusFilter !== "done" && (
              <div>
                {overdue.length > 0 && (
                  <h2 className="text-sm font-medium text-muted-foreground mb-2">
                    Active ({active.length})
                  </h2>
                )}
                <div className="space-y-1">
                  {active.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onComplete={() => completeTask(task.id)}
                      onEdit={() => setEditTask(task)}
                      formatDueDate={formatDueDate}
                      isGroceryMode={isGroceryMode || false}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Done tasks */}
            {done.length > 0 && (statusFilter === "done" || statusFilter === "all") && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-2">
                  Completed ({done.length})
                </h2>
                <div className="space-y-1">
                  {done.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onComplete={() => uncompleteTask(task.id)}
                      onEdit={() => setEditTask(task)}
                      formatDueDate={formatDueDate}
                      isGroceryMode={isGroceryMode || false}
                      isDone
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editTask && (
        <TaskEditDialog
          task={editTask}
          groups={groups}
          onClose={() => setEditTask(null)}
          onSave={saveTask}
          onDelete={() => deleteTask(editTask.id)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// TASK ROW
// ────────────────────────────────────────────────────────

function TaskRow({
  task,
  onComplete,
  onEdit,
  onDelete,
  formatDueDate,
  isGroceryMode,
  isDone,
}: {
  task: Task;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatDueDate: (d: string | null) => { text: string; isOverdue: boolean; isToday: boolean } | null;
  isGroceryMode: boolean;
  isDone?: boolean;
}) {
  const dateInfo = formatDueDate(task.dueDate);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors group ${
        isDone ? "opacity-60" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        className="shrink-0"
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 hover:text-muted-foreground transition-colors" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-green-500 transition-colors" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${isDone ? "line-through text-muted-foreground" : "font-medium"}`}>
            {task.title}
          </span>
          {task.isDailyHighlight && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
          {task.reminderEnabled && <Bell className="h-3 w-3 text-blue-400 shrink-0" />}
          {task.source === "recurring" && <RotateCcw className="h-3 w-3 text-muted-foreground shrink-0" />}
        </div>
        {!isGroceryMode && (
          <div className="flex items-center gap-2 mt-0.5">
            {task.group && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                {task.group.color && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.group.color }} />
                )}
                {task.group.name}
              </span>
            )}
            {task.tags.length > 0 && task.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="text-[10px] px-1.5 py-0 rounded-full bg-muted text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {!isGroceryMode && task.priority !== "none" && task.priority !== "medium" && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
        )}
        {dateInfo && (
          <span className={`text-xs whitespace-nowrap flex items-center gap-1 ${
            dateInfo.isOverdue ? "text-red-500 font-medium" : dateInfo.isToday ? "text-amber-500" : "text-muted-foreground"
          }`}>
            <Calendar className="h-3 w-3" />
            {dateInfo.text}
          </span>
        )}
        {!isGroceryMode && task.computedScore != null && task.computedScore > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
            {task.computedScore.toFixed(1)}
          </span>
        )}
        {/* Quick delete for grocery items */}
        {isGroceryMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// EDIT DIALOG
// ────────────────────────────────────────────────────────

function TaskEditDialog({
  task,
  groups,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  groups: TaskGroup[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    groupId: task.groupId || "none",
    importanceScore: task.importanceScore,
    urgencyScore: task.urgencyScore,
    effortScore: task.effortScore,
    reminderEnabled: task.reminderEnabled,
    reminderInterval: task.reminderInterval || "daily",
  });

  const flatGroups = useMemo(() => {
    const flat: Array<{ id: string; name: string; depth: number }> = [];
    for (const g of groups) {
      flat.push({ id: g.id, name: g.name, depth: 0 });
      for (const c of g.children || []) {
        flat.push({ id: c.id, name: c.name, depth: 1 });
      }
    }
    return flat;
  }, [groups]);

  const handleSave = () => {
    onSave({
      title: form.title,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate ? new Date(form.dueDate + "T12:00:00").toISOString() : null,
      groupId: form.groupId === "none" ? null : form.groupId,
      importanceScore: form.importanceScore,
      urgencyScore: form.urgencyScore,
      effortScore: form.effortScore,
      reminderEnabled: form.reminderEnabled,
      reminderInterval: form.reminderEnabled ? form.reminderInterval : null,
    });
  };

  const computedScore = ((form.importanceScore * form.urgencyScore) / form.effortScore).toFixed(1);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Group</Label>
              <Select value={form.groupId} onValueChange={(v) => setForm((p) => ({ ...p, groupId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group</SelectItem>
                  {flatGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.depth > 0 ? `  ${g.name}` : g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scoring */}
          <div>
            <Label className="mb-2 block">Score ({computedScore})</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Importance</label>
                <Select
                  value={String(form.importanceScore)}
                  onValueChange={(v) => setForm((p) => ({ ...p, importanceScore: Number(v) }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Urgency</label>
                <Select
                  value={String(form.urgencyScore)}
                  onValueChange={(v) => setForm((p) => ({ ...p, urgencyScore: Number(v) }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Effort</label>
                <Select
                  value={String(form.effortScore)}
                  onValueChange={(v) => setForm((p) => ({ ...p, effortScore: Number(v) }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.reminderEnabled}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, reminderEnabled: checked === true }))}
              />
              <label className="text-sm">Reminders</label>
            </div>
            {form.reminderEnabled && (
              <Select
                value={form.reminderInterval}
                onValueChange={(v) => setForm((p) => ({ ...p, reminderInterval: v }))}
              >
                <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="hourly">Nag me</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tags display */}
          {task.tags.length > 0 && (
            <div>
              <Label className="mb-1 block">Tags</Label>
              <div className="flex flex-wrap gap-1">
                {task.tags.map(({ tag }) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">{tag.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
