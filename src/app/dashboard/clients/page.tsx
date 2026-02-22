"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClientService {
  id: string;
  serviceType: string;
  isActive: boolean;
}

interface Client {
  id: string;
  name: string;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
  domain: string | null;
  isActive: boolean;
  createdAt: string;
  services: ClientService[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const json = await res.json();
      if (res.ok) {
        setClients(json.data);
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      (client.contactEmail ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesActive = showArchived ? !client.isActive : client.isActive;
    return matchesSearch && matchesActive;
  });

  const handleArchive = async (id: string, restore: boolean) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: restore ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        ...(restore ? { body: JSON.stringify({ isActive: true }) } : {}),
      });
      if (res.ok) {
        toast.success(restore ? "Client restored" : "Client archived");
        fetchClients();
      }
    } catch {
      toast.error("Failed to update client");
    }
  };

  const serviceLabel = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/dashboard/clients/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="h-4 w-4 mr-1" />
          {showArchived ? "Showing Archived" : "Show Archived"}
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">
          Loading clients...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          {search ? "No clients match your search." : showArchived ? "No archived clients." : "No clients yet. Create your first one!"}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Services</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="font-medium hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[client.contactFirstName, client.contactLastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.domain || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.services
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {serviceLabel(s.serviceType)}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {showArchived ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(client.id, true)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(client.id, false)}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                    )}
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
