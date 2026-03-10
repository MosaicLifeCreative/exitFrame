import Anthropic from "@anthropic-ai/sdk";
import { googleCalendarFetch, gmailFetch, googleDriveFetch, googleDocsFetch, exportDriveFile, getGoogleAccessToken } from "@/lib/google";
import type { GoogleAccount } from "@/lib/google";

// ─── Shared account property for tool schemas ───────────

const accountProperty = {
  type: "string" as const,
  enum: ["personal", "business"],
  description:
    "Which Google account to use. Calendar defaults to 'personal' (where Trey's calendar lives). Gmail defaults to 'business' (MLC business email). Only specify if Trey asks for the other account.",
};

// ─── Tool Definitions (Anthropic format) ────────────────

export const googleTools: Anthropic.Tool[] = [
  // ── Calendar Tools ──────────────────────────────────
  {
    name: "list_calendar_events",
    description:
      "List upcoming calendar events. Returns event titles, times, locations, and attendees. Use this when Trey asks about his schedule, what's coming up, or when he's free.",
    input_schema: {
      type: "object" as const,
      properties: {
        timeMin: {
          type: "string",
          description:
            "Start of range in ISO 8601 format (e.g. '2026-03-09T00:00:00'). Defaults to now if omitted.",
        },
        timeMax: {
          type: "string",
          description:
            "End of range in ISO 8601 format (e.g. '2026-03-09T23:59:59'). Defaults to end of today if omitted.",
        },
        query: {
          type: "string",
          description: "Free text search to find specific events by title, description, or location.",
        },
        maxResults: {
          type: "number",
          description: "Maximum events to return (default 10, max 50).",
        },
        account: accountProperty,
      },
      required: [],
    },
  },
  {
    name: "get_calendar_event",
    description:
      "Get full details of a specific calendar event by ID. Use after list_calendar_events to drill into a particular event.",
    input_schema: {
      type: "object" as const,
      properties: {
        eventId: {
          type: "string",
          description: "The event ID from list_calendar_events.",
        },
        account: accountProperty,
      },
      required: ["eventId"],
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Create a new calendar event. Use when Trey asks to schedule something, add an event, or block time. If adding attendees, keep event details professional.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string",
          description: "Event title.",
        },
        description: {
          type: "string",
          description: "Event description or notes.",
        },
        location: {
          type: "string",
          description: "Event location (address or meeting link).",
        },
        startDateTime: {
          type: "string",
          description:
            "Start time in ISO 8601 (e.g. '2026-03-09T14:00:00'). For all-day events, use date format 'YYYY-MM-DD'.",
        },
        endDateTime: {
          type: "string",
          description:
            "End time in ISO 8601 (e.g. '2026-03-09T15:00:00'). For all-day events, use the next day (e.g. '2026-03-10').",
        },
        allDay: {
          type: "boolean",
          description: "Whether this is an all-day event (default false).",
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "Email addresses of attendees to invite.",
        },
        account: accountProperty,
      },
      required: ["summary", "startDateTime", "endDateTime"],
    },
  },
  {
    name: "update_calendar_event",
    description:
      "Update an existing calendar event. Use when Trey asks to reschedule, rename, or modify an event.",
    input_schema: {
      type: "object" as const,
      properties: {
        eventId: {
          type: "string",
          description: "The event ID to update.",
        },
        summary: { type: "string", description: "New event title." },
        description: { type: "string", description: "New description." },
        location: { type: "string", description: "New location." },
        startDateTime: { type: "string", description: "New start time (ISO 8601)." },
        endDateTime: { type: "string", description: "New end time (ISO 8601)." },
        account: accountProperty,
      },
      required: ["eventId"],
    },
  },
  {
    name: "delete_calendar_event",
    description:
      "Delete a calendar event. Use when Trey asks to cancel or remove an event.",
    input_schema: {
      type: "object" as const,
      properties: {
        eventId: {
          type: "string",
          description: "The event ID to delete.",
        },
        account: accountProperty,
      },
      required: ["eventId"],
    },
  },
  {
    name: "find_free_time",
    description:
      "Find free time slots in Trey's calendar. Use when he asks when he's available, or needs to find a time for something.",
    input_schema: {
      type: "object" as const,
      properties: {
        timeMin: {
          type: "string",
          description: "Start of range to check (ISO 8601). Defaults to now.",
        },
        timeMax: {
          type: "string",
          description: "End of range to check (ISO 8601). Defaults to end of this week.",
        },
        minDuration: {
          type: "number",
          description: "Minimum free slot duration in minutes (default 30).",
        },
        account: accountProperty,
      },
      required: [],
    },
  },

  // ── Gmail Tools ─────────────────────────────────────
  {
    name: "search_emails",
    description:
      "Search Gmail messages. Use when Trey asks about emails, wants to find a message, or asks 'did I get an email from...'. Defaults to business Gmail.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Gmail search query. Examples: 'from:client@example.com', 'is:unread', 'subject:invoice', 'after:2026/3/1 before:2026/3/9'. Combine with spaces.",
        },
        maxResults: {
          type: "number",
          description: "Maximum emails to return (default 10, max 50).",
        },
        account: accountProperty,
      },
      required: ["query"],
    },
  },
  {
    name: "read_email",
    description:
      "Read the full content of a specific email by ID. Use after search_emails to read a particular message.",
    input_schema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The message ID from search_emails.",
        },
        account: accountProperty,
      },
      required: ["messageId"],
    },
  },
  {
    name: "create_email_draft",
    description:
      "Create a Gmail draft for review before sending. Use when Trey wants to review the email first, or when composing something sensitive. Defaults to business Gmail. For REPLY drafts: pass the threadId from search_emails to keep it in the same thread. NEVER guess email addresses — search past threads first, or ask Trey.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: {
          type: "string",
          description: "Recipient email address(es), comma-separated for multiple.",
        },
        subject: {
          type: "string",
          description: "Email subject line.",
        },
        body: {
          type: "string",
          description: "Email body content (plain text). Do NOT include a signature — it's appended automatically.",
        },
        cc: {
          type: "string",
          description: "CC recipients, comma-separated.",
        },
        threadId: {
          type: "string",
          description: "Thread ID to reply to (makes this a draft reply).",
        },
        account: accountProperty,
      },
      required: ["to", "body"],
    },
  },
  {
    name: "send_email",
    description:
      "Send an email immediately. Signature is appended automatically. Defaults to business Gmail. For REPLIES: you MUST pass both threadId AND replyToMessageId from search_emails/read_email to keep the reply in the same thread. Omit 'subject' for replies (Gmail auto-uses Re: subject). IMPORTANT: (1) Email body must be 100% professional — you are representing Trey's business. (2) Always tell Trey what you're sending before calling this tool. (3) NEVER guess email addresses — if you don't have the recipient's address, use search_emails to find it in past threads first. If not found, ask Trey. Never construct addresses from name + company domain.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: {
          type: "string",
          description: "Recipient email address(es), comma-separated for multiple.",
        },
        subject: {
          type: "string",
          description: "Email subject line.",
        },
        body: {
          type: "string",
          description: "Email body content (plain text). Do NOT include a signature — it's appended automatically.",
        },
        cc: {
          type: "string",
          description: "CC recipients, comma-separated.",
        },
        replyToMessageId: {
          type: "string",
          description: "Message ID (msgId) to reply to. Get this from search_emails or read_email. Sets the In-Reply-To header for proper threading.",
        },
        threadId: {
          type: "string",
          description: "Thread ID (threadId) for threading replies. Get this from search_emails or read_email. REQUIRED for replies to stay in the same Gmail thread.",
        },
        account: accountProperty,
      },
      required: ["to", "body"],
    },
  },
  // ── Google Drive Tools ─────────────────────────────────
  {
    name: "search_drive",
    description:
      "Search Google Drive for files and folders. Use when Trey asks to find a document, spreadsheet, or file. Defaults to business Drive.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query. Examples: 'meeting agenda', 'Q1 report', 'name contains \"proposal\"'. Uses Drive search syntax.",
        },
        maxResults: {
          type: "number",
          description: "Maximum files to return (default 10, max 30).",
        },
        mimeType: {
          type: "string",
          description:
            "Filter by file type. Common: 'application/vnd.google-apps.document' (Google Doc), 'application/vnd.google-apps.spreadsheet' (Sheet), 'application/vnd.google-apps.folder' (folder).",
        },
        account: accountProperty,
      },
      required: ["query"],
    },
  },
  {
    name: "read_document",
    description:
      "Read the text content of a Google Doc by file ID. Use after search_drive to read a specific document. Only works with Google Docs (not PDFs, Sheets, etc.).",
    input_schema: {
      type: "object" as const,
      properties: {
        fileId: {
          type: "string",
          description: "The file ID from search_drive.",
        },
        account: accountProperty,
      },
      required: ["fileId"],
    },
  },
  {
    name: "create_document",
    description:
      "Create a new Google Doc with content. Use for meeting agendas, notes, proposals, or any document Trey asks you to create. Returns the doc URL so Trey can open it. Defaults to business Drive.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Document title.",
        },
        content: {
          type: "string",
          description:
            "Document content as plain text. Use newlines for structure. Headings can be indicated with lines ending in a colon or all caps — they'll be readable in the doc.",
        },
        folderId: {
          type: "string",
          description: "Optional folder ID to create the doc in. If omitted, creates in My Drive root.",
        },
        account: accountProperty,
      },
      required: ["title", "content"],
    },
  },
  {
    name: "append_to_document",
    description:
      "Append text content to an existing Google Doc. Use to add notes, updates, or new sections to a document without overwriting existing content.",
    input_schema: {
      type: "object" as const,
      properties: {
        fileId: {
          type: "string",
          description: "The file ID of the Google Doc to append to.",
        },
        content: {
          type: "string",
          description: "Text content to append at the end of the document.",
        },
        account: accountProperty,
      },
      required: ["fileId", "content"],
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  htmlLink?: string;
  creator?: { email?: string };
  organizer?: { email?: string; displayName?: string };
}

interface CalendarListResponse {
  items?: CalendarEvent[];
  nextPageToken?: string;
}

interface FreeBusyResponse {
  calendars: Record<string, { busy: Array<{ start: string; end: string }> }>;
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  resultSizeEstimate?: number;
}

interface GmailMessageResponse {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    mimeType: string;
    body?: { data?: string; size?: number };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string; size?: number };
      parts?: Array<{ mimeType: string; body?: { data?: string } }>;
    }>;
  };
  internalDate: string;
}

