"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useChatContext } from "@/hooks/useChatContext";
import {
  HeartPulse,
  Plus,
  Trash2,
  Loader2,
  X,
  Pencil,
  Check,
  Users,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// --- Types -----------------------------------------------------------

interface FamilyCondition {
  id: string;
  conditionName: string;
  ageOfOnset: number | null;
  notes: string | null;
}

interface FamilyMember {
  id: string;
  relation: string;
  name: string | null;
  isAlive: boolean;
  notes: string | null;
  conditions: FamilyCondition[];
}

interface ConditionRow {
  conditionName: string;
  ageOfOnset: string;
  notes: string;
}

// --- Relation helpers ------------------------------------------------

const RELATION_OPTIONS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent-maternal", label: "Maternal Grandparent" },
  { value: "grandparent-paternal", label: "Paternal Grandparent" },
  { value: "aunt-maternal", label: "Maternal Aunt" },
  { value: "aunt-paternal", label: "Paternal Aunt" },
  { value: "uncle-maternal", label: "Maternal Uncle" },
  { value: "uncle-paternal", label: "Paternal Uncle" },
  { value: "cousin", label: "Cousin" },
  { value: "child", label: "Child" },
  { value: "other", label: "Other" },
];

function formatRelation(relation: string): string {
  const found = RELATION_OPTIONS.find((r) => r.value === relation);
  if (found) return found.label;
  // fallback: title-case and replace hyphens
  return relation
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// --- Page ------------------------------------------------------------

export default function FamilyHistoryPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingConditionId, setAddingConditionId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/health/family").then((r) => r.json());
      if (res.data) setMembers(res.data);
    } catch (err) {
      console.error("Family history fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteMember = async (id: string) => {
    await fetch(`/api/health/family/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const deleteCondition = async (memberId: string, conditionId: string) => {
    await fetch(
      `/api/health/family/${memberId}/conditions?conditionId=${conditionId}`,
      { method: "DELETE" }
    );
    await fetchData();
  };

  const chatContext = useMemo(() => {
    const parts = ["Page: Family Health History"];
    if (members.length === 0) {
      parts.push("No family health history recorded yet.");
      return parts.join("\n");
    }
    parts.push(`${members.length} family member(s) on record:`);
    for (const m of members) {
      const label = formatRelation(m.relation);
      const nameStr = m.name ? ` (${m.name})` : "";
      const alive = m.isAlive ? "living" : "deceased";
      parts.push(`  ${label}${nameStr} — ${alive}`);
      if (m.notes) parts.push(`    Notes: ${m.notes}`);
      if (m.conditions.length > 0) {
        for (const c of m.conditions) {
          const onset = c.ageOfOnset ? `, onset age ${c.ageOfOnset}` : "";
          const cNotes = c.notes ? ` (${c.notes})` : "";
          parts.push(`    - ${c.conditionName}${onset}${cNotes}`);
        }
      } else {
        parts.push("    No conditions recorded");
      }
    }
    return parts.join("\n");
  }, [members]);

  useChatContext("Family History", chatContext);

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
          <h1 className="text-2xl font-bold">Family Health History</h1>
          <p className="text-sm text-muted-foreground">
            {members.length > 0
              ? `${members.length} family member${members.length !== 1 ? "s" : ""} on record`
              : "Track hereditary conditions and family health patterns"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Family Member
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <AddMemberForm
          onClose={() => setShowAddForm(false)}
          onAdded={fetchData}
        />
      )}

      {/* Empty State */}
      {members.length === 0 && !showAddForm && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No family health history yet</p>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                Add family members and their health conditions to give Claude
                context for analyzing your bloodwork and health data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Cards */}
      {members.map((member) =>
        editingId === member.id ? (
          <EditMemberForm
            key={member.id}
            member={member}
            onClose={() => setEditingId(null)}
            onSaved={() => {
              setEditingId(null);
              fetchData();
            }}
          />
        ) : (
          <MemberCard
            key={member.id}
            member={member}
            onEdit={() => setEditingId(member.id)}
            onDelete={() => deleteMember(member.id)}
            onDeleteCondition={(conditionId) =>
              deleteCondition(member.id, conditionId)
            }
            showAddCondition={addingConditionId === member.id}
            onToggleAddCondition={() =>
              setAddingConditionId(
                addingConditionId === member.id ? null : member.id
              )
            }
            onConditionAdded={() => {
              setAddingConditionId(null);
              fetchData();
            }}
          />
        )
      )}
    </div>
  );
}

// --- Member Card -----------------------------------------------------

function MemberCard({
  member,
  onEdit,
  onDelete,
  onDeleteCondition,
  showAddCondition,
  onToggleAddCondition,
  onConditionAdded,
}: {
  member: FamilyMember;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteCondition: (conditionId: string) => void;
  showAddCondition: boolean;
  onToggleAddCondition: () => void;
  onConditionAdded: () => void;
}) {
  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {formatRelation(member.relation)}
                {member.name && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({member.name})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    member.isAlive ? "bg-green-500" : "bg-muted-foreground"
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {member.isAlive ? "Living" : "Deceased"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all">
            <button
              onClick={onEdit}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit member"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete member"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {member.notes && (
          <p className="text-xs text-muted-foreground">{member.notes}</p>
        )}

        {/* Conditions */}
        {member.conditions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {member.conditions.map((c) => (
              <div key={c.id} className="group/cond inline-flex items-center">
                <Badge
                  variant="secondary"
                  className="text-xs gap-1 pr-1"
                >
                  <HeartPulse className="h-3 w-3" />
                  {c.conditionName}
                  {c.ageOfOnset && (
                    <span className="text-muted-foreground ml-0.5">
                      (age {c.ageOfOnset})
                    </span>
                  )}
                  <button
                    onClick={() => onDeleteCondition(c.id)}
                    className="ml-0.5 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover/cond:opacity-100 transition-all"
                    title="Remove condition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No conditions recorded
          </p>
        )}

        {/* Add Condition */}
        <div>
          {showAddCondition ? (
            <AddConditionInline
              memberId={member.id}
              onClose={onToggleAddCondition}
              onAdded={onConditionAdded}
            />
          ) : (
            <button
              onClick={onToggleAddCondition}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add condition
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Add Condition Inline --------------------------------------------

function AddConditionInline({
  memberId,
  onClose,
  onAdded,
}: {
  memberId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [conditionName, setConditionName] = useState("");
  const [ageOfOnset, setAgeOfOnset] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionName.trim()) return;

    setSaving(true);
    try {
      await fetch(`/api/health/family/${memberId}/conditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conditionName: conditionName.trim(),
          ageOfOnset: ageOfOnset ? parseInt(ageOfOnset, 10) : null,
          notes: notes.trim() || null,
        }),
      });
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-2 rounded-lg border border-border bg-muted/30"
    >
      <div className="flex-1">
        <label className="text-xs text-muted-foreground mb-1 block">
          Condition
        </label>
        <Input
          value={conditionName}
          onChange={(e) => setConditionName(e.target.value)}
          placeholder="e.g. Type 2 Diabetes"
          required
          className="h-8 text-sm"
        />
      </div>
      <div className="w-24">
        <label className="text-xs text-muted-foreground mb-1 block">
          Age of Onset
        </label>
        <Input
          type="number"
          value={ageOfOnset}
          onChange={(e) => setAgeOfOnset(e.target.value)}
          placeholder="Age"
          min={0}
          max={120}
          className="h-8 text-sm"
        />
      </div>
      <div className="w-32">
        <label className="text-xs text-muted-foreground mb-1 block">
          Notes
        </label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          className="h-8 text-sm"
        />
      </div>
      <Button
        type="submit"
        size="sm"
        className="h-8"
        disabled={!conditionName.trim() || saving}
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}

