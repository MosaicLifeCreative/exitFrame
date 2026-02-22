"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Pencil,
  Globe,
  FolderOpen,
  CheckSquare,
  FileText,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MODULE_TYPES = [
  { value: "admin_panel", label: "Admin Panel" },
  { value: "analytics", label: "Analytics" },
  { value: "content_mgmt", label: "Content Management" },
  { value: "game_scheduling", label: "Game Scheduling" },
  { value: "event_pipeline", label: "Event Pipeline" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "user_management", label: "User Management" },
  { value: "notifications", label: "Notifications" },
];

interface ProductModule {
  id: string;
  moduleType: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  domain: string | null;
  description: string | null;
  isActive: boolean;
  modules: ProductModule[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`);
      const json = await res.json();
      if (res.ok) {
        setProduct(json.data);
      } else {
        toast.error(json.error);
        router.push("/dashboard/products");
      }
    } catch {
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const toggleModule = async (moduleType: string) => {
    try {
      const res = await fetch(`/api/products/${params.id}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleType }),
      });
      if (res.ok) {
        toast.success("Module updated");
        fetchProduct();
      }
    } catch {
      toast.error("Failed to update module");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground py-12 text-center">Loading...</div>;
  }

  if (!product) return null;

  const activeModules = product.modules.filter((m) => m.isActive);
  const moduleLabel = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          {product.domain && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Globe className="h-3 w-3" />
              {product.domain}
            </div>
          )}
        </div>
        <Link href={`/dashboard/products/${product.id}/edit`}>
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
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {product.description && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Modules</CardTitle>
              </CardHeader>
              <CardContent>
                {activeModules.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeModules.map((m) => (
                      <Badge key={m.id} variant="secondary">
                        {moduleLabel(m.moduleType)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No modules enabled.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <div className="text-muted-foreground text-center py-12">
            Projects for this product will appear here once the Projects module is built.
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <div className="text-muted-foreground text-center py-12">
            Tasks for this product will appear here once the Tasks module is built.
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <div className="text-muted-foreground text-center py-12">
            Notes for this product will appear here once the Notes module is built.
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Module Toggles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MODULE_TYPES.map((mod) => {
                const existing = product.modules.find(
                  (m) => m.moduleType === mod.value
                );
                const isEnabled = existing?.isActive ?? false;

                return (
                  <div key={mod.value} className="flex items-center justify-between">
                    <Label htmlFor={mod.value} className="cursor-pointer">
                      {mod.label}
                    </Label>
                    <Switch
                      id={mod.value}
                      checked={isEnabled}
                      onCheckedChange={() => toggleModule(mod.value)}
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