interface GmailDraftResponse {
  id: string;
  message: { id: string; threadId: string };
}

interface GmailSendResponse {
  id: string;
  threadId: string;
  labelIds: string[];
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
  size?: string;
}

interface DriveListResponse {
  files?: DriveFile[];
  nextPageToken?: string;
}

interface DocsDocument {
  documentId: string;
  title?: string;
  body?: {
    content: Array<{
      endIndex: number;
      [key: string]: unknown;
    }>;
  };
}

const DRIVE_MIME_LABELS: Record<string, string> = {
  "application/vnd.google-apps.document": "Google Doc",
  "application/vnd.google-apps.spreadsheet": "Google Sheet",
  "application/vnd.google-apps.presentation": "Google Slides",
  "application/vnd.google-apps.folder": "Folder",
  "application/vnd.google-apps.form": "Google Form",
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
};

interface GmailSendAsResponse {
  sendAsEmail: string;
  displayName?: string;
  signature?: string;
  isDefault?: boolean;
  isPrimary?: boolean;
}

const TZ = "America/New_York";

/** Signature cache — keyed by account, persists for the lifetime of the serverless function */
const signatureCache = new Map<string, { html: string; fetchedAt: number }>();
const SIGNATURE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch the Gmail signature HTML for an account. Returns raw HTML or empty string.
 * Caches to avoid repeated API calls within the same function invocation.
 */
