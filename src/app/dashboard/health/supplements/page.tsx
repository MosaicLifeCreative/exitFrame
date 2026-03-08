"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useChatContext } from "@/hooks/useChatContext";
import {
  Pill,
  Plus,
  Trash2,
  Loader2,
  X,
  Pencil,
  Pause,
  Play,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────

interface Supplement {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string;
  category: string | null;
  notes: string | null;
  isActive: boolean;
  startDate: string | null;
}

// ─── Page ────────────────────────────────────────────────

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/health/supplements?all=true").then((r) => r.json());
      if (res.data) setSupplements(res.data);
    } catch (err) {
      console.error("Supplements fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteSupplement = async (id: string) => {
    await fetch(`/api/health/supplements/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const togglePause = async (id: string, currentlyActive: boolean) => {
    await fetch(`/api/health/supplements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentlyActive }),
    });
    await fetchData();
  };

  const activeSupplements = supplements.filter((s) => s.isActive);
  const pausedSupplements = supplements.filter((s) => !s.isActive);

  const chatContext = useMemo(() => {
    const parts = ["Page: Supplements"];
    if (activeSupplements.length > 0) {
      parts.push(`Current supplement stack (${activeSupplements.length}):`);
      for (const s of activeSupplements) {
        parts.push(`  ${s.name} ${s.dosage || ""} (${s.frequency})${s.notes ? ` — ${s.notes}` : ""}`);
      }
    }
    if (pausedSupplements.length > 0) {
      parts.push(`Paused supplements (${pausedSupplements.length}):`);
      for (const s of pausedSupplements) {
        parts.push(`  ${s.name} ${s.dosage || ""} (${s.frequency})`);
      }
    }
    return parts.join("\n");
  }, [activeSupplements, pausedSupplements]);

  useChatContext("Supplements", chatContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supplements</h1>
          <p className="text-sm text-muted-foreground">
            {activeSupplements.length > 0
              ? `${activeSupplements.length} active supplement${activeSupplements.length !== 1 ? "s" : ""}${pausedSupplements.length > 0 ? `, ${pausedSupplements.length} paused` : ""}`
              : "Track what you're currently taking"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <AddSupplementForm
          onClose={() => setShowAddForm(false)}
          onAdded={fetchData}
        />
      )}

      {/* Active Supplements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Current Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeSupplements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Pill className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active supplements</p>
              <p className="text-xs mt-1">Add supplements above or tell Claude what you take</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activeSupplements.map((sup) =>
                editingId === sup.id ? (
                  <EditSupplementForm
                    key={sup.id}
                    supplement={sup}
                    onClose={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      fetchData();
                    }}
                  />
                ) : (
                  <SupplementRow
                    key={sup.id}
                    supplement={sup}
                    onEdit={() => setEditingId(sup.id)}
                    onTogglePause={() => togglePause(sup.id, sup.isActive)}
                    onDelete={() => deleteSupplement(sup.id)}
                  />
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paused Supplements */}
      {pausedSupplements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <Pause className="h-4 w-4" />
              Paused
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {pausedSupplements.map((sup) =>
                editingId === sup.id ? (
                  <EditSupplementForm
                    key={sup.id}
                    supplement={sup}
                    onClose={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      fetchData();
                    }}
                  />
                ) : (
                  <SupplementRow
                    key={sup.id}
                    supplement={sup}
                    paused
                    onEdit={() => setEditingId(sup.id)}
                    onTogglePause={() => togglePause(sup.id, sup.isActive)}
                    onDelete={() => deleteSupplement(sup.id)}
                  />
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Supplement Row ─────────────────────────────────────

function SupplementRow({
  supplement: sup,
  paused = false,
  onEdit,
  onTogglePause,
  onDelete,
}: {
  supplement: Supplement;
  paused?: boolean;
  onEdit: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group ${paused ? "opacity-50" : ""}`}
    >
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${paused ? "bg-muted" : "bg-primary/10"}`}>
        <Pill className={`h-4 w-4 ${paused ? "text-muted-foreground" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium flex items-center gap-2">
          {sup.name}
          {paused && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Paused
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {[sup.dosage, sup.frequency !== "daily" ? sup.frequency : null, sup.notes]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      {sup.category && (
        <Badge variant="outline" className="text-xs shrink-0">
          {sup.category}
        </Badge>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={onEdit}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Edit supplement"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onTogglePause}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={paused ? "Resume supplement" : "Pause supplement"}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete supplement"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Edit Supplement Form (Inline) ──────────────────────

function EditSupplementForm({
  supplement,
  onClose,
  onSaved,
}: {
  supplement: Supplement;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(supplement.name);
  const [dosage, setDosage] = useState(supplement.dosage || "");
  const [frequency, setFrequency] = useState(supplement.frequency);
  const [category, setCategory] = useState(supplement.category || "");
  const [notes, setNotes] = useState(supplement.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await fetch(`/api/health/supplements/${supplement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dosage: dosage.trim() || null,
          frequency,
          category: category || null,
          notes: notes.trim() || null,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Creatine Monohydrate"
              required
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-muted-foreground mb-1 block">Dosage</label>
            <Input
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="5g"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="twice-daily">Twice Daily</option>
              <option value="weekly">Weekly</option>
              <option value="as-needed">As Needed</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              <option value="vitamin">Vitamin</option>
              <option value="mineral">Mineral</option>
              <option value="amino-acid">Amino Acid</option>
              <option value="herb">Herb</option>
              <option value="probiotic">Probiotic</option>
              <option value="protein">Protein</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Take with food, morning only, etc."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Add Supplement Form ─────────────────────────────────

function AddSupplementForm({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await fetch("/api/health/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dosage: dosage.trim() || undefined,
          frequency,
          category: category || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Add Supplement</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Creatine Monohydrate"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-muted-foreground mb-1 block">Dosage</label>
              <Input
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="5g"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="twice-daily">Twice Daily</option>
                <option value="weekly">Weekly</option>
                <option value="as-needed">As Needed</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">None</option>
                <option value="vitamin">Vitamin</option>
                <option value="mineral">Mineral</option>
                <option value="amino-acid">Amino Acid</option>
                <option value="herb">Herb</option>
                <option value="probiotic">Probiotic</option>
                <option value="protein">Protein</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Take with food, morning only, etc."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Supplement
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
