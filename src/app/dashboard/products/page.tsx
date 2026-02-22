"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [seeding, setSeeding] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      if (res.ok) {
        setProducts(json.data);
      }
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        toast.success("Products seeded");
        fetchProducts();
      }
    } catch {
      toast.error("Failed to seed products");
    } finally {
      setSeeding(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.isActive &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const moduleLabel = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex gap-2">
          {products.length === 0 && !loading && (
            <Button variant="outline" onClick={handleSeed} disabled={seeding}>
              {seeding ? "Seeding..." : "Seed Default Products"}
            </Button>
          )}
          <Link href="/dashboard/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">Loading products...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          {search ? "No products match your search." : "No products yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <Link key={product.id} href={`/dashboard/products/${product.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {product.domain && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      {product.domain}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {product.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {product.modules
                      .filter((m) => m.isActive)
                      .map((m) => (
                        <Badge key={m.id} variant="secondary" className="text-xs">
                          {moduleLabel(m.moduleType)}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
