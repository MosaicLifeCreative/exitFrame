"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Bell,
  Pencil,
  Loader2,
  X,
  Repeat,
  Bot,
  User,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Reminder {
  id: string;
  title: string;
  remindAt: string;
  fired: boolean;
  firedAt: string | null;
  recurring: string | null;
  createdBy: string;
  createdAt: string;
}

type FilterStatus = "upcoming" | "fired" | "all";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
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
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeValue(local: string): string {
  const d = new Date(local);
  const localStr = d.toLocaleString("en-US", {
    timeZoneName: "shortOffset",
  });
  const offsetMatch = localStr.match(/GMT([+-]\d+)/);
  const offset = offsetMatch ? offsetMatch[1] : new Date().getTimezoneOffset() <= 0 ? `+${-new Date().getTimezoneOffset() / 60}` : `-${new Date().getTimezoneOffset() / 60}`;
  const paddedOffset =
    offset.length === 2
      ? `${offset[0]}0${offset[1]}:00`
      : `${offset}:00`;
  return `${local}:00${paddedOffset}`;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("upcoming");
  const [showDialog, setShowDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formRemindAt, setFormRemindAt] = useState("");
  const [formRecurring, setFormRecurring] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await fetch(`/api/reminders?status=${filter}`);
      const json = await res.json();
      if (json.data) setReminders(json.data);
    } catch {
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchReminders();
  }, [fetchReminders]);

  const openCreate = () => {
    setFormTitle("");
    setFormRecurring("none");
    // Default to 1 hour from now
    const soon = new Date();
    soon.setHours(soon.getHours() + 1);
    soon.setMinutes(0, 0, 0);
    setFormRemindAt(toLocalDatetimeValue(soon.toISOString()));
    setEditingReminder(null);
    setShowDialog(true);
  };

  const openEdit = (reminder: Reminder) => {
    setFormTitle(reminder.title);
    setFormRemindAt(toLocalDatetimeValue(reminder.remindAt));
    setFormRecurring(reminder.recurring || "none");
    setEditingReminder(reminder);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formRemindAt) {
      toast.error("Title and time are required");
      return;
    }

    setSaving(true);
    try {
      const remindAtISO = fromLocalDatetimeValue(formRemindAt);
      const recurring = formRecurring === "none" ? null : formRecurring;

      if (editingReminder) {
        const res = await fetch("/api/reminders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingReminder.id,
            title: formTitle.trim(),
            remindAt: remindAtISO,
            recurring,
            fired: false, // Reset if rescheduling
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Reminder updated");
      } else {
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            remindAt: remindAtISO,
            recurring,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Reminder set");
      }

      setShowDialog(false);
      fetchReminders();
    } catch {
      toast.error("Failed to save reminder");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/reminders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast.success("Reminder deleted");
    } catch {
      toast.error("Failed to delete reminder");
    }
  };

  const handleSnooze = async (reminder: Reminder, minutes: number) => {
    try {
      const newTime = new Date();
      newTime.setMinutes(newTime.getMinutes() + minutes);

      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reminder.title,
          remindAt: newTime.toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Snoozed for ${minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}`);
      fetchReminders();
    } catch {
      toast.error("Failed to snooze");
    }
  };

  const now = new Date();
  const upcomingCount = reminders.filter((r) => !r.fired).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reminders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Push notifications on a timer. Checked every minute.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Reminder
        </Button>
      </div>

      {/* Stats */}
      {upcomingCount > 0 && filter === "upcoming" && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{upcomingCount}</span>{" "}
          upcoming
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["upcoming", "fired", "all"] as FilterStatus[]).map((s) => (
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

      {/* Reminder list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>
            {filter === "upcoming"
              ? "No upcoming reminders"
              : filter === "fired"
                ? "No completed reminders"
                : "No reminders yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => {
            const remindDate = new Date(reminder.remindAt);
            const isOverdue = !reminder.fired && remindDate < now;

            return (
              <Card
                key={reminder.id}
                className={`transition-colors ${
                  reminder.fired
                    ? "opacity-60"
                    : isOverdue
                      ? "border-amber-500/30"
                      : ""
                }`}
              >
                <CardContent className="flex items-start gap-3 py-3 px-4">
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    {reminder.fired ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Bell className={`h-5 w-5 ${isOverdue ? "text-amber-400" : "text-muted-foreground"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${reminder.fired ? "line-through text-muted-foreground" : ""}`}>
                      {reminder.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          isOverdue ? "text-amber-400" : "text-muted-foreground"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {formatDateTime(reminder.remindAt)}
                        <span className="opacity-60">
                          ({formatRelative(reminder.remindAt)})
                        </span>
                      </span>
                      {reminder.recurring && (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0">
                          <Repeat className="h-2.5 w-2.5" />
                          {reminder.recurring}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] gap-1 py-0">
                        {reminder.createdBy === "ayden" ? (
                          <><Bot className="h-2.5 w-2.5" /> Ayden</>
                        ) : (
                          <><User className="h-2.5 w-2.5" /> Trey</>
                        )}
                      </Badge>
                      {isOverdue && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-400 border-amber-400/30 py-0"
                        >
                          Overdue
                        </Badge>
                      )}
                      {reminder.fired && reminder.firedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          Fired {formatDateTime(reminder.firedAt)}
                        </span>
                      )}
                    </div>

                    {/* Snooze buttons for fired reminders */}
                    {reminder.fired && (
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => handleSnooze(reminder, 15)}
                          className="text-[10px] px-2 py-0.5 rounded bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          +15m
                        </button>
                        <button
                          onClick={() => handleSnooze(reminder, 60)}
                          className="text-[10px] px-2 py-0.5 rounded bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          +1h
                        </button>
                        <button
                          onClick={() => handleSnooze(reminder, 720)}
                          className="text-[10px] px-2 py-0.5 rounded bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Tomorrow
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!reminder.fired && (
                      <button
                        onClick={() => openEdit(reminder)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(reminder.id)}
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
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReminder ? "Edit Reminder" : "New Reminder"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">What to remind about</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Call the dentist..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="remindAt">When (ET)</Label>
              <Input
                id="remindAt"
                type="datetime-local"
                value={formRemindAt}
                onChange={(e) => setFormRemindAt(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="recurring">Repeat</Label>
              <Select value={formRecurring} onValueChange={setFormRecurring}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editingReminder ? "Update" : "Set Reminder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
