import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Only return expertise-related architecture entries (fitness_, investing_, nutrition_, health_, therapy_, etc.)
const EXPERTISE_PREFIXES = ["fitness_", "investing_", "nutrition_", "health_", "therapy_", "expertise_"];

function isExpertiseEntry(system: string): boolean {
  return EXPERTISE_PREFIXES.some((p) => system.startsWith(p));
}

export async function GET() {
  try {
    const entries = await prisma.aydenArchitecture.findMany({
      orderBy: { system: "asc" },
    });

    const expertise = entries.filter((e) => isExpertiseEntry(e.system));

    return NextResponse.json({ data: expertise });
  } catch (error) {
    console.error("Failed to fetch expertise:", error);
    return NextResponse.json({ error: "Failed to fetch expertise" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { system, description, details } = body;

    if (!system || !description || !details) {
      return NextResponse.json({ error: "system, description, and details are required" }, { status: 400 });
    }

    // Ensure it has an expertise prefix
    const key = system.includes("_") ? system : `expertise_${system}`;

    const entry = await prisma.aydenArchitecture.upsert({
      where: { system: key },
      create: { system: key, description, details },
      update: { description, details },
    });

    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("Failed to save expertise:", error);
    return NextResponse.json({ error: "Failed to save expertise" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.aydenArchitecture.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete expertise:", error);
    return NextResponse.json({ error: "Failed to delete expertise" }, { status: 500 });
  }
}
