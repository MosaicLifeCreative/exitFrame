import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check DATABASE_URL is set
  checks.databaseUrlSet = process.env.DATABASE_URL ? "yes" : "NO - MISSING";

  // Test Prisma connection
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    checks.prismaConnection = "ok";
  } catch (error) {
    checks.prismaConnection = `FAILED: ${error instanceof Error ? error.message : "Unknown"}`;
  }

  // Test if clients table exists
  try {
    const count = await prisma.client.count();
    checks.clientsTable = `ok (${count} rows)`;
  } catch (error) {
    checks.clientsTable = `FAILED: ${error instanceof Error ? error.message : "Unknown"}`;
  }

  // Test if projects table exists
  try {
    const count = await prisma.project.count();
    checks.projectsTable = `ok (${count} rows)`;
  } catch (error) {
    checks.projectsTable = `FAILED: ${error instanceof Error ? error.message : "Unknown"}`;
  }

  const allOk = Object.values(checks).every(
    (v) => v.startsWith("ok") || v === "yes"
  );

  return NextResponse.json(
    { status: allOk ? "healthy" : "unhealthy", checks },
    { status: allOk ? 200 : 500 }
  );
}
