import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

interface ServiceCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  details?: string;
}

interface TableCount {
  table: string;
  count: number;
}

export async function GET() {
  const services: ServiceCheck[] = [];
  const tableCounts: TableCount[] = [];

  // 1. Database connection + ping
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as ok`;
    const dbTime = Date.now() - dbStart;
    services.push({
      name: "Supabase Database",
      status: dbTime < 1000 ? "healthy" : "degraded",
      responseTime: dbTime,
      details: dbTime < 1000 ? "Connection OK" : "Slow response",
    });
  } catch (error) {
    services.push({
      name: "Supabase Database",
      status: "down",
      responseTime: -1,
      details: error instanceof Error ? error.message : "Connection failed",
    });
  }

  // 2. Redis connection + ping
  try {
    const redisStart = Date.now();
    await redis.ping();
    const redisTime = Date.now() - redisStart;
    services.push({
      name: "Upstash Redis",
      status: redisTime < 1000 ? "healthy" : "degraded",
      responseTime: redisTime,
      details: redisTime < 1000 ? "Connection OK" : "Slow response",
    });
  } catch (error) {
    services.push({
      name: "Upstash Redis",
      status: "down",
      responseTime: -1,
      details: error instanceof Error ? error.message : "Connection failed",
    });
  }

  // 3. Supabase Auth check (verify env vars are set)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const authStart = Date.now();
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: supabaseKey },
      });
      const authTime = Date.now() - authStart;
      services.push({
        name: "Supabase Auth",
        status: res.ok ? (authTime < 1000 ? "healthy" : "degraded") : "down",
        responseTime: authTime,
        details: res.ok ? "Auth service reachable" : `HTTP ${res.status}`,
      });
    } catch (error) {
      services.push({
        name: "Supabase Auth",
        status: "down",
        responseTime: -1,
        details: error instanceof Error ? error.message : "Unreachable",
      });
    }
  } else {
    services.push({
      name: "Supabase Auth",
      status: "down",
      responseTime: -1,
      details: "Missing SUPABASE_URL or ANON_KEY env vars",
    });
  }

  // 4. Table row counts (only if DB is up)
  const dbUp = services.find((s) => s.name === "Supabase Database")?.status !== "down";
  if (dbUp) {
    const tables = [
      { name: "clients", fn: () => prisma.client.count() },
      { name: "projects", fn: () => prisma.project.count() },
      { name: "tasks", fn: () => prisma.task.count() },
      { name: "notes", fn: () => prisma.note.count() },
      { name: "products", fn: () => prisma.product.count() },
      { name: "time_entries", fn: () => prisma.timeEntry.count() },
      { name: "activity_entries", fn: () => prisma.activityEntry.count() },
      { name: "onboarding_templates", fn: () => prisma.onboardingTemplate.count() },
      { name: "onboarding_runs", fn: () => prisma.onboardingRun.count() },
      { name: "client_services", fn: () => prisma.clientService.count() },
      { name: "product_modules", fn: () => prisma.productModule.count() },
      { name: "project_phases", fn: () => prisma.projectPhase.count() },
      { name: "note_actions", fn: () => prisma.noteAction.count() },
    ];

    for (const table of tables) {
      try {
        const count = await table.fn();
        tableCounts.push({ table: table.name, count });
      } catch {
        tableCounts.push({ table: table.name, count: -1 });
      }
    }
  }

  // 5. Environment info
  const envInfo = {
    nodeVersion: process.version,
    nextjsEnv: process.env.NODE_ENV || "unknown",
    vercelRegion: process.env.VERCEL_REGION || "local",
    databaseUrlSet: !!process.env.DATABASE_URL,
    directUrlSet: !!process.env.DIRECT_URL,
    redisUrlSet: !!process.env.UPSTASH_REDIS_REST_URL,
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
  };

  const overallStatus = services.every((s) => s.status === "healthy")
    ? "healthy"
    : services.some((s) => s.status === "down")
      ? "unhealthy"
      : "degraded";

  return NextResponse.json({
    data: {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      tableCounts,
      envInfo,
    },
  });
}
