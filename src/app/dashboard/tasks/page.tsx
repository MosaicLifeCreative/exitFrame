"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  GripVertical,
  Trash2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  sortOrder: number;
  projectId: string | null;
  project: { id: string; name: string; domain: string } | null;
}

interface Project {
  id: string;
  name: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground py-12 text-center">Loading...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project_id") || "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectId, setProjectId] = useState(projectFilter);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  // Quick add
  const [quickTitle, setQuickTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  // Detail dialog
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    projectId: "",
  });

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      const res = await fetch(`/api/tasks?${params}`);
      const json = await res.json();
      if (res.ok) setTasks(json.data);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const fetchProjects = async () => {
      const res = await fetch("/api/projects?status=active");
      const json = await res.json();
      if (res.ok) setProjects(json.data.map((p: Project) => ({ id: p.id, name: p.name })));
    };
    fetchProjects();
  }, []);

  const filtered = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const quickAddTask = async () => {
    if (!quickTitle.trim()) return;
    setAddingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTitle,
          projectId: projectId || null,
        }),
      });
      if (res.ok) {
        setQuickTitle("");
        fetchTasks();
        toast.success("Task created");
      }
    } catch {
      toast.error("Failed to create task");
    } finally {
      setAddingTask(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
    } catch {
      toast.error("Failed to update task");
    }
  };

  const openEditDialog = (task: Task) => {
    setEditTask(task);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      projectId: task.projectId ?? "",
    });
  };

  const saveTask = async () => {
    if (!editTask) return;
    try {
      const res = await fetch(`/api/tasks/${editTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          status: editForm.status,
          priority: editForm.priority,
          dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
          projectId: editForm.projectId || null,
        }),
      });
      if (res.ok) {
        toast.success("Task updated");
        setEditTask(null);
        fetchTasks();
      }
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
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const isOverdue = d < now && d.toDateString() !== now.toDateString();
    return { text: d.toLocaleDateString(), isOverdue };
  };

  // Kanban columns
  const columns = ["todo", "in_progress", "done"] as const;

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) updateTaskStatus(taskId, status);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <div className="flex gap-2">
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <Input
          placeholder="Quick add task..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && quickAddTask()}
          className="max-w-md"
        />
        <Button onClick={quickAddTask} disabled={addingTask || !quickTitle.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">Loading tasks...</div>
      ) : view === "kanban" ? (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((colStatus) => {
            const colTasks = filtered.filter((t) => t.status === colStatus);
            return (
              <div
                key={colStatus}
                className="bg-muted/50 rounded-lg p-3 min-h-[200px]"
                onDrop={(e) => handleDrop(e, colStatus)}
                onDragOver={handleDragOver}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">{statusLabels[colStatus]}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {colTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => {
                    const dateInfo = formatDate(task.dueDate);
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => openEditDialog(task)}
                        className="bg-background border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            {task.project && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {task.project.name}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColors[task.priority]}`}>
                                {task.priority}
                              </span>
                              {dateInfo && (
                                <span className={`flex items-center gap-1 text-[10px] ${dateInfo.isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                                  <Calendar className="h-3 w-3" />
                                  {dateInfo.text}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No tasks found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((task) => {
                  const dateInfo = formatDate(task.dueDate);
                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer"
                      onClick={() => openEditDialog(task)}
                    >
                      <TableCell>
                        <span className={task.status === "done" ? "line-through text-muted-foreground" : "font-medium"}>
                          {task.title}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {task.project?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={(v) => {
                            updateTaskStatus(task.id, v);
                          }}
                        >
                          <SelectTrigger className="w-[120px] h-7 text-xs" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        {dateInfo ? (
                          <span className={dateInfo.isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}>
                            {dateInfo.text}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTask} onOpenChange={(open) => !open && setEditTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="edit-due">Due Date</Label>
                <Input
                  id="edit-due"
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Project</Label>
                <Select
                  value={editForm.projectId || "none"}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, projectId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="destructive" size="sm" onClick={() => editTask && deleteTask(editTask.id)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
                <Button onClick={saveTask}>Save</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
