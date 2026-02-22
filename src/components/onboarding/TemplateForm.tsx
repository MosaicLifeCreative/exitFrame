"use client";

import { useState } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface OnboardingStep {
  actionType: string;
  label: string;
  config?: Record<string, unknown>;
}

interface TemplateFormData {
  name: string;
  description: string;
  steps: OnboardingStep[];
  isDefault: boolean;
}

interface TemplateFormProps {
  initialData?: TemplateFormData;
  onSave: (data: TemplateFormData) => void;
  saving: boolean;
}

const ACTION_TYPES = [
  { value: "enable_service", label: "Enable Service" },
  { value: "create_project", label: "Create Project" },
  { value: "create_tasks", label: "Create Tasks" },
  { value: "send_welcome_email", label: "Send Welcome Email" },
  { value: "other", label: "Manual / Other" },
];

const SERVICE_TYPES = [
  "wordpress",
  "ga4",
  "social_meta",
  "sendy",
  "notes",
  "projects",
  "twilio_sms",
  "gmb",
  "content_calendar",
];

function StepConfig({
  step,
  onChange,
}: {
  step: OnboardingStep;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const config = step.config || {};

  switch (step.actionType) {
    case "enable_service":
      return (
        <div className="space-y-2">
          <Label className="text-xs">Service Type</Label>
          <Select
            value={(config.serviceType as string) || ""}
            onValueChange={(v) => onChange({ ...config, serviceType: v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select service..." />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "create_project":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Project Name</Label>
            <Input
              className="h-8 text-sm"
              placeholder="e.g. Website Redesign"
              value={(config.projectName as string) || ""}
              onChange={(e) =>
                onChange({ ...config, projectName: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Project Type</Label>
            <Select
              value={(config.projectType as string) || "general"}
              onValueChange={(v) => onChange({ ...config, projectType: v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="construction">Construction</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "create_tasks": {
      const tasks = (config.tasks as Array<{ title: string; priority?: string }>) || [];
      return (
        <div className="space-y-2">
          <Label className="text-xs">
            Tasks to Create ({tasks.length})
          </Label>
          {tasks.map((task, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                className="h-8 text-sm flex-1"
                placeholder="Task title..."
                value={task.title}
                onChange={(e) => {
                  const updated = [...tasks];
                  updated[i] = { ...updated[i], title: e.target.value };
                  onChange({ ...config, tasks: updated });
                }}
              />
              <Select
                value={task.priority || "medium"}
                onValueChange={(v) => {
                  const updated = [...tasks];
                  updated[i] = { ...updated[i], priority: v };
                  onChange({ ...config, tasks: updated });
                }}
              >
                <SelectTrigger className="h-8 text-sm w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  const updated = tasks.filter((_, j) => j !== i);
                  onChange({ ...config, tasks: updated });
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({
                ...config,
                tasks: [...tasks, { title: "", priority: "medium" }],
              });
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Task
          </Button>
          {tasks.length > 0 && (
            <div>
              <Label className="text-xs">
                Link to Project (optional)
              </Label>
              <Input
                className="h-8 text-sm"
                placeholder="Project name from a previous step..."
                value={(config.projectName as string) || ""}
                onChange={(e) =>
                  onChange({ ...config, projectName: e.target.value })
                }
              />
            </div>
          )}
        </div>
      );
    }

    case "send_welcome_email":
      return (
        <p className="text-xs text-muted-foreground">
          Email integration is not yet available. This step will be logged as a
          manual to-do.
        </p>
      );

    case "other":
      return (
        <div>
          <Label className="text-xs">Instructions</Label>
          <Textarea
            className="text-sm"
            rows={2}
            placeholder="Describe what should be done manually..."
            value={(config.instructions as string) || ""}
            onChange={(e) =>
              onChange({ ...config, instructions: e.target.value })
            }
          />
        </div>
      );

    default:
      return null;
  }
}

export function OnboardingTemplateForm({
  initialData,
  onSave,
  saving,
}: TemplateFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [steps, setSteps] = useState<OnboardingStep[]>(
    initialData?.steps || []
  );
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addStep = () => {
    setSteps([
      ...steps,
      { actionType: "enable_service", label: "", config: {} },
    ]);
  };

  const updateStep = (index: number, updates: Partial<OnboardingStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...updates };
    // Reset config when action type changes
    if (updates.actionType && updates.actionType !== steps[index].actionType) {
      updated[index].config = {};
    }
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return;
    const updated = [...steps];
    const [removed] = updated.splice(from, 1);
    updated.splice(to, 0, removed);
    setSteps(updated);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    moveStep(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (steps.length === 0) return;
    onSave({ name: name.trim(), description: description.trim(), steps, isDefault });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <div>
          <Label>Template Name</Label>
          <Input
            placeholder="e.g. New WordPress Client"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            placeholder="What this template sets up..."
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          <Label>Set as default template</Label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Steps</Label>
          <Button variant="outline" size="sm" onClick={addStep}>
            <Plus className="mr-1 h-3 w-3" />
            Add Step
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
            No steps yet. Add steps to define the onboarding workflow.
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <Card
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`${dragIndex === index ? "opacity-50" : ""}`}
              >
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="cursor-grab text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <Select
                      value={step.actionType}
                      onValueChange={(v) =>
                        updateStep(index, { actionType: v })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((at) => (
                          <SelectItem key={at.value} value={at.value}>
                            {at.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8 text-sm flex-1"
                      placeholder="Step label..."
                      value={step.label}
                      onChange={(e) =>
                        updateStep(index, { label: e.target.value })
                      }
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={index === 0}
                        onClick={() => moveStep(index, index - 1)}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={index === steps.length - 1}
                        onClick={() => moveStep(index, index + 1)}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="pl-12">
                    <StepConfig
                      step={step}
                      onChange={(config) => updateStep(index, { config })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={saving || !name.trim() || steps.length === 0}
        >
          {saving ? "Saving..." : "Save Template"}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
