"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Pencil,
  CheckCircle2,
  Archive,
  Trash2,
  Send,
  BookOpen,
  Zap,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ActivityEntry {
  id: string;
  domain: string;
  module: string;
  activityType: string;
  title: string;
  description: string | null;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

const activityIcons: Record<string, React.ElementType> = {
  created: Plus,
  updated: Pencil,
  completed: CheckCircle2,
  archived: Archive,
  deleted: Trash2,
  sent: Send,
  published: BookOpen,
  generated: Zap,
  logged: Clock,
};

const domainColors: Record<string, string> = {
  life: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  mlc: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  product: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (domainFilter !== "all") params.set("domain", domainFilter);
        if (moduleFilter !== "all") params.set("module", moduleFilter);
        params.set("limit", limit.toString());
        params.set("offset", offset.toString());

        const res = await fetch(`/api/activity?${params}`);
        const json = await res.json();
        if (res.ok) {
          setEntries(json.data);
          setTotal(json.total);
        }
      } catch {
        toast.error("Failed to load activity");
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [search, domainFilter, moduleFilter, offset]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const navigateToRef = (entry: ActivityEntry) => {
    if (!entry.refType || !entry.refId) return;
    const routes: Record<string, string> = {
      client: `/dashboard/clients/${entry.refId}`,
      product: `/dashboard/products/${entry.refId}`,
      project: `/dashboard/projects/${entry.refId}`,
      task: `/dashboard/tasks`,
      note: `/dashboard/notes/${entry.refId}`,
    };
    const route = routes[entry.refType];
    if (route) window.location.href = route;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Activity Feed</h1>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            className="pl-9"
          />
        </div>
        <Select value={domainFilter} onValueChange={(v) => { setDomainFilter(v); setOffset(0); }}>
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
        <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setOffset(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="clients">Clients</SelectItem>
            <SelectItem value="products">Products</SelectItem>
            <SelectItem value="projects">Projects</SelectItem>
            <SelectItem value="tasks">Tasks</SelectItem>
            <SelectItem value="notes">Notes</SelectItem>
            <SelectItem value="time_tracking">Time Tracking</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">Loading activity...</div>
      ) : entries.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          No activity found.
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {entries.map((entry) => {
              const Icon = activityIcons[entry.activityType] ?? Clock;
              return (
                <div
                  key={entry.id}
                  onClick={() => navigateToRef(entry)}
                  className={`flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${entry.refType ? "cursor-pointer" : ""}`}
                >
                  <div className="mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{entry.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] capitalize ${domainColors[entry.domain] ?? ""}`}>
                        {entry.domain}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{entry.module}</span>
                      <span className="text-xs text-muted-foreground">&middot;</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