// --- Add Member Form -------------------------------------------------

function AddMemberForm({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [relation, setRelation] = useState("mother");
  const [name, setName] = useState("");
  const [isAlive, setIsAlive] = useState(true);
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [saving, setSaving] = useState(false);

  const addConditionRow = () => {
    setConditions([
      ...conditions,
      { conditionName: "", ageOfOnset: "", notes: "" },
    ]);
  };

  const updateConditionRow = (
    index: number,
    field: keyof ConditionRow,
    value: string
  ) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const removeConditionRow = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      await fetch("/api/health/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relation,
          name: name.trim() || null,
          isAlive,
          notes: notes.trim() || null,
          conditions: conditions
            .filter((c) => c.conditionName.trim())
            .map((c) => ({
              conditionName: c.conditionName.trim(),
              ageOfOnset: c.ageOfOnset ? parseInt(c.ageOfOnset, 10) : null,
              notes: c.notes.trim() || null,
            })),
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
            <h3 className="text-sm font-medium">Add Family Member</h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Relation
              </label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {RELATION_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Name (optional)
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane"
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <label className="text-xs text-muted-foreground">
                Living status
              </label>
              <button
                type="button"
                onClick={() => setIsAlive(!isAlive)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  isAlive ? "bg-green-500" : "bg-muted-foreground"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                    isAlive ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs text-muted-foreground">
                {isAlive ? "Living" : "Deceased"}
              </span>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                Notes
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="General health notes, cause of death, etc."
              />
            </div>
          </div>

          {/* Conditions Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground font-medium">
                Health Conditions
              </label>
              <button
                type="button"
                onClick={addConditionRow}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add condition
              </button>
            </div>

            {conditions.length === 0 && (
              <p className="text-xs text-muted-foreground/60 italic">
                No conditions added yet
              </p>
            )}

            {conditions.map((c, i) => (
              <div
                key={i}
                className="flex items-end gap-2 p-2 rounded-lg border border-border bg-muted/20"
              >
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Condition
                  </label>
                  <Input
                    value={c.conditionName}
                    onChange={(e) =>
                      updateConditionRow(i, "conditionName", e.target.value)
                    }
                    placeholder="e.g. Heart Disease"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Age of Onset
                  </label>
                  <Input
                    type="number"
                    value={c.ageOfOnset}
                    onChange={(e) =>
                      updateConditionRow(i, "ageOfOnset", e.target.value)
                    }
                    placeholder="Age"
                    min={0}
                    max={120}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Notes
                  </label>
                  <Input
                    value={c.notes}
                    onChange={(e) =>
                      updateConditionRow(i, "notes", e.target.value)
                    }
                    placeholder="Optional"
                    className="h-8 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeConditionRow(i)}
                  className="p-1.5 h-8 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove condition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Member
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Edit Member Form ------------------------------------------------

function EditMemberForm({
  member,
  onClose,
  onSaved,
}: {
  member: FamilyMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [relation, setRelation] = useState(member.relation);
  const [name, setName] = useState(member.name || "");
  const [isAlive, setIsAlive] = useState(member.isAlive);
  const [notes, setNotes] = useState(member.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      await fetch(`/api/health/family/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relation,
          name: name.trim() || null,
          isAlive,
          notes: notes.trim() || null,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">
              Edit {formatRelation(member.relation)}
              {member.name ? ` (${member.name})` : ""}
            </h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Relation
              </label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {RELATION_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Name (optional)
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane"
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <label className="text-xs text-muted-foreground">
                Living status
              </label>
              <button
                type="button"
                onClick={() => setIsAlive(!isAlive)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  isAlive ? "bg-green-500" : "bg-muted-foreground"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                    isAlive ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs text-muted-foreground">
                {isAlive ? "Living" : "Deceased"}
              </span>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                Notes
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="General health notes, cause of death, etc."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