async function getGmailSignature(account: GoogleAccount): Promise<string> {
  const cached = signatureCache.get(account);
  if (cached && Date.now() - cached.fetchedAt < SIGNATURE_CACHE_TTL) {
    return cached.html;
  }

  try {
    // Fetch all sendAs identities — the primary one has the signature
    const data = await gmailFetch<{ sendAs: GmailSendAsResponse[] }>(
      "/settings/sendAs",
      { account }
    );

    const primary = data.sendAs?.find((s) => s.isPrimary || s.isDefault);
    const sigHtml = primary?.signature || "";

    signatureCache.set(account, { html: sigHtml, fetchedAt: Date.now() });
    return sigHtml;
  } catch (error) {
    console.error(`Failed to fetch Gmail signature for ${account}:`, error);
    signatureCache.set(account, { html: "", fetchedAt: Date.now() });
    return "";
  }
}

/**
 * Convert plain text body to HTML paragraphs.
 */
function textToHtml(text: string): string {
  return text
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>").replace(/  /g, "&nbsp; ")}</p>`)
    .join("");
}

/**
 * Build a raw RFC 2822 HTML email message with Gmail signature.
 */
function buildRawEmail(opts: {
  to: string;
  subject?: string;
  body: string;
  cc?: string;
  signatureHtml: string;
  inReplyTo?: string;
}): string {
  const headers: string[] = [];
  headers.push(`To: ${opts.to}`);
  if (opts.subject) headers.push(`Subject: ${opts.subject}`);
  if (opts.cc) headers.push(`Cc: ${opts.cc}`);
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  headers.push("Content-Type: text/html; charset=utf-8");
  headers.push("");

  // Build HTML body with signature
  const bodyHtml = textToHtml(opts.body);
  const sigBlock = opts.signatureHtml
    ? `<br><div class="gmail_signature">${opts.signatureHtml}</div>`
    : "";
  const fullHtml = `<div dir="ltr">${bodyHtml}${sigBlock}</div>`;

  headers.push(fullHtml);

  return Buffer.from(headers.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Resolve account with fallback — if preferred account isn't connected, try the other.
 * Calendar prefers personal, Gmail prefers business.
 */
async function resolveCalendarAccount(input: Record<string, unknown>): Promise<GoogleAccount> {
  if (input.account === "business" || input.account === "personal") {
    return input.account as GoogleAccount;
  }
  // Default: prefer personal for calendar, fall back to business
  const personalToken = await getGoogleAccessToken("personal");
  if (personalToken) return "personal";
  const businessToken = await getGoogleAccessToken("business");
  if (businessToken) return "business";
  return "personal"; // Will show "not connected" error
}

async function resolveDriveAccount(input: Record<string, unknown>): Promise<GoogleAccount> {
  if (input.account === "business" || input.account === "personal") {
    return input.account as GoogleAccount;
  }
  // Default: prefer business for Drive, fall back to personal
  const businessToken = await getGoogleAccessToken("business");
  if (businessToken) return "business";
  const personalToken = await getGoogleAccessToken("personal");
  if (personalToken) return "personal";
  return "business";
}

async function resolveGmailAccount(input: Record<string, unknown>): Promise<GoogleAccount> {
  if (input.account === "business" || input.account === "personal") {
    return input.account as GoogleAccount;
  }
  // Default: prefer business for Gmail, fall back to personal
  const businessToken = await getGoogleAccessToken("business");
  if (businessToken) return "business";
  const personalToken = await getGoogleAccessToken("personal");
  if (personalToken) return "personal";
  return "business"; // Will show "not connected" error
}

function formatEventCompact(event: CalendarEvent): string {
  const title = event.summary || "(No title)";
  const start = event.start?.dateTime || event.start?.date || "?";
  const end = event.end?.dateTime || event.end?.date || "";
  const location = event.location ? ` | ${event.location}` : "";
  const attendeeCount = event.attendees?.length || 0;
  const attendees = attendeeCount > 0 ? ` | ${attendeeCount} attendee(s)` : "";

  return `[${event.id}] ${title} — ${start} to ${end}${location}${attendees}`;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function extractEmailBody(payload: GmailMessageResponse["payload"]): string {
  // Try direct body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Try parts (multipart emails)
  if (payload.parts) {
    // Prefer text/plain
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      // Nested multipart
      if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === "text/plain" && sub.body?.data) {
            return decodeBase64Url(sub.body.data);
          }
        }
      }
    }
    // Fallback to text/html
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        // Strip HTML tags for a rough plaintext version
        return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
    }
  }

  return "(Could not extract email body)";
}

