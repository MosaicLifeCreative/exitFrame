"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useChatContext } from "@/hooks/useChatContext";
import { useToolRefresh } from "@/hooks/useToolRefresh";
import {
  Target,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  Circle,
  Pause,
  Trophy,
  X,
  Pencil,
  Trash2,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────

interface GoalMilestone {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  sortOrder: number;
}

interface GoalProgress {
  id: string;
  value: number | null;
  notes: string | null;
  source: string;
  createdAt: string;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  goalType: string;
  status: string;
  priority: string;
  targetValue: number | null;
  currentValue: number | null;
  startValue: number | null;
  unit: string | null;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  milestones: GoalMilestone[];
  progress: GoalProgress[];
}

type GoalCategory = "health" | "fitness" | "financial" | "home" | "personal" | "business";
type GoalType = "quantitative" | "qualitative";

const CATEGORIES: { value: GoalCategory; label: string }[] = [
  { value: "health", label: "Health" },
  { value: "fitness", label: "Fitness" },
  { value: "financial", label: "Financial" },
  { value: "home", label: "Home" },
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
];

const CATEGORY_COLORS: Record<string, string> = {
  health: "bg-green-500/10 text-green-500 border-green-500/20",
  fitness: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  financial: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  home: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  personal: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  business: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <Circle className="h-3.5 w-3.5 text-blue-500" />,
  completed: <Trophy className="h-3.5 w-3.5 text-green-500" />,
  paused: <Pause className="h-3.5 w-3.5 text-amber-500" />,
  abandoned: <X className="h-3.5 w-3.5 text-muted-foreground" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-muted-foreground",
};

const UNIT_PREFIX = new Set(["$"]);

function formatValue(value: number | string | null, unit?: string | null): string {
  if (value === null || value === undefined) return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  const formatted = num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (unit && UNIT_PREFIX.has(unit)) return `${unit}${formatted}`;
  return unit ? `${formatted} ${unit}` : formatted;
}

// ─── Page ────────────────────────────────────────────────

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showProgressForm, setShowProgressForm] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await fetch(`/api/goals?${params}`).then((r) => r.json());
      if (res.data) setGoals(res.data);
    } catch (err) {
      console.error("Goals fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, categoryFilter]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Refresh when Claude tools execute
  useToolRefresh(fetchGoals);

  // Chat context
  const chatData = useMemo(() => {
    if (goals.length === 0) return "No goals set yet.";
    const active = goals.filter((g) => g.status === "active");
    const lines = active.map((g) => {
      let line = `${g.title} [${g.category}, ${g.priority} priority]`;
      if (g.goalType === "quantitative" && g.currentValue !== null && g.targetValue !== null) {
        line += ` — ${formatValue(g.currentValue, g.unit)} → ${formatValue(g.targetValue, g.unit)}`;
      }
      if (g.milestones.length > 0) {
        const done = g.milestones.filter((m) => m.isCompleted).length;
        line += ` (${done}/${g.milestones.length} milestones)`;
      }
      if (g.targetDate) line += ` by ${g.targetDate}`;
      return line;
    });
    return `Active goals (${active.length}):\n${lines.join("\n")}`;
  }, [goals]);

  useChatContext("Goals", chatData);

  // ─── Stats ─────────────────────────────────────────────

  const activeCount = goals.filter((g) => g.status === "active").length;
  const completedCount = goals.filter((g) => g.status === "completed").length;

  const toggleExpand = (id: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active{completedCount > 0 ? ` · ${completedCount} completed` : ""}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Goal
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["active", "all", "completed", "paused"].map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <div className="w-px bg-border mx-1" />
        <Button
          variant={categoryFilter === "all" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setCategoryFilter("all")}
        >
          All Categories
        </Button>
        {CATEGORIES.map((c) => (
          <Button
            key={c.value}
            variant={categoryFilter === c.value ? "secondary" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(c.value)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <AddGoalForm
          onClose={() => setShowAddForm(false)}
          onCreated={() => {
            setShowAddForm(false);
            fetchGoals();
          }}
        />
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">No goals yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              isExpanded={expandedGoals.has(goal.id)}
              onToggle={() => toggleExpand(goal.id)}
              isEditing={editingGoalId === goal.id}
              onEdit={() => setEditingGoalId(goal.id)}
              onCancelEdit={() => setEditingGoalId(null)}
              showProgress={showProgressForm === goal.id}
              onToggleProgress={() =>
                setShowProgressForm(showProgressForm === goal.id ? null : goal.id)
              }
              onRefresh={fetchGoals}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Goal Card ───────────────────────────────────────────

function GoalCard({
  goal,
  isExpanded,
  onToggle,
  isEditing,
  onEdit,
  onCancelEdit,
  showProgress,
  onToggleProgress,
  onRefresh,
}: {
  goal: Goal;
  isExpanded: boolean;
  onToggle: () => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  showProgress: boolean;
  onToggleProgress: () => void;
  onRefresh: () => void;
}) {
  const progressPct = useMemo(() => {
    if (goal.goalType === "quantitative" && goal.targetValue !== null && goal.startValue !== null && goal.currentValue !== null) {
      const range = goal.targetValue - goal.startValue;
      if (range === 0) return goal.currentValue === goal.targetValue ? 100 : 0;
      const pct = ((goal.currentValue - goal.startValue) / range) * 100;
      return Math.max(0, Math.min(100, pct));
    }
    if (goal.goalType === "qualitative" && goal.milestones.length > 0) {
      const done = goal.milestones.filter((m) => m.isCompleted).length;
      return (done / goal.milestones.length) * 100;
    }
    return null;
  }, [goal]);

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this goal and all its milestones/progress?")) return;
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleMilestoneToggle = async (milestoneId: string, isCompleted: boolean) => {
    await fetch(`/api/goals/${goal.id}/milestones`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: milestoneId, isCompleted }),
    });
    onRefresh();
  };

  return (
    <Card className={goal.status === "completed" ? "opacity-70" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          {/* Expand toggle */}
          <button onClick={onToggle} className="mt-1 shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_ICONS[goal.status]}
              <CardTitle className="text-base">{goal.title}</CardTitle>
              <Badge
                variant="outline"
                className={`text-[10px] ${CATEGORY_COLORS[goal.category] || ""}`}
              >
                {goal.category}
              </Badge>
              {goal.priority !== "medium" && (
                <span className={`text-xs font-medium ${PRIORITY_COLORS[goal.priority]}`}>
                  {goal.priority}
                </span>
              )}
            </div>

            {goal.description && (
              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
            )}

            {/* Progress bar for quantitative goals */}
            {goal.goalType === "quantitative" && progressPct !== null && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{formatValue(goal.currentValue, goal.unit)}</span>
                  <span>{formatValue(goal.targetValue, goal.unit)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{Math.round(progressPct)}% complete</p>
              </div>
            )}

            {/* Milestone progress for qualitative goals */}
            {goal.goalType === "qualitative" && goal.milestones.length > 0 && !isExpanded && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3 w-3" />
                  {goal.milestones.filter((m) => m.isCompleted).length}/{goal.milestones.length} milestones
                </div>
              </div>
            )}

            {/* Target date */}
            {goal.targetDate && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                Target: {new Date(goal.targetDate).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {goal.status === "active" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={onToggleProgress}
                  title="Log progress"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleStatusChange("completed")}
                  title="Mark complete"
                >
                  <Check className="h-3.5 w-3.5 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleStatusChange("paused")}
                  title="Pause"
                >
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {goal.status === "paused" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleStatusChange("active")}
                title="Resume"
              >
                <Circle className="h-3.5 w-3.5 text-blue-500" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onEdit}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Progress form */}
      {showProgress && (
        <CardContent className="pt-0 pb-3">
          <ProgressForm
            goal={goal}
            onClose={onToggleProgress}
            onSaved={() => {
              onToggleProgress();
              onRefresh();
            }}
          />
        </CardContent>
      )}

      {/* Edit form */}
      {isEditing && (
        <CardContent className="pt-0 pb-3">
          <EditGoalForm
            goal={goal}
            onClose={onCancelEdit}
            onSaved={() => {
              onCancelEdit();
              onRefresh();
            }}
          />
        </CardContent>
      )}

      {/* Expanded content */}
      {isExpanded && !isEditing && (
        <CardContent className="pt-0 space-y-4">
          {/* Milestones */}
          {goal.milestones.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Milestones</h4>
              <div className="space-y-1.5">
                {goal.milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <button
                      onClick={() => handleMilestoneToggle(m.id, !m.isCompleted)}
                      className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                        m.isCompleted
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30 hover:border-primary"
                      }`}
                    >
                      {m.isCompleted && <Check className="h-3 w-3 text-primary-foreground" />}
                    </button>
                    <span
                      className={`text-sm ${m.isCompleted ? "line-through text-muted-foreground" : ""}`}
                    >
                      {m.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Milestone */}
          <AddMilestoneInline goalId={goal.id} onAdded={onRefresh} />

          {/* Recent Progress */}
          {goal.progress.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Recent Progress</h4>
              <div className="space-y-2">
                {goal.progress.map((p) => (
                  <div key={p.id} className="text-sm border-l-2 border-muted pl-3 py-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      {p.value !== null && (
                        <span className="font-medium text-foreground">
                          {formatValue(p.value, goal.unit)}
                        </span>
                      )}
                      {p.source === "claude" && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">AI</Badge>
                      )}
                    </div>
                    {p.notes && <p className="text-muted-foreground mt-0.5">{p.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Add Goal Form ───────────────────────────────────────

function AddGoalForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GoalCategory>("personal");
  const [goalType, setGoalType] = useState<GoalType>("qualitative");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [targetValue, setTargetValue] = useState("");
  const [startValue, setStartValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [unit, setUnit] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [milestoneInputs, setMilestoneInputs] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        goalType,
        priority,
        targetDate: targetDate || undefined,
      };

      if (goalType === "quantitative") {
        if (targetValue) body.targetValue = parseFloat(targetValue);
        if (startValue) body.startValue = parseFloat(startValue);
        if (currentValue) body.currentValue = parseFloat(currentValue);
        if (unit) body.unit = unit;
      }

      const milestones = milestoneInputs
        .filter((m) => m.trim())
        .map((m, i) => ({ title: m.trim(), sortOrder: i }));
      if (milestones.length > 0) body.milestones = milestones;

      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      onCreated();
    } catch (err) {
      console.error("Create goal error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">New Goal</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Goal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="quantitative">Quantitative (numeric)</option>
                <option value="qualitative">Qualitative (milestones)</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Target Date */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target Date</label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {/* Quantitative fields */}
          {goalType === "quantitative" && (
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Current</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Target</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
                <Input
                  placeholder="lbs, %, $"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Milestones */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Milestones (optional)
            </label>
            {milestoneInputs.map((m, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <Input
                  placeholder={`Milestone ${i + 1}`}
                  value={m}
                  onChange={(e) => {
                    const next = [...milestoneInputs];
                    next[i] = e.target.value;
                    setMilestoneInputs(next);
                  }}
                />
                {milestoneInputs.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 shrink-0"
                    onClick={() => setMilestoneInputs(milestoneInputs.filter((_, j) => j !== i))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMilestoneInputs([...milestoneInputs, ""])}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Add milestone
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Goal"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Edit Goal Form ──────────────────────────────────────

function EditGoalForm({
  goal,
  onClose,
  onSaved,
}: {
  goal: Goal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description || "");
  const [priority, setPriority] = useState(goal.priority);
  const [targetDate, setTargetDate] = useState(goal.targetDate || "");
  const [targetValue, setTargetValue] = useState(goal.targetValue?.toString() || "");
  const [currentValue, setCurrentValue] = useState(goal.currentValue?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        targetDate: targetDate || null,
      };
      if (goal.goalType === "quantitative") {
        if (targetValue) body.targetValue = parseFloat(targetValue);
        if (currentValue) body.currentValue = parseFloat(currentValue);
      }

      await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      console.error("Edit goal error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>
      {goal.goalType === "quantitative" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Current</label>
            <Input type="number" step="any" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Target</label>
            <Input type="number" step="any" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </form>
  );
}

// ─── Progress Form ───────────────────────────────────────

function ProgressForm({
  goal,
  onClose,
  onSaved,
}: {
  goal: Goal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(goal.currentValue?.toString() || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = { source: "manual" };
      if (value) body.value = parseFloat(value);
      if (notes.trim()) body.notes = notes.trim();

      await fetch(`/api/goals/${goal.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      console.error("Log progress error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
      <div className="flex gap-3">
        {goal.goalType === "quantitative" && (
          <div className="w-32">
            <label className="text-xs text-muted-foreground mb-1 block">
              Value{goal.unit ? ` (${goal.unit})` : ""}
            </label>
            <Input
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
          <Input
            placeholder="What did you accomplish?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            autoFocus={goal.goalType === "qualitative"}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving || (!value && !notes.trim())}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Progress"}
        </Button>
      </div>
    </form>
  );
}

// ─── Add Milestone Inline ────────────────────────────────

function AddMilestoneInline({
  goalId,
  onAdded,
}: {
  goalId: string;
  onAdded: () => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/goals/${goalId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      setTitle("");
      setIsAdding(false);
      onAdded();
    } catch (err) {
      console.error("Add milestone error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-3 w-3" /> Add milestone
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Milestone title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-sm h-8"
        autoFocus
      />
      <Button type="submit" size="sm" className="h-8" disabled={!title.trim() || saving}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setIsAdding(false)}>
        <X className="h-3 w-3" />
      </Button>
    </form>
  );
}
