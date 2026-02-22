"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Star, Play, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface OnboardingStep {
  actionType: string;
  label: string;
  config?: Record<string, unknown>;
}

interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  steps: OnboardingStep[];
  isDefault: boolean;
  createdAt: string;
  _count: { runs: number };
}

interface Client {
  id: string;
  name: string;
  isActive: boolean;
}

interface StepResult {
  stepIndex: number;
  label: string;
  actionType: string;
  status: "success" | "failed" | "manual";
  message: string;
}

const actionTypeLabels: Record<string, string> = {
  enable_service: "Enable Service",
  create_project: "Create Project",
  create_tasks: "Create Tasks",
  send_welcome_email: "Send Welcome Email",
  other: "Manual Step",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StepResult[] | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/templates");
      const json = await res.json();
      if (res.ok) setTemplates(json.data);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients?active=true");
      const json = await res.json();
      if (res.ok) setClients(json.data);
    } catch {
      toast.error("Failed to load clients");
    }
  };

  const openRunDialog = (template: OnboardingTemplate) => {
    setSelectedTemplate(template);
    setSelectedClientId("");
    setResults(null);
    setRunDialogOpen(true);
    fetchClients();
  };

  const executeRun = async () => {
    if (!selectedTemplate || !selectedClientId) return;
    setRunning(true);
    setResults(null);
    try {
      const res = await fetch("/api/onboarding/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          clientId: selectedClientId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setResults(json.data.results);
        toast.success("Onboarding completed!");
        fetchTemplates();
      } else {
        toast.error(json.error || "Failed to run onboarding");
      }
    } catch {
      toast.error("Failed to run onboarding");
    } finally {
      setRunning(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/onboarding/templates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Template deleted");
        setDeleteConfirmId(null);
        fetchTemplates();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Onboarding Templates</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/onboarding/runs")}
          >
            <History className="mr-2 h-4 w-4" />
            Run History
          </Button>
          <Button onClick={() => router.push("/dashboard/onboarding/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          No onboarding templates yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {template.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Star className="mr-1 h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {template.steps.length} step{template.steps.length !== 1 ? "s" : ""} &middot;{" "}
                    {template._count.runs} run{template._count.runs !== 1 ? "s" : ""}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.steps.map((step, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {actionTypeLabels[step.actionType] || step.actionType}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => openRunDialog(template)}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      Run
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/dashboard/onboarding/${template.id}`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteConfirmId(template.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Run Dialog */}
      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Run Onboarding</DialogTitle>
            <DialogDescription>
              Execute &ldquo;{selectedTemplate?.name}&rdquo; for a client.
            </DialogDescription>
          </DialogHeader>

          {!results ? (
            <div className="space-y-4">
              <div>
                <Label>Select Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="text-sm">
                  <p className="font-medium mb-2">Steps to execute:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    {selectedTemplate.steps.map((step, i) => (
                      <li key={i}>{step.label}</li>
                    ))}
                  </ol>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRunDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedClientId || running}
                  onClick={executeRun}
                >
                  {running ? "Running..." : "Run Onboarding"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium">Results:</p>
              <div className="space-y-2">
                {results.map((result, i) => (
                  <div
                    key={i}
                    className={`text-sm p-2 rounded-lg ${
                      result.status === "success"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : result.status === "manual"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    <span className="font-medium">{result.label}:</span>{" "}
                    {result.message}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={() => setRunDialogOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
            <DialogDescription>
              This will permanently delete this onboarding template. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteTemplate(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
