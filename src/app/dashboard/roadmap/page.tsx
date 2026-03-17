"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Map,
  X,
  Check,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  status: string;
  category: string;
  size: string | null;
  priority: number;
  specRef: string | null;
  createdBy: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "all" | "planned" | "in_progress" | "done" | "deferred";
type CategoryFilter = string;

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "deferred", label: "Deferred" },
];

const CATEGORY_OPTIONS = [
  { value: "ayden", label: "Ayden" },
  { value: "dashboard", label: "Dashboard" },
  { value: "investing", label: "Investing" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "mobile", label: "Mobile" },
  { value: "mlc", label: "MLC" },
  { value: "health", label: "Health" },
  { value: "life", label: "Life" },
];

const SIZE_OPTIONS = ["S", "M", "L", "XL"];

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  deferred:
    "bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500",
};

const categoryColors: Record<string, string> = {
  ayden: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  dashboard:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  investing:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  infrastructure:
    "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  mobile:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  mlc: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  health:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  life: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

const sizeColors: Record<string, string> = {
  S: "text-green-600 dark:text-green-400",
  M: "text-blue-600 dark:text-blue-400",
  L: "text-amber-600 dark:text-amber-400",
  XL: "text-red-600 dark:text-red-400",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  notes: "",
  status: "planned",
  category: "infrastructure",
  size: "",
  specRef: "",
};

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [showDone, setShowDone] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/roadmap");
      const json = await res.json();
      if (res.ok) setItems(json.data);
    } catch {
      toast.error("Failed to load roadmap");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: RoadmapItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || "",
      notes: item.notes || "",
      status: item.status,
      category: item.category,
      size: item.size || "",
      specRef: item.specRef || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
        category: form.category,
        size: form.size || null,
        specRef: form.specRef.trim() || null,
      };

      if (editingItem) {
        const res = await fetch(`/api/roadmap/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? json.data : i))
        );
        toast.success("Item updated");
      } else {
        const res = await fetch("/api/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setItems((prev) => [...prev, json.data]);
        toast.success("Item added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/roadmap/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item removed");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleStatusChange = async (item: RoadmapItem, newStatus: string) => {
    try {
      const res = await fetch(`/api/roadmap/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? json.data : i)));
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Drag-and-drop reorder
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    setItems((prev) => {
      const dragged = prev.findIndex((i) => i.id === draggedId);
      const target = prev.findIndex((i) => i.id === targetId);
      if (dragged === -1 || target === -1) return prev;

      const newItems = [...prev];
      const [removed] = newItems.splice(dragged, 1);
      newItems.splice(target, 0, removed);
      return newItems;
    });
  };

  const handleDragEnd = async () => {
    if (!draggedId) return;
    setDraggedId(null);

    // Persist new order for non-done items
    const activeItems = items.filter((i) => i.status !== "done");
    const reorderPayload = activeItems.map((item, idx) => ({
      id: item.id,
      priority: idx,
    }));

    try {
      await fetch("/api/roadmap/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderPayload }),
      });
    } catch {
      toast.error("Failed to save order");
      fetchItems(); // rollback
    }
  };

  // Filter and split
  const filtered = items.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  });

  const activeItems = filtered.filter((i) => i.status !== "done");
  const doneItems = filtered.filter((i) => i.status === "done");

  // Stats
  const allActive = items.filter((i) => i.status !== "done" && i.status !== "deferred");
  const inProgress = items.filter((i) => i.status === "in_progress");
  const done = items.filter((i) => i.status === "done");
  const deferred = items.filter((i) => i.status === "deferred");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roadmap</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allActive.length} planned &middot; {inProgress.length} in progress
            &middot; {done.length} done &middot; {deferred.length} deferred
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Item</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 border-b border-border sm:border-0">
          {(["all", "planned", "in_progress", "deferred"] as StatusFilter[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px sm:border-b-0 sm:rounded-md sm:mb-0 ${
                  statusFilter === s
                    ? "border-foreground/50 text-foreground sm:bg-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground sm:hover:bg-accent/50"
                }`}
              >
                {s === "all"
                  ? "All"
                  : s === "in_progress"
                    ? "In Progress"
                    : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          )}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v)}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-muted-foreground py-16 text-center">
          Loading roadmap...
        </div>
      ) : activeItems.length === 0 && doneItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <Map className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">
            No roadmap items
          </p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            {statusFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your filters"
              : "Add your first roadmap item to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeItems.map((item) => (
            <Card
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragEnd={handleDragEnd}
              className={`transition-all duration-200 ${
                draggedId === item.id
                  ? "opacity-50 scale-[0.98]"
                  : "hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30"
              } ${item.status === "deferred" ? "opacity-60" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Drag handle */}
                  <div className="pt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-medium">{item.title}</h3>
                      {item.createdBy === "ayden" && (
                        <Bot className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {item.description}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground/70 italic line-clamp-1 mb-2">
                        {item.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={item.status}
                        onValueChange={(v) => handleStatusChange(item, v)}
                      >
                        <SelectTrigger className="h-6 w-auto border-0 p-0 shadow-none">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[item.status]}`}
                          >
                            {
                              STATUS_OPTIONS.find(
                                (o) => o.value === item.status
                              )?.label
                            }
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryColors[item.category] || ""}`}
                      >
                        {
                          CATEGORY_OPTIONS.find(
                            (c) => c.value === item.category
                          )?.label || item.category
                        }
                      </span>
                      {item.size && (
                        <span
                          className={`text-[10px] font-bold ${sizeColors[item.size] || ""}`}
                        >
                          {item.size}
                        </span>
                      )}
                      {item.specRef && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {item.specRef}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Done section (collapsible) */}
          {doneItems.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2 px-1"
              >
                {showDone ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Completed ({doneItems.length})
              </button>
              {showDone && (
                <div className="space-y-2">
                  {doneItems.map((item) => (
                    <Card
                      key={item.id}
                      className="opacity-60 hover:opacity-80 transition-opacity"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium line-through decoration-muted-foreground/30">
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors.done}`}
                              >
                                Done
                              </span>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryColors[item.category] || ""}`}
                              >
                                {
                                  CATEGORY_OPTIONS.find(
                                    (c) => c.value === item.category
                                  )?.label || item.category
                                }
                              </span>
                              {item.size && (
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {item.size}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                handleStatusChange(item, "planned")
                              }
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Roadmap Item" : "Add Roadmap Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Feature or task name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What does this involve?"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                placeholder="Discussion notes, decisions, implementation context..."
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Size</Label>
                <Select
                  value={form.size || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, size: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No size</SelectItem>
                    {SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Spec Reference</Label>
                <Input
                  value={form.specRef}
                  onChange={(e) => setForm({ ...form, specRef: e.target.value })}
                  placeholder="Phase 3, memory/file.md"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingItem ? "Save Changes" : "Add Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
