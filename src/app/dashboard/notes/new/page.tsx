"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewNotePage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground py-12 text-center">Loading...</div>}>
      <NewNoteForm />
    </Suspense>
  );
}

function NewNoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    title: "",
    domain: searchParams.get("domain") || "life",
    domainRefId: searchParams.get("ref_id") || "",
    noteType: "general",
  });

  useEffect(() => {
    const fetchRefs = async () => {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/clients?active=true"),
        fetch("/api/products"),
      ]);
      const [cJson, pJson] = await Promise.all([cRes.json(), pRes.json()]);
      if (cRes.ok) setClients(cJson.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      if (pRes.ok) setProducts(pJson.data.filter((p: { isActive: boolean }) => p.isActive).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    };
    fetchRefs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: "",
          domain: form.domain,
          domainRefId: form.domainRefId || null,
          noteType: form.noteType,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        router.push(`/dashboard/notes/${json.data.id}`);
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error("Failed to create note");
    } finally {
      setLoading(false);
    }
  };

  const refOptions = form.domain === "mlc" ? clients : form.domain === "product" ? products : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New Note</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select value={form.noteType} onValueChange={(v) => setForm((p) => ({ ...p, noteType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="meeting_notes">Meeting Notes</SelectItem>
                <SelectItem value="reference">Reference</SelectItem>
                <SelectItem value="checklist">Checklist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Domain</Label>
            <Select value={form.domain} onValueChange={(v) => setForm((p) => ({ ...p, domain: v, domainRefId: "" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="life">Life</SelectItem>
                <SelectItem value="mlc">MLC</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {form.domain !== "life" && refOptions.length > 0 && (
          <div>
            <Label>{form.domain === "mlc" ? "Client" : "Product"}</Label>
            <Select value={form.domainRefId} onValueChange={(v) => setForm((p) => ({ ...p, domainRefId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${form.domain === "mlc" ? "client" : "product"}`} />
              </SelectTrigger>
              <SelectContent>
                {refOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create & Edit"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
