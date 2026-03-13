"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useChatContext } from "@/hooks/useChatContext";
import { useToolRefresh } from "@/hooks/useToolRefresh";
import {
  Guitar,
  Plus,
  Loader2,
  Clock,
  Calendar,
  Hash,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  BookOpen,
  Video,
  FileText,
  Wrench,
  BookMarked,
  Link2,
  MoreHorizontal,
  Pause,
  Play,
  Archive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ───────────────────────────────────────────────

interface HobbyListItem {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  logCount: number;
  totalMinutes: number;
  lastLogDate: string | null;
}

interface HobbyLog {
  id: string;
  hobbyId: string;
  title: string | null;
  content: string | null;
  duration: number | null;
  mood: string | null;
  createdAt: string;
}

interface HobbyResource {
  id: string;
  hobbyId: string;
  title: string;
  url: string | null;
  resourceType: string;
  notes: string | null;
  createdAt: string;
}

interface HobbyDetail {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  status: string;
  sortOrder: number;
  logs: HobbyLog[];
  resources: HobbyResource[];
  totalMinutes: number;
  _count: { logs: number };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  paused: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  archived: "bg-muted text-muted-foreground border-muted",
};

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  video: Video,
  article: FileText,
  course: BookOpen,
  tool: Wrench,
  book: BookMarked,
  reference: Link2,
  other: MoreHorizontal,
};

