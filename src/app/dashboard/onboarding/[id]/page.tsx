"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { OnboardingTemplateForm } from "@/components/onboarding/TemplateForm";

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
}

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const [template, setTemplate] = useState<OnboardingTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/onboarding/templates/${params.id}`);
        const json = await res.json();
        if (res.ok) {
          setTemplate(json.data);
        } else {
          toast.error("Template not found");
          router.push("/dashboard/onboarding");
        }
      } catch {
        toast.error("Failed to load template");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [params.id, router]);

  const handleSave = async (data: {
    name: string;
    description: string;
    steps: OnboardingStep[];
    isDefault: boolean;
  }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/templates/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Template updated!");
        router.push("/dashboard/onboarding");
      } else {
        toast.error(json.error || "Failed to update template");
      }
    } catch {
      toast.error("Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        Loading template...
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Template</h1>
      <OnboardingTemplateForm
        initialData={{
          name: template.name,
          description: template.description || "",
          steps: template.steps,
          isDefault: template.isDefault,
        }}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
