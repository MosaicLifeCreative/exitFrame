import { prisma } from "@/lib/prisma";

/** Supported Google account types */
export type GoogleAccount = "personal" | "business";

const INTEGRATION_PREFIX = "google";

function integrationName(account: GoogleAccount): string {
  return `${INTEGRATION_PREFIX}-${account}`;
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Calendar (full) + Gmail (read + compose/send + settings for signature) + Drive (files + docs)
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/drive",
].join(" ");

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

function getClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || "";
}

function getClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}

function getRedirectUri(): string {
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";
  return `${baseUrl}/api/google/callback`;
}

/**
 * Generate the Google OAuth consent URL.
 * The `account` param is passed as state so the callback knows which integration to save to.
 */
export function getGoogleAuthUrl(account: GoogleAccount = "personal"): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent", // Force consent to always get refresh_token
    state: account, // "personal" or "business" — callback reads this
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token.
 */
async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Save Google tokens to the Integration table.
 */
export async function saveGoogleIntegration(
  tokens: GoogleTokens,
  account: GoogleAccount = "personal"
): Promise<void> {
  const serviceName = integrationName(account);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Refresh tokens are only returned on initial auth (prompt=consent).
  // On refresh, Google doesn't send a new refresh_token, so preserve the old one.
  const existing = await prisma.integration.findFirst({
    where: { serviceName },
  });

  const existingCreds = existing?.credentials as {
    refresh_token?: string;
  } | null;

  const credentials = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || existingCreds?.refresh_token || "",
    expires_at: expiresAt,
  };

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: { status: "active", credentials, lastError: null, updatedAt: new Date() },
    });
  } else {
    await prisma.integration.create({
      data: { serviceName, status: "active", credentials },
    });
  }
}

/**
 * Get a valid Google access token for a specific account, refreshing if needed.
 */
export async function getGoogleAccessToken(
  account: GoogleAccount = "personal"
): Promise<string | null> {
  const serviceName = integrationName(account);
  const integration = await prisma.integration.findFirst({
    where: { serviceName, status: "active" },
  });

  if (!integration) return null;

  const creds = integration.credentials as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
  } | null;

  if (!creds?.access_token || !creds?.refresh_token) return null;

  // Refresh if within 5 minutes of expiry
  const expiresAt = new Date(creds.expires_at).getTime();
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    try {
      const newTokens = await refreshGoogleToken(creds.refresh_token);
      await saveGoogleIntegration(newTokens, account);
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

/**
 * Disconnect a Google account.
 */
export async function disconnectGoogle(account: GoogleAccount = "personal"): Promise<void> {
  const serviceName = integrationName(account);
  const integration = await prisma.integration.findFirst({
    where: { serviceName },
  });
  if (integration) {
    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: "inactive", credentials: {}, lastError: null },
    });
  }
}

/**
 * Check Google integration status for all accounts.
 */
export async function getGoogleStatus(): Promise<{
  personal: { connected: boolean; error: string | null };
  business: { connected: boolean; error: string | null };
}> {
  const accounts: GoogleAccount[] = ["personal", "business"];
  const result: Record<string, { connected: boolean; error: string | null }> = {};

  for (const account of accounts) {
    const serviceName = integrationName(account);
    const integration = await prisma.integration.findFirst({
      where: { serviceName },
    });

    if (!integration || integration.status === "inactive") {
      result[account] = { connected: false, error: null };
    } else {
      result[account] = {
        connected: integration.status === "active",
        error: integration.lastError,
      };
    }
  }

  return result as {
    personal: { connected: boolean; error: string | null };
    business: { connected: boolean; error: string | null };
  };
}

// ─── Google Calendar API ────────────────────────────────

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function googleCalendarFetch<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
    account?: GoogleAccount;
  }
): Promise<T> {
  const account = options?.account || "personal";
  const token = await getGoogleAccessToken(account);
  if (!token) throw new Error(`Google ${account} account not connected`);

  const url = new URL(`${CALENDAR_API}${endpoint}`);
  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: options?.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errText}`);
  }

  // DELETE returns 204 No Content
  if (res.status === 204) return {} as T;

  return res.json();
}

// ─── Gmail API ──────────────────────────────────────────

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function gmailFetch<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
    account?: GoogleAccount;
  }
): Promise<T> {
  const account = options?.account || "business";
  const token = await getGoogleAccessToken(account);
  if (!token) throw new Error(`Google ${account} account not connected`);

  const url = new URL(`${GMAIL_API}${endpoint}`);
  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: options?.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API error (${res.status}): ${errText}`);
  }

  return res.json();
}

// ─── Google Drive API ────────────────────────────────────

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DOCS_API = "https://docs.googleapis.com/v1";

export async function googleDriveFetch<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
    account?: GoogleAccount;
    baseUrl?: string;
  }
): Promise<T> {
  const account = options?.account || "business";
  const token = await getGoogleAccessToken(account);
  if (!token) throw new Error(`Google ${account} account not connected`);

  const base = options?.baseUrl || DRIVE_API;
  const url = new URL(`${base}${endpoint}`);
  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: options?.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errText}`);
  }

  if (res.status === 204) return {} as T;

  return res.json();
}

export async function googleDocsFetch<T>(
  endpoint: string,
  options?: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
    account?: GoogleAccount;
  }
): Promise<T> {
  return googleDriveFetch<T>(endpoint, { ...options, baseUrl: DOCS_API });
}

/**
 * Export a Google Doc as plain text (for reading content).
 */
export async function exportDriveFile(
  fileId: string,
  mimeType: string = "text/plain",
  account: GoogleAccount = "business"
): Promise<string> {
  const token = await getGoogleAccessToken(account);
  if (!token) throw new Error(`Google ${account} account not connected`);

  const url = `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive export error (${res.status}): ${errText}`);
  }

  return res.text();
}

/**
 * Check if Google env vars are configured.
 */
export function isGoogleConfigured(): boolean {
  return !!(getClientId() && getClientSecret());
}
