"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OnboardingTemplateForm } from "@/components/onboarding/TemplateForm";

interface OnboardingStep {
  actionType: string;
  label: string;
  config?: Record<string, unknown>;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: {
    name: string;
    description: string;
    steps: OnboardingStep[];
    isDefault: boolean;
  }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Template created!");
        router.push("/dashboard/onboarding");
      } else {
        toast.error(json.error || "Failed to create template");
      }
    } catch {
      toast.error("Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New Onboarding Template</h1>
      <OnboardingTemplateForm onSave={handleSave} saving={saving} />
    </div>
  );
}
