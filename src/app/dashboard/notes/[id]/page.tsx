"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Save,
  Pin,
  PinOff,
  Trash2,
  Sparkles,
  Check,
  X,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TiptapEditor } from "@/components/ui/TiptapEditor";

interface NoteAction {
  id: string;
  detectedText: string;
  suggestedActionType: string;
  suggestedActionData: Record<string, unknown> | null;
  status: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  domain: string;
  domainRefId: string | null;
  noteType: string;
  isPinned: boolean;
  hasPendingActions: boolean;
  actions: NoteAction[];
}

const actionTypeLabels: Record<string, string> = {
  create_task: "Create Task",
  add_to_content_calendar: "Content Calendar",
  schedule_email: "Schedule Email",
  create_reminder: "Create Reminder",
  other: "Other",
};

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [domain, setDomain] = useState("life");
  const [isPinned, setIsPinned] = useState(false);

  const fetchNote = useCallback(async () => {
    try {
      const res = await fetch(`/api/notes/${params.id}`);
      const json = await res.json();
      if (res.ok) {
        setNote(json.data);
        setTitle(json.data.title);
        setContent(json.data.content);
        setNoteType(json.data.noteType);
        setDomain(json.data.domain || "life");
        setIsPinned(json.data.isPinned);
      } else {
        toast.error(json.error);
        router.push("/dashboard/notes");
      }
    } catch {
      toast.error("Failed to load note");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, noteType, domain, isPinned }),
      });
      if (res.ok) {
        toast.success("Note saved");
        fetchNote();
      } else {
        const json = await res.json();
        toast.error(json.error);
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note?")) return;
    try {
      await fetch(`/api/notes/${params.id}`, { method: "DELETE" });
      toast.success("Note deleted");
      router.push("/dashboard/notes");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const detectActions = async () => {
    setDetecting(true);
    try {
      // Save first
      await fetch(`/api/notes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, noteType, domain, isPinned }),
      });

      const res = await fetch(`/api/notes/${params.id}/detect-actions`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Found ${json.data.length} action(s)`);
        fetchNote();
      } else {
        toast.error(json.error || "Failed to detect actions");
      }
    } catch {
      toast.error("Failed to detect actions");
    } finally {
      setDetecting(false);
    }
  };

  const handleAction = async (
    actionId: string,
    action: "accepted" | "dismissed"
  ) => {
    try {
      const res = await fetch(`/api/notes/actions/${actionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        if (action === "accepted") {
          await fetch(`/api/notes/actions/${actionId}/execute`, {
            method: "POST",
          });
          toast.success("Action executed");
        } else {
          toast.success("Action dismissed");
        }
        fetchNote();
      }
    } catch {
      toast.error("Failed to update action");
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground py-16 text-center">Loading...</div>
    );
  }

  if (!note) return null;

  const pendingActions = note.actions.filter((a) => a.status === "pending");

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/notes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Notes
      </Link>

      {/* Header: stacks on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="w-[140px] sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {domain === "ayden" ? (
                <>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="reflection">Reflection</SelectItem>
                  <SelectItem value="observation">Observation</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="meeting_notes">Meeting Notes</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <Select value={domain} onValueChange={(val) => {
            setDomain(val);
            // Reset noteType to "general" if current type isn't valid for new domain
            if (val === "ayden" && ["meeting_notes", "checklist"].includes(noteType)) {
              setNoteType("general");
            }
            if (val !== "ayden" && ["research", "reflection", "observation"].includes(noteType)) {
              setNoteType("general");
            }
          }}>
            <SelectTrigger className="w-[100px] sm:w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="life">Life</SelectItem>
              <SelectItem value="mlc">MLC</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="ayden">Ayden</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setIsPinned(!isPinned)}
          >
            {isPinned ? (
              <PinOff className="h-4 w-4 text-amber-500" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {noteType === "meeting_notes" && (
            <Button
              variant="outline"
              size="sm"
              onClick={detectActions}
              disabled={detecting}
            >
              {detecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">Detect Actions</span>
              <span className="sm:hidden">Detect</span>
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {saving ? "Saving..." : "Save"}
            </span>
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-lg sm:text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto py-1"
        placeholder="Note title..."
      />

      {/* Rich Text Editor */}
      <TiptapEditor
        content={content}
        onChange={setContent}
        placeholder="Start writing..."
      />

      {/* Actions Panel */}
      {note.actions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Detected Actions
              {pendingActions.length > 0 && (
                <Badge variant="secondary">{pendingActions.length} pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {note.actions.map((action) => (
              <div
                key={action.id}
                className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {actionTypeLabels[action.suggestedActionType] ||
                        action.suggestedActionType}
                    </Badge>
                    <Badge
                      variant={
                        action.status === "pending" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {action.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground italic truncate sm:whitespace-normal">
                    &ldquo;{action.detectedText}&rdquo;
                  </p>
                </div>
                {action.status === "pending" && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                      onClick={() => handleAction(action.id, "accepted")}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => handleAction(action.id, "dismissed")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
