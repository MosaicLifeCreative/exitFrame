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

  // 3. Supabase Auth check
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

  // 4. Finnhub API check
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey) {
    try {
      const fhStart = Date.now();
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=SPY&token=${finnhubKey}`);
      const fhTime = Date.now() - fhStart;
      if (res.ok) {
        const data = await res.json();
        services.push({
          name: "Finnhub API",
          status: data.c > 0 ? (fhTime < 2000 ? "healthy" : "degraded") : "degraded",
          responseTime: fhTime,
          details: data.c > 0 ? `SPY: $${data.c}` : "API reachable, no quote data",
        });
      } else {
        services.push({
          name: "Finnhub API",
          status: "down",
          responseTime: fhTime,
          details: `HTTP ${res.status}`,
        });
      }
    } catch (error) {
      services.push({
        name: "Finnhub API",
        status: "down",
        responseTime: -1,
        details: error instanceof Error ? error.message : "Unreachable",
      });
    }
  } else {
    services.push({
      name: "Finnhub API",
      status: "down",
      responseTime: -1,
      details: "FINNHUB_API_KEY not configured",
    });
  }

  // 5. QStash schedule check (verify env vars present)
  const qstashToken = process.env.QSTASH_TOKEN;
  const qstashSigning = process.env.QSTASH_CURRENT_SIGNING_KEY;
  services.push({
    name: "QStash Cron",
    status: qstashToken && qstashSigning ? "healthy" : "degraded",
    responseTime: 0,
    details: qstashToken && qstashSigning
      ? "Signing keys configured"
      : qstashToken ? "Token set, signing keys missing" : "Not configured",
  });

  // 6. Anthropic API check (just env var presence — don't waste tokens pinging)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  services.push({
    name: "Claude AI",
    status: anthropicKey ? "healthy" : "down",
    responseTime: 0,
    details: anthropicKey ? "API key configured" : "ANTHROPIC_API_KEY not set",
  });

  // 7. Oura Ring integration check
  try {
    const ouraIntegration = await prisma.integration.findFirst({
      where: { serviceName: "oura" },
    });
    const ouraClientId = process.env.OURA_CLIENT_ID;
    if (ouraIntegration?.status === "active") {
      services.push({
        name: "Oura Ring",
        status: "healthy",
        responseTime: 0,
        details: ouraIntegration.lastSyncAt
          ? `Last sync: ${new Date(ouraIntegration.lastSyncAt).toLocaleString()}`
          : "Connected, awaiting first sync",
      });
    } else if (ouraClientId) {
      services.push({
        name: "Oura Ring",
        status: "degraded",
        responseTime: 0,
        details: ouraIntegration?.lastError || "OAuth configured but not connected",
      });
    } else {
      services.push({
        name: "Oura Ring",
        status: "down",
        responseTime: 0,
        details: "OURA_CLIENT_ID not configured",
      });
    }
  } catch {
    services.push({
      name: "Oura Ring",
      status: "down",
      responseTime: 0,
      details: "Failed to check integration status",
    });
  }

  // 8. Twilio SMS
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const twilioMyPhone = process.env.TWILIO_MY_NUMBER;
  services.push({
    name: "Twilio SMS",
    status: twilioSid && twilioToken && twilioPhone && twilioMyPhone ? "healthy" : "degraded",
    responseTime: 0,
    details: twilioSid && twilioToken && twilioPhone && twilioMyPhone
      ? "All credentials configured"
      : [
          !twilioSid && "SID missing",
          !twilioToken && "Auth token missing",
          !twilioPhone && "Phone number missing",
          !twilioMyPhone && "My number missing",
        ].filter(Boolean).join(", "),
  });

  // 9. Slack
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const slackSecret = process.env.SLACK_SIGNING_SECRET;
  services.push({
    name: "Slack",
    status: slackToken && slackSecret ? "healthy" : "degraded",
    responseTime: 0,
    details: slackToken && slackSecret
      ? "Bot token + signing secret configured"
      : [
          !slackToken && "Bot token missing",
          !slackSecret && "Signing secret missing",
        ].filter(Boolean).join(", "),
  });

  // 10. Google (Calendar + Gmail)
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  services.push({
    name: "Google (Calendar + Gmail)",
    status: googleClientId && googleClientSecret ? "healthy" : "degraded",
    responseTime: 0,
    details: googleClientId && googleClientSecret
      ? "OAuth credentials configured"
      : [
          !googleClientId && "Client ID missing",
          !googleClientSecret && "Client secret missing",
        ].filter(Boolean).join(", "),
  });

  // 11. Table row counts (only if DB is up)
  const dbUp = services.find((s) => s.name === "Supabase Database")?.status !== "down";
  if (dbUp) {
    const tables = [
      // Core
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
      // Investing
      { name: "portfolio_holdings", fn: () => prisma.portfolioHolding.count() },
      { name: "watchlist_items", fn: () => prisma.watchlistItem.count() },
      { name: "market_news", fn: () => prisma.marketNews.count() },
      { name: "stock_quotes", fn: () => prisma.stockQuote.count() },
      { name: "ai_portfolios", fn: () => prisma.aiPortfolio.count() },
      { name: "ai_positions", fn: () => prisma.aiPosition.count() },
      { name: "ai_trades", fn: () => prisma.aiTrade.count() },
      { name: "portfolio_snapshots", fn: () => prisma.portfolioSnapshot.count() },
      // Health
      { name: "oura_data", fn: () => prisma.ouraData.count() },
      { name: "supplements", fn: () => prisma.supplement.count() },
      { name: "symptom_logs", fn: () => prisma.symptomLog.count() },
      { name: "bloodwork_panels", fn: () => prisma.bloodworkPanel.count() },
      { name: "family_members", fn: () => prisma.familyMember.count() },
      // Fitness
      { name: "exercises", fn: () => prisma.exercise.count() },
      { name: "workout_sessions", fn: () => prisma.workoutSession.count() },
      { name: "cardio_sessions", fn: () => prisma.cardioSession.count() },
      // Goals
      { name: "goals", fn: () => prisma.goal.count() },
      // Chat
      { name: "chat_conversations", fn: () => prisma.chatConversation.count() },
      { name: "chat_messages", fn: () => prisma.chatMessage.count() },
      // Ayden
      { name: "ayden_memories", fn: () => prisma.aydenMemory.count() },
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

  // 8. Environment info
  const envInfo = {
    nodeVersion: process.version,
    nextjsEnv: process.env.NODE_ENV || "unknown",
    vercelRegion: process.env.VERCEL_REGION || "local",
    databaseUrlSet: !!process.env.DATABASE_URL,
    directUrlSet: !!process.env.DIRECT_URL,
    redisUrlSet: !!process.env.UPSTASH_REDIS_REST_URL,
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    finnhubKeySet: !!process.env.FINNHUB_API_KEY,
    qstashTokenSet: !!process.env.QSTASH_TOKEN,
    qstashSigningSet: !!process.env.QSTASH_CURRENT_SIGNING_KEY,
    cronSecretSet: !!process.env.CRON_SECRET,
    ouraClientIdSet: !!process.env.OURA_CLIENT_ID,
    ouraClientSecretSet: !!process.env.OURA_CLIENT_SECRET,
    twilioSidSet: !!process.env.TWILIO_ACCOUNT_SID,
    twilioTokenSet: !!process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneSet: !!process.env.TWILIO_PHONE_NUMBER,
    twilioMyNumberSet: !!process.env.TWILIO_MY_NUMBER,
    slackBotTokenSet: !!process.env.SLACK_BOT_TOKEN,
    slackSigningSecretSet: !!process.env.SLACK_SIGNING_SECRET,
    googleClientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    googleClientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
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
