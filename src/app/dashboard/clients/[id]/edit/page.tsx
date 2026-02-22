"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClientForm } from "@/components/clients/ClientForm";

interface ClientData {
  id: string;
  name: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  domain: string;
  address: string;
  notes: string;
}

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${params.id}`);
        const json = await res.json();
        if (res.ok) {
          setClient({
            id: json.data.id,
            name: json.data.name,
            contactFirstName: json.data.contactFirstName ?? "",
            contactLastName: json.data.contactLastName ?? "",
            contactEmail: json.data.contactEmail ?? "",
            contactPhone: json.data.contactPhone ?? "",
            domain: json.data.domain ?? "",
            address: json.data.address ?? "",
            notes: json.data.notes ?? "",
          });
        } else {
          toast.error(json.error);
          router.push("/dashboard/clients");
        }
      } catch {
        toast.error("Failed to load client");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [params.id, router]);

  if (loading) {
    return <div className="text-muted-foreground py-12 text-center">Loading...</div>;
  }

  if (!client) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit {client.name}</h1>
      <ClientForm initialData={client} isEdit />
    </div>
  );
}
