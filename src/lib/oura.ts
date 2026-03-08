import { prisma } from "@/lib/prisma";

const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";

const INTEGRATION_NAME = "oura";

interface OuraTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ─── OAuth helpers ───────────────────────────────────────

export function getOuraAuthUrl(redirectUri: string): string {
  const clientId = process.env.OURA_CLIENT_ID;
  if (!clientId) throw new Error("OURA_CLIENT_ID not set");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "daily heartrate personal workout session",
    state: "oura-connect",
  });

  return `${OURA_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeOuraCode(code: string, redirectUri: string): Promise<OuraTokens> {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Oura OAuth credentials not configured");

  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Oura token exchange failed: ${err}`);
  }

  return res.json();
}

async function refreshOuraToken(refreshToken: string): Promise<OuraTokens> {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Oura OAuth credentials not configured");

  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Oura token refresh failed: ${err}`);
  }

  return res.json();
}

// ─── Integration management ─────────────────────────────

export async function saveOuraIntegration(tokens: OuraTokens): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const existing = await prisma.integration.findFirst({
    where: { serviceName: INTEGRATION_NAME },
  });

  const credentials = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
  };

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: { status: "active", credentials, lastError: null },
    });
  } else {
    await prisma.integration.create({
      data: { serviceName: INTEGRATION_NAME, status: "active", credentials },
    });
  }
}

export async function getOuraAccessToken(): Promise<string | null> {
  const integration = await prisma.integration.findFirst({
    where: { serviceName: INTEGRATION_NAME, status: "active" },
  });

  if (!integration) return null;

  const creds = integration.credentials as { access_token: string; refresh_token: string; expires_at: string } | null;
  if (!creds?.access_token) return null;

  // Check if token is expired (with 5-minute buffer)
  const expiresAt = new Date(creds.expires_at).getTime();
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    try {
      const newTokens = await refreshOuraToken(creds.refresh_token);
      await saveOuraIntegration(newTokens);
      return newTokens.access_token;
    } catch (error) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          status: "error",
          lastError: error instanceof Error ? error.message : "Token refresh failed",
        },
      });
      return null;
    }
  }

  return creds.access_token;
}

export async function disconnectOura(): Promise<void> {
  await prisma.integration.updateMany({
    where: { serviceName: INTEGRATION_NAME },
    data: { status: "inactive", credentials: {} },
  });
}

export async function getOuraStatus(): Promise<{ connected: boolean; lastSync: Date | null; error: string | null }> {
  const integration = await prisma.integration.findFirst({
    where: { serviceName: INTEGRATION_NAME },
  });

  if (!integration || integration.status === "inactive") {
    return { connected: false, lastSync: null, error: null };
  }

  return {
    connected: integration.status === "active",
    lastSync: integration.lastSyncAt,
    error: integration.lastError,
  };
}

// ─── Data fetching ───────────────────────────────────────

interface OuraApiResponse<T> {
  data: T[];
  next_token?: string;
}

interface OuraDailySleep {
  id: string;
  day: string;
  score: number;
  timestamp: string;
  contributors: Record<string, number>;
  [key: string]: unknown;
}

interface OuraDailyReadiness {
  id: string;
  day: string;
  score: number;
  timestamp: string;
  contributors: Record<string, number>;
  [key: string]: unknown;
}

interface OuraDailyActivity {
  id: string;
  day: string;
  score: number;
  timestamp: string;
  [key: string]: unknown;
}

interface OuraHeartRate {
  bpm: number;
  source: string;
  timestamp: string;
}

interface OuraSleepSession {
  id: string;
  day: string;
  average_hrv: number | null;
  hr_lowest: number | null;
  average_heart_rate: number | null;
  total_sleep_duration: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
  light_sleep_duration: number | null;
  awake_time: number | null;
  efficiency: number | null;
  latency: number | null;
  temperature_delta: number | null;
  bedtime_start: string | null;
  bedtime_end: string | null;
  type: string;
  [key: string]: unknown;
}

interface OuraDailySpo2 {
  id: string;
  day: string;
  spo2_percentage: {
    average: number | null;
  } | null;
  breathing_disturbance_index: number | null;
  [key: string]: unknown;
}

interface OuraDailyStress {
  id: string;
  day: string;
  stress_high: number | null;
  recovery_high: number | null;
  day_summary: string | null;
  [key: string]: unknown;
}

interface OuraDailyResilience {
  id: string;
  day: string;
  level: string | null;
  contributors: Record<string, unknown> | null;
  [key: string]: unknown;
}

interface OuraSleepTime {
  id: string;
  day: string;
  optimal_bedtime: {
    start: string | null;
    end: string | null;
  } | null;
  recommendation: string | null;
  status: string | null;
  [key: string]: unknown;
}

interface OuraRingConfiguration {
  id: string;
  color: string | null;
  design: string | null;
  firmware_version: string | null;
  hardware_type: string | null;
  set_up_at: string | null;
  size: number | null;
  [key: string]: unknown;
}

interface OuraWorkout {
  id: string;
  activity: string | null;
  calories: number | null;
  day: string;
  start_datetime: string | null;
  end_datetime: string | null;
  intensity: string | null;
  label: string | null;
  source: string | null;
  distance: number | null;
  [key: string]: unknown;
}

interface OuraSession {
  id: string;
  day: string;
  start_datetime: string | null;
  end_datetime: string | null;
  type: string | null;
  mood: string | null;
  [key: string]: unknown;
}

async function ouraFetch<T>(endpoint: string, token: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(`${OURA_API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Oura API ${endpoint} failed (${res.status}): ${errText}`);
  }

  const json: OuraApiResponse<T> = await res.json();
  return json.data;
}

// ─── Sync functions ──────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export interface SyncResults {
  sleep: number;
  readiness: number;
  activity: number;
  hrv: number;
  sleepSessions: number;
  spo2: number;
  stress: number;
  resilience: number;
  sleepTime: number;
  ringConfig: number;
  workouts: number;
  sessions: number;
  heartrate: number;
}

export async function syncOuraData(daysBack = 7): Promise<SyncResults> {
  const token = await getOuraAccessToken();
  if (!token) throw new Error("Oura not connected");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const params = {
    start_date: formatDate(startDate),
    end_date: formatDate(new Date()),
  };

  const results: SyncResults = {
    sleep: 0,
    readiness: 0,
    activity: 0,
    hrv: 0,
    sleepSessions: 0,
    spo2: 0,
    stress: 0,
    resilience: 0,
    sleepTime: 0,
    ringConfig: 0,
    workouts: 0,
    sessions: 0,
    heartrate: 0,
  };

  // Sync daily sleep
  try {
    const sleepData = await ouraFetch<OuraDailySleep>("daily_sleep", token, params);
    for (const item of sleepData) {
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "sleep" } },
        create: {
          date: new Date(item.day),
          dataType: "sleep",
          data: item as object,
          sleepScore: item.score ?? null,
        },
        update: {
          data: item as object,
          sleepScore: item.score ?? null,
        },
      });
      results.sleep++;
    }
  } catch (error) {
    console.error("Oura sleep sync error:", error);
  }

  // Sync daily readiness
  try {
    const readinessData = await ouraFetch<OuraDailyReadiness>("daily_readiness", token, params);
    for (const item of readinessData) {
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "readiness" } },
        create: {
          date: new Date(item.day),
          dataType: "readiness",
          data: item as object,
          readinessScore: item.score ?? null,
        },
        update: {
          data: item as object,
          readinessScore: item.score ?? null,
        },
      });
      results.readiness++;
    }
  } catch (error) {
    console.error("Oura readiness sync error:", error);
  }

  // Sync daily activity
  try {
    const activityData = await ouraFetch<OuraDailyActivity>("daily_activity", token, params);
    for (const item of activityData) {
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "activity" } },
        create: {
          date: new Date(item.day),
          dataType: "activity",
          data: item as object,
          activityScore: item.score ?? null,
        },
        update: {
          data: item as object,
          activityScore: item.score ?? null,
        },
      });
      results.activity++;
    }
  } catch (error) {
    console.error("Oura activity sync error:", error);
  }

  // Sync detailed sleep sessions — source of REAL HRV (RMSSD) data
  try {
    const sleepSessions = await ouraFetch<OuraSleepSession>("sleep", token, params);
    for (const item of sleepSessions) {
      // Store as sleep_session record
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "sleep_session" } },
        create: {
          date: new Date(item.day),
          dataType: "sleep_session",
          data: item as object,
        },
        update: {
          data: item as object,
        },
      });
      results.sleepSessions++;

      // Update the daily sleep record's hrvAverage with REAL HRV from sleep session
      if (item.average_hrv != null) {
        try {
          await prisma.ouraData.update({
            where: { date_dataType: { date: new Date(item.day), dataType: "sleep" } },
            data: { hrvAverage: item.average_hrv },
          });
          results.hrv++;
        } catch {
          // Sleep record may not exist for this day yet
        }
      }
    }
  } catch (error) {
    console.error("Oura sleep sessions sync error:", error);
  }

  // Sync heart rate data (stored for resting HR tracking, NOT used for HRV)
  try {
    const hrData = await ouraFetch<OuraHeartRate>("heartrate", token, params);
    // Group by day and compute average resting HR
    const byDay = new Map<string, number[]>();
    for (const hr of hrData) {
      const day = hr.timestamp.split("T")[0];
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(hr.bpm);
    }

    for (const [day, bpms] of Array.from(byDay)) {
      const avg = bpms.reduce((a: number, b: number) => a + b, 0) / bpms.length;
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(day), dataType: "heartrate" } },
        create: {
          date: new Date(day),
          dataType: "heartrate",
          data: { day, averageBpm: Math.round(avg * 100) / 100, sampleCount: bpms.length },
        },
        update: {
          data: { day, averageBpm: Math.round(avg * 100) / 100, sampleCount: bpms.length },
        },
      });
      results.heartrate++;
    }
  } catch (error) {
    console.error("Oura heart rate sync error:", error);
  }

  // Sync daily SpO2
  try {
    const spo2Data = await ouraFetch<OuraDailySpo2>("daily_spo2", token, params);
    for (const item of spo2Data) {
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "spo2" } },
        create: {
          date: new Date(item.day),
          dataType: "spo2",
          data: item as object,
        },
        update: {
          data: item as object,
        },
      });
      results.spo2++;
    }
  } catch (error) {
    console.error("Oura SpO2 sync error:", error);
  }

  // Sync daily stress
  try {
    const stressData = await ouraFetch<OuraDailyStress>("daily_stress", token, params);
    for (const item of stressData) {
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "stress" } },
        create: {
          date: new Date(item.day),
          dataType: "stress",
          data: item as object,
        },
        update: {
          data: item as object,
        },
      });
      results.stress++;
    }
  } catch (error) {
    console.error("Oura stress sync error:", error);
  }

  // Sync daily resilience
  try {
    const resilienceData = await ouraFetch<OuraDailyResilience>("daily_resilience", token, params);
    for (const item of resilienceData) {
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "resilience" } },
        create: {
          date: new Date(item.day),
          dataType: "resilience",
          data: item as object,
        },
        update: {
          data: item as object,
        },
      });
      results.resilience++;
    }
  } catch (error) {
    console.error("Oura resilience sync error:", error);
  }

  // Sync sleep time recommendations
  try {
    const sleepTimeData = await ouraFetch<OuraSleepTime>("sleep_time", token, params);
    for (const item of sleepTimeData) {
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "sleep_time" } },
        create: {
          date: new Date(item.day),
          dataType: "sleep_time",
          data: item as object,
        },
        update: {
          data: item as object,
        },
      });
      results.sleepTime++;
    }
  } catch (error) {
    console.error("Oura sleep time sync error:", error);
  }

  // Sync ring configuration (not date-range based, just fetch current)
  try {
    const ringConfigs = await ouraFetch<OuraRingConfiguration>("ring_configuration", token);
    for (const item of ringConfigs) {
      const setupDate = item.set_up_at ? new Date(item.set_up_at.split("T")[0]) : new Date();
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: setupDate, dataType: "ring_config" } },
        create: {
          date: setupDate,
          dataType: "ring_config",
          data: item as object,
        },
        update: {
          data: item as object,
        },
      });
      results.ringConfig++;
    }
  } catch (error) {
    console.error("Oura ring configuration sync error:", error);
  }

  // Sync workouts
  try {
    const workoutData = await ouraFetch<OuraWorkout>("workout", token, params);
    for (const item of workoutData) {
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "workout" } },
        create: {
          date: new Date(item.day),
          dataType: "workout",
          data: item as object,
        },
        update: {
          data: item as object,
        },
      });
      results.workouts++;
    }
  } catch (error) {
    console.error("Oura workout sync error:", error);
  }

  // Sync sessions (meditation/breathing)
  try {
    const sessionData = await ouraFetch<OuraSession>("session", token, params);
    for (const item of sessionData) {
      await prisma.ouraData.upsert({
        where: { date_dataType: { date: new Date(item.day), dataType: "session" } },
        create: {
          date: new Date(item.day),
          dataType: "session",
          data: item as object,
        },
        update: {
          data: item as object,
        },
      });
      results.sessions++;
    }
  } catch (error) {
    console.error("Oura session sync error:", error);
  }

  // Update integration last sync timestamp
  await prisma.integration.updateMany({
    where: { serviceName: INTEGRATION_NAME, status: "active" },
    data: { lastSyncAt: new Date(), lastError: null },
  });

  return results;
}

// ─── Data retrieval for dashboard ────────────────────────

export async function getRecentOuraData(days = 30): Promise<{
  sleep: Array<{ date: string; score: number | null; hrvAverage: number | null; data: Record<string, unknown> }>;
  readiness: Array<{ date: string; score: number | null; data: Record<string, unknown> }>;
  activity: Array<{ date: string; score: number | null; data: Record<string, unknown> }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [sleepRows, readinessRows, activityRows] = await Promise.all([
    prisma.ouraData.findMany({
      where: { dataType: "sleep", date: { gte: startDate } },
      orderBy: { date: "asc" },
    }),
    prisma.ouraData.findMany({
      where: { dataType: "readiness", date: { gte: startDate } },
      orderBy: { date: "asc" },
    }),
    prisma.ouraData.findMany({
      where: { dataType: "activity", date: { gte: startDate } },
      orderBy: { date: "asc" },
    }),
  ]);

  return {
    sleep: sleepRows.map((r) => ({
      date: formatDate(r.date),
      score: r.sleepScore,
      hrvAverage: r.hrvAverage ? Number(r.hrvAverage) : null,
      data: r.data as Record<string, unknown>,
    })),
    readiness: readinessRows.map((r) => ({
      date: formatDate(r.date),
      score: r.readinessScore,
      data: r.data as Record<string, unknown>,
    })),
    activity: activityRows.map((r) => ({
      date: formatDate(r.date),
      score: r.activityScore,
      data: r.data as Record<string, unknown>,
    })),
  };
}
