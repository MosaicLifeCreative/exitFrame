"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Pencil,
  Mail,
  Phone,
  Globe,
  MapPin,
  FolderOpen,
  CheckSquare,
  FileText,
  Clock,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  contactPhone: string | null;
  domain: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  services: ClientService[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      const json = await res.json();
      if (res.ok) {
        setClient(json.data);
      } else {
        toast.error(json.error);
        router.push("/dashboard/clients");
      }
    } catch {
      toast.error("Failed to load client");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const toggleService = async (serviceType: string) => {
    try {
      const res = await fetch(`/api/clients/${params.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType }),
      });
      if (res.ok) {
        toast.success("Service updated");
        fetchClient();
      }
    } catch {
      toast.error("Failed to update service");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground py-12 text-center">Loading...</div>;
  }

  if (!client) {
    return null;
  }

  const contactName = [client.contactFirstName, client.contactLastName]
    .filter(Boolean)
    .join(" ");

  const activeServices = client.services.filter((s) => s.isActive);
  const SERVICE_LABELS: Record<string, string> = {
    wordpress: "WordPress",
    ga4: "GA4",
    social_meta: "Social / Meta",
    sendy: "Sendy",
    notes: "Notes",
    projects: "Projects",
    twilio_sms: "Twilio SMS",
    gmb: "GMB",
    content_calendar: "Content Calendar",
  };
  const serviceLabel = (type: string) =>
    SERVICE_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          {!client.isActive && (
            <Badge variant="destructive" className="mt-1">Archived</Badge>
          )}
        </div>
        <Link href={`/dashboard/clients/${client.id}/edit`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">
            <FolderOpen className="h-4 w-4 mr-1" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-4 w-4 mr-1" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="h-4 w-4 mr-1" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="time">
            <Clock className="h-4 w-4 mr-1" />
            Time
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contactName && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{contactName}</span>
                  </div>
                )}
                {client.contactEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${client.contactEmail}`} className="hover:underline">
                      {client.contactEmail}
                    </a>
                  </div>
                )}
                {client.contactPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {client.contactPhone}
                  </div>
                )}
                {client.domain && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    {client.domain}
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {client.address}
                  </div>
                )}
                {!contactName && !client.contactEmail && !client.contactPhone && !client.domain && !client.address && (
                  <p className="text-sm text-muted-foreground">No contact info added yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Services</CardTitle>
              </CardHeader>
              <CardContent>
                {activeServices.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeServices.map((s) => (
                      <Badge key={s.id} variant="secondary">
                        {serviceLabel(s.serviceType)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No services enabled.</p>
                )}
              </CardContent>
            </Card>

            {client.notes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {client.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <div className="text-muted-foreground text-center py-12">
            Projects for this client will appear here once the Projects module is built.
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <div className="text-muted-foreground text-center py-12">
            Tasks for this client will appear here once the Tasks module is built.
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <div className="text-muted-foreground text-center py-12">
            Notes for this client will appear here once the Notes module is built.
          </div>
        </TabsContent>

        <TabsContent value="time" className="mt-6">
          <div className="text-muted-foreground text-center py-12">
            Time entries for this client will appear here once Time Tracking is built.
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service Toggles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {SERVICE_TYPES.map((service) => {
                const existing = client.services.find(
                  (s) => s.serviceType === service.value
                );
                const isEnabled = existing?.isActive ?? false;

                return (
                  <div key={service.value} className="flex items-center justify-between">
                    <Label htmlFor={service.value} className="cursor-pointer">
                      {service.label}
                    </Label>
                    <Switch
                      id={service.value}
                      checked={isEnabled}
                      onCheckedChange={() => toggleService(service.value)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
