import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const SEED_PRODUCTS = [
  { name: "GetShelfed", domain: "getshelfed.com", description: "Library management application" },
  { name: "ManlyMan", domain: "manlyman.men", description: "Men's lifestyle brand" },
  { name: "MLC Website", domain: "mosaiclifecreative.com", description: "Agency website" },
  { name: "Grove City Events", domain: null, description: "Local events platform" },
  { name: "Web Dev Tools", domain: null, description: "WordPress plugin — design and development utilities for web professionals." },
];

export async function POST() {
  try {
    const results = [];

    for (const product of SEED_PRODUCTS) {
      const existing = await prisma.product.findFirst({
        where: { name: product.name },
      });

      if (!existing) {
        const created = await prisma.product.create({ data: product });
        results.push({ name: product.name, status: "created", id: created.id });
      } else {
        results.push({ name: product.name, status: "already exists", id: existing.id });
      }
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Failed to seed products:", error);
    return NextResponse.json({ error: "Failed to seed products" }, { status: 500 });
  }
}
