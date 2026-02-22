"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RefOption {
  id: string;
  name: string;
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground py-12 text-center">Loading...</div>}>
      <NewProjectForm />
    </Suspense>
  );
}

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<RefOption[]>([]);
  const [products, setProducts] = useState<RefOption[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    domain: searchParams.get("domain") || "life",
    domainRefId: searchParams.get("ref_id") || "",
    projectType: "general",
    priority: "medium",
    dueDate: "",
    estimatedBudget: "",
  });

  useEffect(() => {
    const fetchRefs = async () => {
      const [clientsRes, productsRes] = await Promise.all([
        fetch("/api/clients?active=true"),
        fetch("/api/products"),
      ]);
      const [clientsJson, productsJson] = await Promise.all([
        clientsRes.json(),
        productsRes.json(),
      ]);
      if (clientsRes.ok) setClients(clientsJson.data.map((c: RefOption) => ({ id: c.id, name: c.name })));
      if (productsRes.ok) setProducts(productsJson.data.filter((p: { isActive: boolean }) => p.isActive).map((p: RefOption) => ({ id: p.id, name: p.name })));
    };
    fetchRefs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          domain: form.domain,
          domainRefId: form.domainRefId || null,
          projectType: form.projectType,
          priority: form.priority,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          estimatedBudget: form.estimatedBudget ? parseFloat(form.estimatedBudget) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error);
        return;
      }

      toast.success("Project created");
      router.push(`/dashboard/projects/${json.data.id}`);
    } catch {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const refOptions = form.domain === "mlc" ? clients : form.domain === "product" ? products : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New Project</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Domain *</Label>
            <Select
              value={form.domain}
              onValueChange={(v) => setForm((p) => ({ ...p, domain: v, domainRefId: "" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="life">Life (Personal)</SelectItem>
                <SelectItem value="mlc">MLC (Client)</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.domain !== "life" && (
            <div>
              <Label>{form.domain === "mlc" ? "Client" : "Product"}</Label>
              <Select
                value={form.domainRefId}
                onValueChange={(v) => setForm((p) => ({ ...p, domainRefId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${form.domain === "mlc" ? "client" : "product"}`} />
                </SelectTrigger>
                <SelectContent>
                  {refOptions.map((ref) => (
                    <SelectItem key={ref.id} value={ref.id}>
                      {ref.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Project Type</Label>
            <Select
              value={form.projectType}
              onValueChange={(v) => setForm((p) => ({ ...p, projectType: v }))}
            >
              <SelectTrigger>
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

          <div>
            <Label>Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="budget">Estimated Budget</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              value={form.estimatedBudget}
              onChange={(e) => setForm((p) => ({ ...p, estimatedBudget: e.target.value }))}
              placeholder="$0.00"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Project"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
