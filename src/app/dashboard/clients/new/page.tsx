"use client";

import { ClientForm } from "@/components/clients/ClientForm";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New Client</h1>
      <ClientForm />
    </div>
  );
}
