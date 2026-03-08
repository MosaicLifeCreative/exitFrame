"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useChatContext } from "@/hooks/useChatContext";
import { useToolRefresh } from "@/hooks/useToolRefresh";
import { useChatStore } from "@/lib/chat-store";
import { toast } from "sonner";
import {
  Dumbbell,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
  Calendar,
  Loader2,
  Trash2,
  ListChecks,
  Library,
  LayoutTemplate,
  Upload,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions: string | null;
  isActive: boolean;
}

interface ExerciseSet {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number;
  rpe: number | null;
  setType: string;
  isCompleted: boolean;
}

interface SessionExercise {
  id: string;
  sortOrder: number;
  notes: string | null;
  exercise: { id: string; name: string; muscleGroup: string; equipment: string };
  sets: ExerciseSet[];
}

interface WorkoutSession {
  id: string;
  name: string;
  performedAt: string;
  durationMinutes: number | null;
  notes: string | null;
  source: string;
  template: { id: string; name: string } | null;
  exercises: SessionExercise[];
}

interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  exercises: Array<{
    id: string;
    sortOrder: number;
    defaultSets: number;
    defaultReps: number;
    defaultWeight: number | null;
    notes: string | null;
    exercise: Exercise;
  }>;
  _count: { sessions: number };
}

// ─── Tab type ───────────────────────────────────────────

type Tab = "log" | "history" | "exercises" | "templates";

// ─── Muscle group display ───────────────────────────────

const muscleGroupLabels: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  biceps: "Biceps",
  triceps: "Triceps",
  legs: "Legs",
  glutes: "Glutes",
  core: "Core",
  cardio: "Cardio",
  power_explosive: "Power/Explosive",
  stretching_mobility: "Stretching/Mobility",
};

const muscleGroupColors: Record<string, string> = {
  chest: "bg-red-500/20 text-red-400",
  back: "bg-yellow-500/20 text-yellow-400",
  shoulders: "bg-orange-500/20 text-orange-400",
  arms: "bg-blue-500/20 text-blue-400",
  biceps: "bg-green-500/20 text-green-400",
  triceps: "bg-purple-500/20 text-purple-400",
  legs: "bg-gray-500/20 text-gray-400",
  glutes: "bg-pink-500/20 text-pink-400",
  core: "bg-emerald-500/20 text-emerald-400",
  cardio: "bg-rose-500/20 text-rose-400",
  power_explosive: "bg-amber-500/20 text-amber-400",
  stretching_mobility: "bg-cyan-500/20 text-cyan-400",
};

const equipmentLabels: Record<string, string> = {
  none: "None",
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  cable_machine: "Cable Machine",
  machine: "Machine",
  bodyweight: "Bodyweight",
  pull_up_bar: "Pull-Up Bar",
  resistance_band: "Resistance Band",
  mat: "Mat",
  curl_bar: "Curl Bar",
  landmine: "Landmine",
  trap_bar: "Trap Bar",
  medicine_ball: "Medicine Ball",
  bosu_ball: "Bosu Ball",
  step_bench: "Step Bench",
  wall: "Wall",
};

// ─── Set entry for workout logging ──────────────────────

interface SetEntry {
  setNumber: number;
  weight: string;
  reps: string;
  rpe: string;
  setType: string;
}

interface ExerciseEntry {
  exerciseId: string;
  exerciseName: string;
  notes: string;
  sets: SetEntry[];
}

// ─── Helper: format date ────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Main Page ──────────────────────────────────────────

