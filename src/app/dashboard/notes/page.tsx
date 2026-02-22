"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Pin, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  general: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  meeting_notes: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  reference: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  checklist: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
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

  const filtered = notes.filter((n) => {
    const matchesType = typeFilter === "all" || n.noteType === typeFilter;
    const matchesDomain = domainFilter === "all" || n.domain === domainFilter;
    return matchesType && matchesDomain;
  });

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <Link href="/dashboard/notes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
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
          <SelectTrigger className="w-[130px]">
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

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">Loading notes...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {search || typeFilter !== "all" || domainFilter !== "all"
              ? "No notes match your filters."
              : "No notes yet. Create your first one!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((note) => (
            <Link
              key={note.id}
              href={`/dashboard/notes/${note.id}`}
              className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  {note.isPinned && <Pin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                  <div>
                    <h3 className="font-medium">{note.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${noteTypeColors[note.noteType]}`}>
                        {noteTypeLabels[note.noteType]}
                      </span>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {note.domain}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Updated {timeAgo(note.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                {note.hasPendingActions && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Actions pending</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
