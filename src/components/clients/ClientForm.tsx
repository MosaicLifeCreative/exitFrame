"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const SERVICE_TYPES = [
  { value: "wordpress", label: "WordPress" },
  { value: "ga4", label: "Google Analytics" },
  { value: "social_meta", label: "Social / Meta" },
  { value: "sendy", label: "Sendy (Email)" },
  { value: "notes", label: "Notes" },
  { value: "projects", label: "Projects" },
  { value: "twilio_sms", label: "Twilio SMS" },
  { value: "gmb", label: "Google Business" },
  { value: "content_calendar", label: "Content Calendar" },
];

interface ClientFormData {
  name: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  domain: string;
  address: string;
  notes: string;
}

interface ClientFormProps {
  initialData?: ClientFormData & { id?: string };
  isEdit?: boolean;
}

export function ClientForm({ initialData, isEdit }: ClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [form, setForm] = useState<ClientFormData>({
    name: initialData?.name ?? "",
    contactFirstName: initialData?.contactFirstName ?? "",
    contactLastName: initialData?.contactLastName ?? "",
    contactEmail: initialData?.contactEmail ?? "",
    contactPhone: initialData?.contactPhone ?? "",
    domain: initialData?.domain ?? "",
    address: initialData?.address ?? "",
    notes: initialData?.notes ?? "",
  });

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit
        ? `/api/clients/${initialData?.id}`
        : "/api/clients";
      const method = isEdit ? "PUT" : "POST";

      const body = isEdit ? form : { ...form, services: selectedServices };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Something went wrong");
        return;
      }

      toast.success(isEdit ? "Client updated" : "Client created");
      router.push(`/dashboard/clients/${json.data.id}`);
      router.refresh();
    } catch {
      toast.error("Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Business Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="e.g. BCA Mechanical"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactFirstName">Contact First Name</Label>
            <Input
              id="contactFirstName"
              value={form.contactFirstName}
              onChange={(e) => handleChange("contactFirstName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contactLastName">Contact Last Name</Label>
            <Input
              id="contactLastName"
              value={form.contactLastName}
              onChange={(e) => handleChange("contactLastName", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactEmail">Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => handleChange("contactEmail", e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <Label htmlFor="contactPhone">Phone</Label>
            <Input
              id="contactPhone"
              value={form.contactPhone}
              onChange={(e) => handleChange("contactPhone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="domain">Website Domain</Label>
          <Input
            id="domain"
            value={form.domain}
            onChange={(e) => handleChange("domain", e.target.value)}
            placeholder="example.com"
          />
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={3}
          />
        </div>

        {!isEdit && (
          <div>
            <Label className="mb-3 block">Services</Label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_TYPES.map((service) => (
                <label
                  key={service.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedServices.includes(service.value)}
                    onCheckedChange={() => toggleService(service.value)}
                  />
                  {service.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : isEdit
              ? "Update Client"
              : "Create Client"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
