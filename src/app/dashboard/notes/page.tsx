"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pin,
  PinOff,
  AlertCircle,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Note {
  id: string;
  title: string;
  domain: string;
  domainRefId: string | null;
  noteType: string;
  isPinned: boolean;
  hasPendingActions: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { actions: number };
}

const noteTypeLabels: Record<string, string> = {
  general: "General",
  meeting_notes: "Meeting Notes",
  reference: "Reference",
  checklist: "Checklist",
};

const noteTypeColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
  meeting_notes:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  reference:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  checklist:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        const res = await fetch(`/api/notes?${params}`);
        const json = await res.json();
        if (res.ok) setNotes(json.data);
      } catch {
        toast.error("Failed to load notes");
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [search]);

  const togglePin = async (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });
      if (res.ok) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === note.id ? { ...n, isPinned: !n.isPinned } : n
          )
        );
      }
    } catch {
      toast.error("Failed to update pin");
    }
  };

  const filtered = notes.filter((n) => {
    const matchesType = typeFilter === "all" || n.noteType === typeFilter;
    const matchesDomain = domainFilter === "all" || n.domain === domainFilter;
    return matchesType && matchesDomain;
  });

  const pinned = filtered.filter((n) => n.isPinned);
  const unpinned = filtered.filter((n) => !n.isPinned);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const NoteCard = ({ note }: { note: Note }) => (
    <Link key={note.id} href={`/dashboard/notes/${note.id}`} className="block group">
      <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {note.isPinned && (
                  <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {note.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${noteTypeColors[note.noteType]}`}
                >
                  {noteTypeLabels[note.noteType]}
                </span>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {note.domain}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(note.updatedAt)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {note.hasPendingActions && (
                <div className="flex items-center gap-1 text-amber-500 mr-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-medium hidden sm:inline">
                    Actions
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => togglePin(e, note)}
              >
                {note.isPinned ? (
                  <PinOff className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <Link href="/dashboard/notes/new">
          <Button size="sm" className="sm:size-default">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Note</span>
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="meeting_notes">Meeting Notes</SelectItem>
              <SelectItem value="reference">Reference</SelectItem>
              <SelectItem value="checklist">Checklist</SelectItem>
            </SelectContent>
          </Select>
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              <SelectItem value="life">Life</SelectItem>
              <SelectItem value="mlc">MLC</SelectItem>
              <SelectItem value="product">Product</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="text-muted-foreground py-16 text-center">
          Loading notes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <StickyNote className="h-10 w-10 text-muted-foreground/40" />
          </div>
          {search || typeFilter !== "all" || domainFilter !== "all" ? (
            <>
              <p className="text-muted-foreground font-medium mb-1">
                No matching notes
              </p>
              <p className="text-sm text-muted-foreground/70">
                Try adjusting your search or filters
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground font-medium mb-1">
                No notes yet
              </p>
              <p className="text-sm text-muted-foreground/70 mb-4">
                Capture ideas, meeting notes, and reference material
              </p>
              <Link href="/dashboard/notes/new">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first note
                </Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned Section */}
          {pinned.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                Pinned
              </p>
              <div className="space-y-2">
                {pinned.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}

          {/* Unpinned Section */}
          {unpinned.length > 0 && (
            <div className="space-y-2">
              {pinned.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mt-4">
                  All Notes
                </p>
              )}
              <div className="space-y-2">
                {unpinned.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
