"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, FolderOpen } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Project {
  id: string;
  name: string;
  domain: string;
  domainRefId: string | null;
  projectType: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  _count: { tasks: number; phases: number };
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        const json = await res.json();
        if (res.ok) setProjects(json.data);
      } catch {
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const filtered = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesDomain = domainFilter === "all" || p.domain === domainFilter;
    return matchesSearch && matchesStatus && matchesDomain;
  });

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-[140px]">
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
        <div className="text-muted-foreground py-12 text-center">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {search || statusFilter !== "all" || domainFilter !== "all"
              ? "No projects match your filters."
              : "No projects yet. Create your first one!"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {project.projectType}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {project.domain}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] ?? ""}`}>
                      {project.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[project.priority] ?? ""}`}>
                      {project.priority}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project._count.tasks}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(project.dueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
