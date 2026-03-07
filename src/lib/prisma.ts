import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use DATABASE_URL (PgBouncer, port 6543) with pgbouncer=true to handle
// connection pooling in serverless. Supabase direct connection (port 5432)
// has low max client limits that get exhausted with parallel API calls.
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || "";
  // Ensure pgbouncer=true is set for PgBouncer connections (fixes prepared statement issues)
  if (url.includes(":6543/") && !url.includes("pgbouncer=true")) {
    const separator = url.includes("?") ? "&" : "?";
    return url + separator + "pgbouncer=true";
  }
  return url;
}

const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