export default function FitnessPage() {
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null);

  // Watch for workout drafts from Claude chat
  const workoutDraft = useChatStore((s) => s.workoutDraft);
  const draftProcessed = useRef(false);

  useEffect(() => {
    if (workoutDraft && !draftProcessed.current) {
      draftProcessed.current = true;
      setActiveTab("log");
      setEditingSession(null);
      // Draft will be consumed by LogWorkoutTab via the store
    }
    if (!workoutDraft) {
      draftProcessed.current = false;
    }
  }, [workoutDraft]);

  // Chat context
  const chatData = useMemo(() => {
    const recentSessions = sessions.slice(0, 5);
    const lines = recentSessions.map((s) => {
      const exList = s.exercises.map((e) => {
        const topSet = e.sets.reduce(
          (best, set) => ((set.weight ?? 0) > (best.weight ?? 0) ? set : best),
          e.sets[0]
        );
        return `${e.exercise.name}: ${topSet?.weight ?? "BW"}lbs x ${topSet?.reps ?? 0}`;
      });
      return `${formatDate(s.performedAt)}: ${s.name} — ${exList.join(", ")}`;
    });
    return `Exercise library: ${exercises.length} exercises\nRecent workouts:\n${lines.join("\n")}`;
  }, [sessions, exercises]);

  useChatContext("Fitness", chatData);

  // Fetch data
  const fetchExercises = useCallback(async () => {
    const res = await fetch("/api/fitness/exercises");
    const json = await res.json();
    if (res.ok) setExercises(json.data);
  }, []);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/fitness/sessions?limit=30");
    const json = await res.json();
    if (res.ok) setSessions(json.data.sessions);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/fitness/templates");
    const json = await res.json();
    if (res.ok) setTemplates(json.data);
  }, []);

  useEffect(() => {
    Promise.all([fetchExercises(), fetchSessions(), fetchTemplates()]).finally(() =>
      setLoading(false)
    );
  }, [fetchExercises, fetchSessions, fetchTemplates]);

  const refreshAll = useCallback(() => {
    fetchExercises();
    fetchSessions();
    fetchTemplates();
  }, [fetchExercises, fetchSessions, fetchTemplates]);

  useToolRefresh(refreshAll);

  const handleEditSession = useCallback((session: WorkoutSession) => {
    setEditingSession(session);
    setActiveTab("log");
  }, []);

  // Stats
  const thisWeekSessions = sessions.filter((s) => {
    const d = new Date(s.performedAt);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  });

  const totalVolume = thisWeekSessions.reduce((acc, s) => {
    return (
      acc +
      s.exercises.reduce(
        (ea, ex) =>
          ea + ex.sets.reduce((sa, set) => sa + (Number(set.weight) || 0) * set.reps, 0),
        0
      )
    );
  }, 0);

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "log", label: "Log Workout", icon: Plus },
    { id: "history", label: "History", icon: Calendar },
    { id: "exercises", label: "Exercises", icon: Library },
    { id: "templates", label: "Templates", icon: LayoutTemplate },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Dumbbell className="h-6 w-6" />
            Fitness
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {exercises.length} exercises — {sessions.length} workouts logged
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-xl font-bold">{thisWeekSessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Weekly Volume</p>
                <p className="text-xl font-bold">{totalVolume.toLocaleString()} lbs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Dumbbell className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Workouts</p>
                <p className="text-xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
                <p className="text-xl font-bold">
                  {sessions.length > 0
                    ? Math.round(
                        sessions
                          .filter((s) => s.durationMinutes)
                          .reduce((a, s) => a + (s.durationMinutes ?? 0), 0) /
                          (sessions.filter((s) => s.durationMinutes).length || 1)
                      )
                    : 0}{" "}
                  min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "log" && (
        <LogWorkoutTab
          exercises={exercises}
          templates={templates}
          editingSession={editingSession}
          onLogged={() => {
            setEditingSession(null);
            fetchSessions();
          }}
          onCancelEdit={() => setEditingSession(null)}
        />
      )}
      {activeTab === "history" && (
        <HistoryTab sessions={sessions} onDelete={fetchSessions} onEdit={handleEditSession} />
      )}
      {activeTab === "exercises" && (
        <ExercisesTab exercises={exercises} onUpdate={fetchExercises} />
      )}
      {activeTab === "templates" && (
        <TemplatesTab
          templates={templates}
          exercises={exercises}
          onUpdate={fetchTemplates}
        />
      )}
    </div>
  );
}