function formatDuration(minutes: number): string {
  if (minutes === 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Page ────────────────────────────────────────────────

export default function HobbiesPage() {
  const [hobbies, setHobbies] = useState<HobbyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedHobbyId, setSelectedHobbyId] = useState<string | null>(null);

  const fetchHobbies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);

      const res = await fetch(`/api/hobbies?${params}`).then((r) => r.json());
      if (res.data) setHobbies(res.data);
    } catch (err) {
      console.error("Hobbies fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchHobbies();
  }, [fetchHobbies]);

  useToolRefresh(fetchHobbies);

  // Chat context
  const chatData = useMemo(() => {
    if (hobbies.length === 0) return "No hobbies tracked yet.";
    const lines = hobbies.map((h) => {
      let line = `${h.icon ? h.icon + " " : ""}${h.name} [${h.status}]`;
      line += ` - ${h.logCount} logs, ${formatDuration(h.totalMinutes)}`;
      if (h.lastLogDate) line += `, last: ${formatRelativeDate(h.lastLogDate)}`;
      return line;
    });
    return `Hobbies (${hobbies.length}):\n${lines.join("\n")}`;
  }, [hobbies]);

  useChatContext("Hobbies", chatData);

  const activeCount = hobbies.filter((h) => h.status === "active").length;
  const totalHours = Math.floor(hobbies.reduce((sum, h) => sum + h.totalMinutes, 0) / 60);

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
          <h1 className="text-2xl font-bold">Hobbies</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active{totalHours > 0 ? ` · ${totalHours}h logged` : ""}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Hobby
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["active", "all", "paused", "archived"].map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Add Hobby Form */}
      {showAddForm && (
        <AddHobbyForm
          onClose={() => setShowAddForm(false)}
          onCreated={() => {
            setShowAddForm(false);
            fetchHobbies();
          }}
        />
      )}

      {/* Detail View */}
      {selectedHobbyId && (
        <HobbyDetailView
          hobbyId={selectedHobbyId}
          onClose={() => setSelectedHobbyId(null)}
          onRefresh={fetchHobbies}
        />
      )}

      {/* Hobby Grid */}
      {!selectedHobbyId && (
        <>
          {hobbies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Guitar className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No hobbies yet. Add one to start tracking.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {hobbies.map((hobby) => (
                <HobbyCard
                  key={hobby.id}
                  hobby={hobby}
                  onClick={() => setSelectedHobbyId(hobby.id)}
                  onLogActivity={() => setSelectedHobbyId(hobby.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Hobby Card ──────────────────────────────────────────

function HobbyCard({
  hobby,
  onClick,
  onLogActivity,
}: {
  hobby: HobbyListItem;
  onClick: () => void;
  onLogActivity: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {hobby.icon && (
              <span className="text-lg shrink-0">{hobby.icon}</span>
            )}
            <CardTitle className="text-base truncate">{hobby.name}</CardTitle>
          </div>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[hobby.status] || ""}`}>
            {hobby.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hobby.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {hobby.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            <span>{hobby.logCount} logs</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(hobby.totalMinutes)}</span>
          </div>
        </div>

        {hobby.lastLogDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Last: {formatRelativeDate(hobby.lastLogDate)}</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onLogActivity();
          }}
        >
          <Plus className="h-3 w-3 mr-1" /> Log Activity
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Hobby Detail View ───────────────────────────────────

function HobbyDetailView({
  hobbyId,
  onClose,
  onRefresh,
}: {
  hobbyId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [hobby, setHobby] = useState<HobbyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/hobbies/${hobbyId}`).then((r) => r.json());
      if (res.data) setHobby(res.data);
    } catch (err) {
      console.error("Hobby detail fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [hobbyId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useToolRefresh(fetchDetail);

  if (loading || !hobby) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/hobbies/${hobbyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchDetail();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this hobby and all its logs and resources?")) return;
    await fetch(`/api/hobbies/${hobbyId}`, { method: "DELETE" });
    onRefresh();
    onClose();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {hobby.icon && <span className="text-xl">{hobby.icon}</span>}
            <div>
              <CardTitle className="text-lg">{hobby.name}</CardTitle>
              {hobby.description && (
                <p className="text-sm text-muted-foreground mt-1">{hobby.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={STATUS_COLORS[hobby.status] || ""}>
              {hobby.status}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Hash className="h-3.5 w-3.5" />
            {hobby._count.logs} sessions
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(hobby.totalMinutes)}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="activity">
          <TabsList className="mb-4">
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Recent Activity</h4>
              <Button size="sm" variant="outline" onClick={() => setShowLogForm(!showLogForm)}>
                <Plus className="h-3 w-3 mr-1" /> Log Activity
              </Button>
            </div>

            {showLogForm && (
              <LogActivityForm
                hobbyId={hobbyId}
                onClose={() => setShowLogForm(false)}
                onSaved={() => {
                  setShowLogForm(false);
                  fetchDetail();
                  onRefresh();
                }}
              />
            )}

            {hobby.logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No activity logged yet.
              </p>
            ) : (
              <div className="space-y-2">
                {hobby.logs.map((log) => (
                  <div key={log.id} className="border-l-2 border-muted pl-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {new Date(log.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {log.duration && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {formatDuration(log.duration)}
                        </span>
                      )}
                      {log.mood && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {log.mood}
                        </Badge>
                      )}
                    </div>
                    {log.title && (
                      <p className="text-sm font-medium mt-0.5">{log.title}</p>
                    )}
                    {log.content && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {log.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Saved Resources</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowResourceForm(!showResourceForm)}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Resource
              </Button>
            </div>

            {showResourceForm && (
              <AddResourceForm
                hobbyId={hobbyId}
                onClose={() => setShowResourceForm(false)}
                onSaved={() => {
                  setShowResourceForm(false);
                  fetchDetail();
                }}
              />
            )}

            {hobby.resources.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No resources saved yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hobby.resources.map((resource) => {
                  const TypeIcon = RESOURCE_ICONS[resource.resourceType] || MoreHorizontal;
                  return (
                    <div
                      key={resource.id}
                      className="border rounded-lg p-3 space-y-1.5"
                    >
                      <div className="flex items-start gap-2">
                        <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{resource.title}</p>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 mt-0.5">
                            {resource.resourceType}
                          </Badge>
                        </div>
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {resource.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {resource.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            {isEditing ? (
              <EditHobbyForm
                hobby={hobby}
                onClose={() => setIsEditing(false)}
                onSaved={() => {
                  setIsEditing(false);
                  fetchDetail();
                  onRefresh();
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  {hobby.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange("paused")}
                    >
                      <Pause className="h-3 w-3 mr-1" /> Pause
                    </Button>
                  )}
                  {hobby.status === "paused" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange("active")}
                    >
                      <Play className="h-3 w-3 mr-1" /> Resume
                    </Button>
                  )}
                  {hobby.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange("archived")}
                    >
                      <Archive className="h-3 w-3 mr-1" /> Archive
                    </Button>
                  )}
                  {hobby.status === "archived" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange("active")}
                    >
                      <Play className="h-3 w-3 mr-1" /> Reactivate
                    </Button>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete Hobby
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will permanently delete all logs and resources.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── Add Hobby Form ──────────────────────────────────────

function AddHobbyForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await fetch("/api/hobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon: icon.trim() || null,
        }),
      });
      onCreated();
    } catch (err) {
      console.error("Create hobby error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">New Hobby</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
              <Input
                placeholder="e.g. icon or emoji"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="text-center"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <Input
                placeholder="Guitar, 3D Printing, Electronics..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Textarea
              placeholder="What's this hobby about? (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Edit Hobby Form ─────────────────────────────────────

function EditHobbyForm({
  hobby,
  onClose,
  onSaved,
}: {
  hobby: HobbyDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(hobby.name);
  const [description, setDescription] = useState(hobby.description || "");
  const [icon, setIcon] = useState(hobby.icon || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await fetch(`/api/hobbies/${hobby.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon: icon.trim() || null,
        }),
      });
      onSaved();
    } catch (err) {
      console.error("Edit hobby error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <div className="w-16">
          <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="text-center" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim() || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </form>
  );
}

// ─── Log Activity Form ───────────────────────────────────

function LogActivityForm({
  hobbyId,
  onClose,
  onSaved,
}: {
  hobbyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (title.trim()) body.title = title.trim();
      if (duration) body.duration = parseInt(duration, 10);
      if (content.trim()) body.content = content.trim();
      if (mood.trim()) body.mood = mood.trim();

      await fetch(`/api/hobbies/${hobbyId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      console.error("Log activity error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="What did you work on?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration (min)</label>
              <Input
                type="number"
                min="0"
                placeholder="30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Mood</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select...</option>
                <option value="great">Great</option>
                <option value="good">Good</option>
                <option value="okay">Okay</option>
                <option value="frustrated">Frustrated</option>
                <option value="struggling">Struggling</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <Textarea
              placeholder="Details, observations, breakthroughs..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || (!title.trim() && !duration && !content.trim())}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Add Resource Form ───────────────────────────────────

function AddResourceForm({
  hobbyId,
  onClose,
  onSaved,
}: {
  hobbyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [resourceType, setResourceType] = useState("article");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await fetch(`/api/hobbies/${hobbyId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim() || null,
          resourceType,
          notes: notes.trim() || null,
        }),
      });
      onSaved();
    } catch (err) {
      console.error("Add resource error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Resource title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="course">Course</option>
                <option value="tool">Tool</option>
                <option value="book">Book</option>
                <option value="reference">Reference</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL</label>
              <Input
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <Textarea
              placeholder="Why is this useful?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!title.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
