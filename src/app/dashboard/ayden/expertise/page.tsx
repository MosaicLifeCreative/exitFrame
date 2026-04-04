"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  X,
} from "lucide-react";

interface ExpertiseEntry {
  id: string;
  system: string;
  description: string;
  details: string | null;
  createdAt: string;
  updatedAt: string;
}

// Map system prefixes to domain labels
function getDomain(system: string): string {
  if (system.startsWith("fitness_")) return "Fitness";
  if (system.startsWith("investing_")) return "Investing";
  if (system.startsWith("nutrition_")) return "Nutrition";
  if (system.startsWith("health_")) return "Health";
  if (system.startsWith("therapy_")) return "Therapy";
  if (system.startsWith("expertise_")) {
    const rest = system.replace("expertise_", "").replace(/_/g, " ");
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return "General";
}

function getTitle(system: string): string {
  // Remove prefix, replace underscores, title case
  const cleaned = system
    .replace(/^(fitness_|investing_|nutrition_|health_|therapy_|expertise_)/, "")
    .replace(/_/g, " ");
  return cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const domainColors: Record<string, string> = {
  Fitness: "bg-green-500/20 text-green-400 border-green-500/30",
  Investing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Nutrition: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Health: "bg-red-500/20 text-red-400 border-red-500/30",
  Therapy: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  General: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function ExpertisePage() {
  const [entries, setEntries] = useState<ExpertiseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDetails, setEditDetails] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newSystem, setNewSystem] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDetails, setNewDetails] = useState("");

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/ayden/expertise");
      const json = await res.json();
      if (json.data) setEntries(json.data);
    } catch {
      toast.error("Failed to load expertise");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const startEdit = (entry: ExpertiseEntry) => {
    setEditingId(entry.id);
    setEditDetails(entry.details || "");
    setEditDescription(entry.description);
    setExpandedId(entry.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDetails("");
    setEditDescription("");
  };

  const handleSave = async (entry: ExpertiseEntry) => {
    setSaving(true);
    try {
      const res = await fetch("/api/ayden/expertise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: entry.system,
          description: editDescription,
          details: editDetails,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Expertise updated");
      cancelEdit();
      fetchEntries();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expertise document? Ayden will lose this knowledge.")) return;
    try {
      const res = await fetch(`/api/ayden/expertise?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Expertise removed");
      fetchEntries();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCreate = async () => {
    if (!newSystem.trim() || !newDescription.trim() || !newDetails.trim()) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ayden/expertise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: newSystem.trim().toLowerCase().replace(/\s+/g, "_"),
          description: newDescription.trim(),
          details: newDetails.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Expertise added");
      setShowNew(false);
      setNewSystem("");
      setNewDescription("");
      setNewDetails("");
      fetchEntries();
    } catch {
      toast.error("Failed to create");
    } finally {
      setSaving(false);
    }
  };

  // Group by domain
  const grouped = entries.reduce<Record<string, ExpertiseEntry[]>>((acc, entry) => {
    const domain = getDomain(entry.system);
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(entry);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Expertise
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Domain knowledge that makes Ayden an expert, not just an assistant.
            Automatically retrieved when relevant topics come up in conversation.
          </p>
        </div>
        <Button
          size="sm"
          variant={showNew ? "outline" : "default"}
          onClick={() => setShowNew(!showNew)}
        >
          {showNew ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showNew ? "Cancel" : "New Document"}
        </Button>
      </div>

      {showNew && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Expertise Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  System Key
                </label>
                <Input
                  value={newSystem}
                  onChange={(e) => setNewSystem(e.target.value)}
                  placeholder="e.g., nutrition_philosophy or investing_strategy"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Prefix with domain: fitness_, investing_, nutrition_, health_, therapy_
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Short Description
                </label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="One-line summary for RAG retrieval matching"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Full Document
              </label>
              <Textarea
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="The expertise content Ayden will reason from. Be specific and opinionated — this is her training material."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && !showNew ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No expertise documents yet</p>
            <p className="text-sm mt-1">
              Add domain knowledge to make Ayden an expert in specific areas.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([domain, domainEntries]) => (
          <div key={domain} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Badge
                variant="outline"
                className={domainColors[domain] || domainColors.General}
              >
                {domain}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {domainEntries.length} document{domainEntries.length !== 1 ? "s" : ""}
              </span>
            </div>

            {domainEntries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const isEditing = editingId === entry.id;

              return (
                <Card key={entry.id}>
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => {
                      if (isEditing) return;
                      setExpandedId(isExpanded ? null : entry.id);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{getTitle(entry.system)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span className="text-xs text-muted-foreground mr-2">
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </span>
                      {!isEditing && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(entry);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(entry.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <CardContent className="pt-0 pb-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                              Description (for RAG matching)
                            </label>
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                              Full Document
                            </label>
                            <Textarea
                              value={editDetails}
                              onChange={(e) => setEditDetails(e.target.value)}
                              rows={16}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSave(entry)}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Save className="h-4 w-4 mr-1" />
                              )}
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground bg-muted/30 rounded-md p-3 max-h-96 overflow-y-auto">
                          {entry.details || "(empty)"}
                        </pre>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