function getHeader(headers: Array<{ name: string; value: string }> | undefined, name: string): string {
  if (!headers) return "";
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function executeGoogleTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      // ── Calendar ────────────────────────────────────
      case "list_calendar_events": {
        const account = await resolveCalendarAccount(input);
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const params: Record<string, string> = {
          timeZone: TZ,
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: String(Math.min(Number(input.maxResults) || 10, 50)),
        };

        if (input.timeMin) {
          params.timeMin = new Date(input.timeMin as string).toISOString();
        } else {
          params.timeMin = now.toISOString();
        }

        if (input.timeMax) {
          params.timeMax = new Date(input.timeMax as string).toISOString();
        } else {
          params.timeMax = endOfDay.toISOString();
        }

        if (input.query) {
          params.q = input.query as string;
        }

        const data = await googleCalendarFetch<CalendarListResponse>(
          "/calendars/primary/events",
          { params, account }
        );

        const events = data.items || [];
        if (events.length === 0) return "No events found for that time range.";

        return events.map(formatEventCompact).join("\n");
      }

      case "get_calendar_event": {
        const account = await resolveCalendarAccount(input);
        const event = await googleCalendarFetch<CalendarEvent>(
          `/calendars/primary/events/${input.eventId}`,
          { params: { timeZone: TZ }, account }
        );

        return JSON.stringify({
          id: event.id,
          title: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          status: event.status,
          attendees: event.attendees,
          organizer: event.organizer,
          link: event.htmlLink,
        });
      }

      case "create_calendar_event": {
        const account = await resolveCalendarAccount(input);
        const isAllDay = input.allDay === true;
        const eventBody: Record<string, unknown> = {
          summary: input.summary,
        };

        if (input.description) eventBody.description = input.description;
        if (input.location) eventBody.location = input.location;

        if (isAllDay) {
          eventBody.start = { date: (input.startDateTime as string).slice(0, 10) };
          eventBody.end = { date: (input.endDateTime as string).slice(0, 10) };
        } else {
          eventBody.start = {
            dateTime: input.startDateTime,
            timeZone: TZ,
          };
          eventBody.end = {
            dateTime: input.endDateTime,
            timeZone: TZ,
          };
        }

        if (input.attendees && Array.isArray(input.attendees)) {
          eventBody.attendees = (input.attendees as string[]).map((email) => ({ email }));
        }

        const created = await googleCalendarFetch<CalendarEvent>(
          "/calendars/primary/events",
          { method: "POST", body: eventBody, params: { sendUpdates: "all" }, account }
        );

        return `Event created: "${created.summary}" (${created.start?.dateTime || created.start?.date}). ID: ${created.id}`;
      }

      case "update_calendar_event": {
        const account = await resolveCalendarAccount(input);
        const updates: Record<string, unknown> = {};
        if (input.summary) updates.summary = input.summary;
        if (input.description) updates.description = input.description;
        if (input.location) updates.location = input.location;
        if (input.startDateTime) {
          updates.start = { dateTime: input.startDateTime, timeZone: TZ };
        }
        if (input.endDateTime) {
          updates.end = { dateTime: input.endDateTime, timeZone: TZ };
        }

        const updated = await googleCalendarFetch<CalendarEvent>(
          `/calendars/primary/events/${input.eventId}`,
          { method: "PATCH", body: updates, params: { sendUpdates: "all" }, account }
        );

        return `Event updated: "${updated.summary}" (${updated.start?.dateTime || updated.start?.date}).`;
      }

      case "delete_calendar_event": {
        const account = await resolveCalendarAccount(input);
        await googleCalendarFetch(
          `/calendars/primary/events/${input.eventId}`,
          { method: "DELETE", params: { sendUpdates: "all" }, account }
        );

        return `Event deleted successfully.`;
      }

      case "find_free_time": {
        const account = await resolveCalendarAccount(input);
        const now = new Date();
        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);

        const timeMin = input.timeMin
          ? new Date(input.timeMin as string).toISOString()
          : now.toISOString();
        const timeMax = input.timeMax
          ? new Date(input.timeMax as string).toISOString()
          : endOfWeek.toISOString();

        const freeBusy = await googleCalendarFetch<FreeBusyResponse>(
          "/freeBusy",
          {
            method: "POST",
            body: {
              timeMin,
              timeMax,
              timeZone: TZ,
              items: [{ id: "primary" }],
            },
            account,
          }
        );

        const busySlots = freeBusy.calendars?.primary?.busy || [];
        const minDuration = (Number(input.minDuration) || 30) * 60 * 1000;

        // Calculate free slots between busy periods
        const freeSlots: Array<{ start: string; end: string; minutes: number }> = [];
        let cursor = new Date(timeMin);
        const rangeEnd = new Date(timeMax);

        for (const busy of busySlots) {
          const busyStart = new Date(busy.start);
          if (busyStart.getTime() - cursor.getTime() >= minDuration) {
            freeSlots.push({
              start: cursor.toISOString(),
              end: busyStart.toISOString(),
              minutes: Math.round((busyStart.getTime() - cursor.getTime()) / 60000),
            });
          }
          const busyEnd = new Date(busy.end);
          if (busyEnd > cursor) cursor = busyEnd;
        }

        // Final gap
        if (rangeEnd.getTime() - cursor.getTime() >= minDuration) {
          freeSlots.push({
            start: cursor.toISOString(),
            end: rangeEnd.toISOString(),
            minutes: Math.round((rangeEnd.getTime() - cursor.getTime()) / 60000),
          });
        }

        if (freeSlots.length === 0) return "No free time slots found in that range.";

        return freeSlots
          .map((s) => `${s.start} — ${s.end} (${s.minutes} min)`)
          .join("\n");
      }

      // ── Gmail ───────────────────────────────────────
      case "search_emails": {
        const account = await resolveGmailAccount(input);
        const params: Record<string, string> = {
          q: input.query as string,
          maxResults: String(Math.min(Number(input.maxResults) || 10, 50)),
        };

        const list = await gmailFetch<GmailListResponse>("/messages", { params, account });

        if (!list.messages || list.messages.length === 0) {
          return "No emails found matching that search.";
        }

        // Fetch summaries for each message
        const summaries = await Promise.all(
          list.messages.slice(0, 15).map(async (msg) => {
            try {
              const full = await gmailFetch<GmailMessageResponse>(
                `/messages/${msg.id}`,
                { params: { format: "full" }, account }
              );
              const headers = full.payload?.headers;
              const from = getHeader(headers, "From");
              const subject = getHeader(headers, "Subject");
              const date = getHeader(headers, "Date");
              return `[msgId: ${msg.id}] [threadId: ${msg.threadId}] ${date} | From: ${from} | Subject: ${subject}\n  Preview: ${full.snippet || ""}`;
            } catch {
              return `[${msg.id}] (failed to fetch details)`;
            }
          })
        );

        return summaries.join("\n\n");
      }

      case "read_email": {
        const account = await resolveGmailAccount(input);
        const msg = await gmailFetch<GmailMessageResponse>(
          `/messages/${input.messageId}`,
          { params: { format: "full" }, account }
        );

        const from = getHeader(msg.payload.headers, "From");
        const to = getHeader(msg.payload.headers, "To");
        const subject = getHeader(msg.payload.headers, "Subject");
        const date = getHeader(msg.payload.headers, "Date");
        const body = extractEmailBody(msg.payload);

        // Truncate very long emails
        const truncatedBody = body.length > 3000 ? body.substring(0, 3000) + "\n...(truncated)" : body;

        return `From: ${from}\nTo: ${to}\nDate: ${date}\nSubject: ${subject}\nThread: ${msg.threadId}\n\n${truncatedBody}`;
      }

      case "create_email_draft": {
        const account = await resolveGmailAccount(input);
        const signature = await getGmailSignature(account);
        const raw = buildRawEmail({
          to: input.to as string,
          subject: input.subject as string | undefined,
          body: input.body as string,
          cc: input.cc as string | undefined,
          signatureHtml: signature,
        });

        const draftBody: Record<string, unknown> = {
          message: { raw },
        };

        if (input.threadId) {
          draftBody.message = { ...(draftBody.message as object), threadId: input.threadId };
        }

        const draft = await gmailFetch<GmailDraftResponse>("/drafts", {
          method: "POST",
          body: draftBody,
          account,
        });

        return `Draft created (ID: ${draft.id}). It's in Trey's ${account} Drafts folder ready to review and send.`;
      }

      case "send_email": {
        const account = await resolveGmailAccount(input);
        const signature = await getGmailSignature(account);
        const raw = buildRawEmail({
          to: input.to as string,
          subject: input.subject as string | undefined,
          body: input.body as string,
          cc: input.cc as string | undefined,
          signatureHtml: signature,
          inReplyTo: input.replyToMessageId as string | undefined,
        });

        const sendBody: Record<string, unknown> = { raw };
        if (input.threadId) {
          sendBody.threadId = input.threadId;
        }

        const sent = await gmailFetch<GmailSendResponse>("/messages/send", {
          method: "POST",
          body: sendBody,
          account,
        });

        return `Email sent to ${input.to} (ID: ${sent.id}).`;
      }

      // ── Google Drive ──────────────────────────────────
      case "search_drive": {
        const account = await resolveDriveAccount(input);
        const maxResults = Math.min(Number(input.maxResults) || 10, 30);

        // Build Drive query — wrap user query in fullText search unless it looks like a Drive query already
        const userQuery = input.query as string;
        let driveQuery = `fullText contains '${userQuery.replace(/'/g, "\\'")}'`;
        if (userQuery.includes(" contains ") || userQuery.includes("mimeType") || userQuery.includes("name contains")) {
          driveQuery = userQuery;
        }

        // Add mimeType filter if specified
        if (input.mimeType) {
          driveQuery += ` and mimeType = '${input.mimeType}'`;
        }

        // Exclude trashed files
        driveQuery += " and trashed = false";

        const data = await googleDriveFetch<DriveListResponse>("/files", {
          params: {
            q: driveQuery,
            pageSize: String(maxResults),
            fields: "files(id,name,mimeType,modifiedTime,webViewLink,owners,size)",
            orderBy: "modifiedTime desc",
          },
          account,
        });

        const files = data.files || [];
        if (files.length === 0) return "No files found matching that search.";

        return files
          .map((f) => {
            const type = DRIVE_MIME_LABELS[f.mimeType] || f.mimeType;
            const modified = f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : "";
            return `[${f.id}] ${f.name} (${type}) — modified ${modified}\n  ${f.webViewLink || ""}`;
          })
          .join("\n\n");
      }

      case "read_document": {
        const account = await resolveDriveAccount(input);
        const fileId = input.fileId as string;

        const content = await exportDriveFile(fileId, "text/plain", account);

        if (!content || content.trim().length === 0) {
          return "Document is empty.";
        }

        // Truncate very long docs
        const truncated = content.length > 5000
          ? content.substring(0, 5000) + "\n...(truncated — document is " + content.length + " chars)"
          : content;

        return truncated;
      }

      case "create_document": {
        const account = await resolveDriveAccount(input);
        const title = input.title as string;
        const content = input.content as string;

        // Step 1: Create empty doc via Docs API
        const doc = await googleDocsFetch<DocsDocument>("/documents", {
          method: "POST",
          body: { title },
          account,
        });

        const docId = doc.documentId;

        // Step 2: Insert content via batchUpdate
        if (content) {
          await googleDocsFetch(`/documents/${docId}:batchUpdate`, {
            method: "POST",
            body: {
              requests: [
                {
                  insertText: {
                    location: { index: 1 }, // After document start
                    text: content,
                  },
                },
              ],
            },
            account,
          });
        }

        // Step 3: Move to folder if specified
        if (input.folderId) {
          await googleDriveFetch(`/files/${docId}`, {
            method: "PATCH",
            params: {
              addParents: input.folderId as string,
              removeParents: "root",
            },
            account,
          });
        }

        const url = `https://docs.google.com/document/d/${docId}/edit`;
        return `Document "${title}" created.\nURL: ${url}`;
      }

      case "append_to_document": {
        const account = await resolveDriveAccount(input);
        const fileId = input.fileId as string;
        const content = input.content as string;

        // Get current doc to find end index
        const doc = await googleDocsFetch<DocsDocument>(`/documents/${fileId}`, {
          account,
        });

        // End index of body content (insert before the final newline)
        const endIndex = doc.body?.content
          ? doc.body.content[doc.body.content.length - 1]?.endIndex - 1 || 1
          : 1;

        await googleDocsFetch(`/documents/${fileId}:batchUpdate`, {
          method: "POST",
          body: {
            requests: [
              {
                insertText: {
                  location: { index: endIndex },
                  text: "\n\n" + content,
                },
              },
            ],
          },
          account,
        });

        return `Content appended to document "${doc.title || fileId}".`;
      }

      default:
        return JSON.stringify({ error: `Unknown Google tool: ${name}` });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Google tool ${name} error:`, msg);

    if (msg.includes("not connected")) {
      return `Google account not connected. Trey needs to connect his Google account in Settings > Preferences first.`;
    }

    return JSON.stringify({ error: `Google tool failed: ${msg}` });
  }
}