// ─── Log Workout Tab ────────────────────────────────────

function LogWorkoutTab({
  exercises,
  templates,
  editingSession,
  onLogged,
  onCancelEdit,
}: {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  editingSession: WorkoutSession | null;
  onLogged: () => void;
  onCancelEdit: () => void;
}) {
  const [name, setName] = useState("");
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Watch for workout drafts from Claude
  const workoutDraft = useChatStore((s) => s.workoutDraft);
  const clearWorkoutDraft = useChatStore((s) => s.clearWorkoutDraft);

  // Load workout draft from Claude
  useEffect(() => {
    if (workoutDraft) {
      setName(workoutDraft.name);
      setNotes(workoutDraft.notes || "");
      setEntries(workoutDraft.exercises);
      setEditingSessionId(null);
      setExpandedExercise(0);
      clearWorkoutDraft();
    }
  }, [workoutDraft, clearWorkoutDraft]);

  // Load editing session
  useEffect(() => {
    if (editingSession) {
      setName(editingSession.name);
      setNotes(editingSession.notes || "");
      setDuration(editingSession.durationMinutes?.toString() || "");
      setEditingSessionId(editingSession.id);
      setEntries(
        editingSession.exercises.map((ex) => ({
          exerciseId: ex.exercise.id,
          exerciseName: ex.exercise.name,
          notes: ex.notes || "",
          sets: ex.sets.map((s) => ({
            setNumber: s.setNumber,
            weight: s.weight ? s.weight.toString() : "",
            reps: s.reps.toString(),
            rpe: s.rpe ? s.rpe.toString() : "",
            setType: s.setType,
          })),
        }))
      );
      setExpandedExercise(0);
    }
  }, [editingSession]);

  const loadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setName(template.name);
    setEntries(
      template.exercises.map((te) => ({
        exerciseId: te.exercise.id,
        exerciseName: te.exercise.name,
        notes: te.notes || "",
        sets: Array.from({ length: te.defaultSets }, (_, i) => ({
          setNumber: i + 1,
          weight: te.defaultWeight?.toString() || "",
          reps: te.defaultReps.toString(),
          rpe: "",
          setType: "working",
        })),
      }))
    );
    setExpandedExercise(0);
  };

  const addExercise = (exerciseId: string) => {
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;

    setEntries((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        exerciseName: ex.name,
        notes: "",
        sets: [{ setNumber: 1, weight: "", reps: "10", rpe: "", setType: "working" }],
      },
    ]);
    setExpandedExercise(entries.length);
  };

  const removeExercise = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setExpandedExercise(null);
  };

  const addSet = (exerciseIndex: number) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== exerciseIndex) return e;
        const lastSet = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              setNumber: e.sets.length + 1,
              weight: lastSet?.weight || "",
              reps: lastSet?.reps || "10",
              rpe: "",
              setType: "working",
            },
          ],
        };
      })
    );
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== exerciseIndex) return e;
        return {
          ...e,
          sets: e.sets
            .filter((_, si) => si !== setIndex)
            .map((s, si) => ({ ...s, setNumber: si + 1 })),
        };
      })
    );
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetEntry,
    value: string
  ) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== exerciseIndex) return e;
        return {
          ...e,
          sets: e.sets.map((s, si) => (si === setIndex ? { ...s, [field]: value } : s)),
        };
      })
    );
  };

  const clearForm = () => {
    setName("");
    setEntries([]);
    setDuration("");
    setNotes("");
    setEditingSessionId(null);
  };

  const saveWorkout = async () => {
    if (!name.trim()) {
      toast.error("Give your workout a name");
      return;
    }
    if (entries.length === 0) {
      toast.error("Add at least one exercise");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        performedAt: new Date().toISOString(),
        durationMinutes: duration ? parseInt(duration) : undefined,
        notes: notes.trim() || undefined,
        source: editingSessionId ? undefined : "manual",
        exercises: entries.map((e, i) => ({
          exerciseId: e.exerciseId,
          sortOrder: i,
          notes: e.notes.trim() || undefined,
          sets: e.sets.map((s) => ({
            setNumber: s.setNumber,
            weight: s.weight ? parseFloat(s.weight) : undefined,
            reps: parseInt(s.reps) || 0,
            rpe: s.rpe ? parseInt(s.rpe) : undefined,
            setType: s.setType,
          })),
        })),
      };

      const url = editingSessionId
        ? `/api/fitness/sessions/${editingSessionId}`
        : "/api/fitness/sessions";
      const method = editingSessionId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingSessionId ? "Workout updated" : "Workout logged");
        clearForm();
        onCancelEdit();
        onLogged();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to save workout");
      }
    } catch {
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick load from template */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-muted-foreground">Quick start:</span>
            {templates.map((t) => (
              <Button key={t.id} variant="outline" size="sm" onClick={() => loadTemplate(t.id)}>
                <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
                {t.name}
              </Button>
            ))}
            {templates.length === 0 && (
              <span className="text-sm text-muted-foreground/60">
                No templates yet — create one in the Templates tab
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workout details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          placeholder="Workout name (e.g., Full Body)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Duration (minutes)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <Input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Exercise entries */}
      <div className="space-y-2">
        {entries.map((entry, eIdx) => (
          <Card key={eIdx}>
            <CardContent className="pt-3 pb-3">
              {/* Exercise header */}
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setExpandedExercise(expandedExercise === eIdx ? null : eIdx)}
                >
                  {expandedExercise === eIdx ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-semibold">{entry.exerciseName}</span>
                  <span className="text-muted-foreground font-normal">
                    — {entry.sets.length} set{entry.sets.length !== 1 ? "s" : ""}
                  </span>
                </button>
                <Button variant="ghost" size="sm" onClick={() => removeExercise(eIdx)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>

              {/* Expanded: show sets */}
              {expandedExercise === eIdx && (
                <div className="mt-3 space-y-2">
                  {/* Set headers */}
                  <div className="grid grid-cols-[40px_1fr_1fr_80px_100px_40px] gap-2 text-xs text-muted-foreground px-1">
                    <span>Set</span>
                    <span>Weight (lbs)</span>
                    <span>Reps</span>
                    <span>RPE</span>
                    <span>Type</span>
                    <span />
                  </div>

                  {entry.sets.map((set, sIdx) => (
                    <div
                      key={sIdx}
                      className="grid grid-cols-[40px_1fr_1fr_80px_100px_40px] gap-2 items-center"
                    >
                      <span className="text-sm text-muted-foreground text-center">
                        {set.setNumber}
                      </span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.weight}
                        onChange={(e) => updateSet(eIdx, sIdx, "weight", e.target.value)}
                        className="h-8"
                      />
                      <Input
                        type="number"
                        placeholder="10"
                        value={set.reps}
                        onChange={(e) => updateSet(eIdx, sIdx, "reps", e.target.value)}
                        className="h-8"
                      />
                      <Input
                        type="number"
                        placeholder="1-10"
                        min={1}
                        max={10}
                        value={set.rpe}
                        onChange={(e) => updateSet(eIdx, sIdx, "rpe", e.target.value)}
                        className="h-8"
                      />
                      <Select
                        value={set.setType}
                        onValueChange={(v) => updateSet(eIdx, sIdx, "setType", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warmup">Warmup</SelectItem>
                          <SelectItem value="working">Working</SelectItem>
                          <SelectItem value="drop">Drop</SelectItem>
                          <SelectItem value="failure">Failure</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => removeSet(eIdx, sIdx)}
                        disabled={entry.sets.length <= 1}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => addSet(eIdx)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Set
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add exercise */}
      <div className="flex gap-2">
        <Select onValueChange={addExercise}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="+ Add exercise..." />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(muscleGroupLabels).map((group) => {
              const groupExercises = exercises.filter((e) => e.muscleGroup === group);
              if (groupExercises.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {muscleGroupLabels[group] || group}
                  </div>
                  {groupExercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2">
        {editingSessionId && (
          <Button
            variant="outline"
            onClick={() => {
              clearForm();
              onCancelEdit();
            }}
            size="lg"
          >
            Cancel Edit
          </Button>
        )}
        <Button
          onClick={saveWorkout}
          disabled={saving || entries.length === 0}
          className="flex-1"
          size="lg"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ListChecks className="h-4 w-4 mr-2" />
          )}
          {editingSessionId ? "Update Workout" : "Log Workout"}
        </Button>
      </div>
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────

function HistoryTab({
  sessions,
  onDelete,
  onEdit,
}: {
  sessions: WorkoutSession[];
  onDelete: () => void;
  onEdit: (session: WorkoutSession) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);

  const deleteSession = async (id: string) => {
    const res = await fetch(`/api/fitness/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Workout deleted");
      onDelete();
    } else {
      toast.error("Failed to delete");
    }
  };

  const handleImportSessions = async () => {
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      const payload = Array.isArray(parsed) ? { sessions: parsed } : parsed;
      const res = await fetch("/api/fitness/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Imported ${json.data.sessionsImported} workout(s)`);
        setShowImport(false);
        setImportJson("");
        onDelete(); // triggers refetch
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch (err) {
      toast.error(`Parse error: ${err instanceof Error ? err.message : "Invalid JSON"}`);
    } finally {
      setImporting(false);
    }
  };

  if (sessions.length === 0 && !showImport) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No workouts logged yet. Start by logging your first workout.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Import from Notion
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Import Workouts */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
          <Upload className="h-4 w-4 mr-1" />
          Import Workouts
        </Button>
      </div>
      {showImport && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-2">
              Paste JSON sessions. Format: {`{ "sessions": [{ "name": "Full Body", "date": "2026-03-01", "entries": [{ "exerciseName": "Deadlifts", "sets": 3, "reps": 10, "weight": 135 }] }] }`}
            </p>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder="Paste session JSON..."
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowImport(false)}>Cancel</Button>
              <Button size="sm" onClick={handleImportSessions} disabled={!importJson.trim() || importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {sessions.map((session) => {
        const isExpanded = expanded === session.id;
        const totalVol = session.exercises.reduce(
          (acc, ex) =>
            acc + ex.sets.reduce((sa, s) => sa + (Number(s.weight) || 0) * s.reps, 0),
          0
        );
        const muscleGroups = Array.from(
          new Set(session.exercises.map((e) => e.exercise.muscleGroup))
        );

        return (
          <Card key={session.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => setExpanded(isExpanded ? null : session.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{session.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatDateTime(session.performedAt)}</span>
                      {session.durationMinutes && <span>· {session.durationMinutes} min</span>}
                      <span>· {session.exercises.length} exercises</span>
                      {totalVol > 0 && <span>· {totalVol.toLocaleString()} lbs</span>}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {muscleGroups.map((g) => (
                      <Badge
                        key={g}
                        variant="secondary"
                        className={cn("text-[10px] px-1.5 py-0", muscleGroupColors[g])}
                      >
                        {muscleGroupLabels[g] || g}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(session)}
                    title="Edit workout"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  {session.source !== "import" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 border-t border-border pt-3 space-y-3">
                  {session.exercises.map((ex) => (
                    <div key={ex.id}>
                      <p className="text-sm font-medium">{ex.exercise.name}</p>
                      <div className="mt-1 space-y-0.5">
                        {ex.sets.map((set) => (
                          <div
                            key={set.id}
                            className="text-xs text-muted-foreground flex gap-3"
                          >
                            <span className="w-8">Set {set.setNumber}</span>
                            <span>
                              {set.weight ? `${set.weight} lbs` : "BW"} × {set.reps} reps
                            </span>
                            {set.rpe && <span>RPE {set.rpe}</span>}
                            {set.setType !== "working" && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {set.setType}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                      {ex.notes && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">
                          {ex.notes}
                        </p>
                      )}
                    </div>
                  ))}
                  {session.notes && (
                    <p className="text-xs text-muted-foreground/70 italic border-t border-border pt-2">
                      {session.notes}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Exercises Tab ──────────────────────────────────────

function ExercisesTab({
  exercises,
  onUpdate,
}: {
  exercises: Exercise[];
  onUpdate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newEquip, setNewEquip] = useState("none");
  const [newInstructions, setNewInstructions] = useState("");

  const filtered = exercises.filter((e) => {
    if (filterGroup !== "all" && e.muscleGroup !== filterGroup) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const g = ex.muscleGroup;
    if (!acc[g]) acc[g] = [];
    acc[g].push(ex);
    return acc;
  }, {});

  const addExercise = async () => {
    if (!newName.trim() || !newGroup) return;

    const res = await fetch("/api/fitness/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        muscleGroup: newGroup,
        equipment: newEquip,
        instructions: newInstructions.trim() || undefined,
      }),
    });

    if (res.ok) {
      toast.success("Exercise added");
      setNewName("");
      setNewGroup("");
      setNewEquip("none");
      setNewInstructions("");
      setShowAdd(false);
      onUpdate();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to add");
    }
  };

  const importFromNotion = async () => {
    try {
      const seedRes = await fetch("/scripts/notion-exercises.json");
      if (!seedRes.ok) {
        toast.error("Seed file not found — run the import from the API");
        return;
      }
      const seedData = await seedRes.json();

      const res = await fetch("/api/fitness/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercises: seedData }),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success(
          `Imported ${json.data.exercisesImported} exercises (${json.data.exercisesSkipped} skipped)`
        );
        onUpdate();
      }
    } catch {
      toast.error("Import failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All muscle groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Muscle Groups</SelectItem>
            {Object.entries(muscleGroupLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add Exercise
        </Button>
        <Button variant="outline" size="sm" onClick={importFromNotion}>
          <Upload className="h-4 w-4 mr-1" /> Import from Notion
        </Button>
      </div>

      {/* Add exercise form */}
      {showAdd && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Exercise name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Select value={newGroup} onValueChange={setNewGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Muscle group" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(muscleGroupLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newEquip} onValueChange={setNewEquip}>
                <SelectTrigger>
                  <SelectValue placeholder="Equipment" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(equipmentLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Instructions (optional)"
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              rows={2}
            />
            <Button onClick={addExercise} size="sm">
              Save Exercise
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Exercise list grouped by muscle */}
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, exs]) => (
          <div key={group}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Badge className={cn("text-xs", muscleGroupColors[group])}>
                {muscleGroupLabels[group] || group}
              </Badge>
              <span className="text-xs font-normal">({exs.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {exs
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((ex) => (
                  <Card key={ex.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="pt-3 pb-3">
                      <p className="text-sm font-medium">{ex.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {equipmentLabels[ex.equipment] || ex.equipment}
                        </span>
                      </div>
                      {ex.instructions && (
                        <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">
                          {ex.instructions}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {exercises.length === 0
              ? "No exercises yet. Import from Notion or add manually."
              : "No exercises match your filter."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Templates Tab ──────────────────────────────────────

function TemplatesTab({
  templates,
  exercises,
  onUpdate,
}: {
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  onUpdate: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateExercises, setTemplateExercises] = useState<
    Array<{ exerciseId: string; exerciseName: string; defaultSets: number; defaultReps: number; defaultWeight: string }>
  >([]);
  const [saving, setSaving] = useState(false);

  const addTemplateExercise = (exerciseId: string) => {
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    setTemplateExercises((prev) => [
      ...prev,
      { exerciseId: ex.id, exerciseName: ex.name, defaultSets: 3, defaultReps: 10, defaultWeight: "" },
    ]);
  };

  const removeTemplateExercise = (index: number) => {
    setTemplateExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const saveTemplate = async () => {
    if (!templateName.trim() || templateExercises.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/fitness/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDesc.trim() || undefined,
          exercises: templateExercises.map((e, i) => ({
            exerciseId: e.exerciseId,
            sortOrder: i,
            defaultSets: e.defaultSets,
            defaultReps: e.defaultReps,
            defaultWeight: e.defaultWeight ? parseFloat(e.defaultWeight) : undefined,
          })),
        }),
      });

      if (res.ok) {
        toast.success("Template created");
        setShowCreate(false);
        setTemplateName("");
        setTemplateDesc("");
        setTemplateExercises([]);
        onUpdate();
      }
    } catch {
      toast.error("Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    const res = await fetch(`/api/fitness/templates?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Template deleted");
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowCreate(!showCreate)}>
        <Plus className="h-4 w-4 mr-2" /> Create Template
      </Button>

      {showCreate && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Template name (e.g., Full Body A)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Input
                placeholder="Description (optional)"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
              />
            </div>

            {/* Template exercises */}
            <div className="space-y-2">
              {templateExercises.map((te, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm w-6 text-muted-foreground">{idx + 1}.</span>
                  <span className="text-sm flex-1 font-medium">{te.exerciseName}</span>
                  <Input
                    type="number"
                    placeholder="Sets"
                    value={te.defaultSets}
                    onChange={(e) =>
                      setTemplateExercises((prev) =>
                        prev.map((t, i) =>
                          i === idx ? { ...t, defaultSets: parseInt(e.target.value) || 3 } : t
                        )
                      )
                    }
                    className="w-20 h-8"
                  />
                  <span className="text-xs text-muted-foreground">×</span>
                  <Input
                    type="number"
                    placeholder="Reps"
                    value={te.defaultReps}
                    onChange={(e) =>
                      setTemplateExercises((prev) =>
                        prev.map((t, i) =>
                          i === idx ? { ...t, defaultReps: parseInt(e.target.value) || 10 } : t
                        )
                      )
                    }
                    className="w-20 h-8"
                  />
                  <span className="text-xs text-muted-foreground">@</span>
                  <Input
                    type="number"
                    placeholder="lbs"
                    value={te.defaultWeight}
                    onChange={(e) =>
                      setTemplateExercises((prev) =>
                        prev.map((t, i) =>
                          i === idx ? { ...t, defaultWeight: e.target.value } : t
                        )
                      )
                    }
                    className="w-20 h-8"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => removeTemplateExercise(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <Select onValueChange={addTemplateExercise}>
              <SelectTrigger>
                <SelectValue placeholder="+ Add exercise to template..." />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={saveTemplate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing templates */}
      {templates.map((t) => (
        <Card key={t.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.name}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Used {t._count.sessions} time{t._count.sessions !== 1 ? "s" : ""}
                </span>
                <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
            {t.description && (
              <p className="text-xs text-muted-foreground">{t.description}</p>
            )}
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="space-y-1">
              {t.exercises.map((te, idx) => (
                <div key={te.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-5">{idx + 1}.</span>
                  <span className="flex-1">{te.exercise.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {te.defaultSets} × {te.defaultReps}
                    {te.defaultWeight ? ` @ ${te.defaultWeight} lbs` : ""}
                  </span>
                  <Badge
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      muscleGroupColors[te.exercise.muscleGroup]
                    )}
                  >
                    {muscleGroupLabels[te.exercise.muscleGroup] || te.exercise.muscleGroup}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {templates.length === 0 && !showCreate && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No templates yet. Create your first workout template to speed up logging.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
