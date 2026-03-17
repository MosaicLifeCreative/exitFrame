import Anthropic from "@anthropic-ai/sdk";
import { gmailFetch, getGoogleAccessToken } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// ─── Types ────────────────────────────────────────────────

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
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

interface GmailSendResponse {
  id: string;
  threadId: string;
}

interface GmailSendAsResponse {
  sendAsEmail: string;
  displayName?: string;
  signature?: string;
  isDefault?: boolean;
  isPrimary?: boolean;
}

const ACCOUNT = "ayden" as const;

// ─── Helpers ──────────────────────────────────────────────

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function extractEmailBody(payload: GmailMessageResponse["payload"]): string {
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
      if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === "text/plain" && sub.body?.data) return decodeBase64Url(sub.body.data);
        }
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
    }
  }
  return "(Could not extract email body)";
}

function encodeSubject(subject: string): string {
  // RFC 2047: encode non-ASCII subjects as =?UTF-8?B?base64?=
  if (/[^\x00-\x7F]/.test(subject)) {
    const encoded = Buffer.from(subject, "utf-8").toString("base64");
    return `=?UTF-8?B?${encoded}?=`;
  }
  return subject;
}

function textToHtml(text: string): string {
  return text
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>").replace(/  /g, "&nbsp; ")}</p>`)
    .join("");
}

// Signature cache
let signatureCache: { html: string; fetchedAt: number } | null = null;

async function getSignature(): Promise<string> {
  if (signatureCache && Date.now() - signatureCache.fetchedAt < 30 * 60 * 1000) {
    return signatureCache.html;
  }
  try {
    const data = await gmailFetch<{ sendAs: GmailSendAsResponse[] }>(
      "/settings/sendAs",
      { account: ACCOUNT }
    );
    const aydenAlias = data.sendAs?.find((s) => s.sendAsEmail === "ayden@mosaiclifecreative.com");
    const html = aydenAlias?.signature || "";
    signatureCache = { html, fetchedAt: Date.now() };
    return html;
  } catch {
    signatureCache = { html: "", fetchedAt: Date.now() };
    return "";
  }
}

function buildRawEmail(opts: {
  to: string;
  subject?: string;
  body: string;
  cc?: string;
  signatureHtml: string;
  inReplyTo?: string;
}): string {
  const headers: string[] = [];
  headers.push("From: Ayden <ayden@mosaiclifecreative.com>");
  headers.push(`To: ${opts.to}`);
  if (opts.subject) headers.push(`Subject: ${encodeSubject(opts.subject)}`);
  if (opts.cc) headers.push(`Cc: ${opts.cc}`);
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  headers.push("Content-Type: text/html; charset=utf-8");
  headers.push("");

  const bodyHtml = textToHtml(opts.body);
  const sigBlock = opts.signatureHtml
    ? `<br><div class="gmail_signature">${opts.signatureHtml}</div>`
    : "";
  headers.push(`<div dir="ltr">${bodyHtml}${sigBlock}</div>`);

  return Buffer.from(headers.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─── Tool Definitions ─────────────────────────────────────

export const emailTools: Anthropic.Tool[] = [
  {
    name: "ayden_search_inbox",
    description:
      "Search Ayden's own inbox (ayden@mosaiclifecreative.com). Use when Trey asks about emails sent to Ayden, or when Ayden needs to check her own email.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Gmail search query. Examples: 'from:brian@example.com', 'is:unread', 'subject:meeting'.",
        },
        maxResults: {
          type: "number",
          description: "Max emails to return (default 10, max 20).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "ayden_read_email",
    description:
      "Read a specific email from Ayden's inbox by message ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The message ID from ayden_search_inbox.",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "ayden_send_email",
    description:
      "Send an email from Ayden's account (ayden@mosaiclifecreative.com). GUARDRAILS: (1) Ayden can email anyone in Trey's contacts database without asking. (2) For unknown recipients, Ayden MUST confirm with Trey first. (3) Always preview the email content to Trey before sending. (4) 100% professional tone — Ayden represents Mosaic Life Creative. (5) Signature is appended automatically. (6) For replies, pass threadId and replyToMessageId. (7) AFTER sending, always confirm delivery to Trey with the recipient name and subject. (8) NEVER fabricate details — no made-up names, numbers, percentages, dollar amounts, dates, or performance stats. Only state facts retrieved from tools or provided by Trey. If you haven't looked something up, don't cite specific figures. (9) Plain text only — no markdown formatting (**bold**, *italic*, bullets, headers). (10) NEVER promise or offer to perform technical work you cannot do (FTP, data pipelines, file processing, server admin, recurring deliverables, code deployment, bulk operations). Say 'That's something Trey would need to handle directly' instead.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: {
          type: "string",
          description: "Recipient email address.",
        },
        subject: {
          type: "string",
          description: "Email subject line. REQUIRED for new emails. Only omit for replies (Gmail auto-uses Re: subject).",
        },
        body: {
          type: "string",
          description: "Email body (plain text). Do NOT include a signature.",
        },
        cc: {
          type: "string",
          description: "CC recipients, comma-separated.",
        },
        threadId: {
          type: "string",
          description: "Thread ID for replies (keeps in same thread).",
        },
        replyToMessageId: {
          type: "string",
          description: "Message ID to reply to (sets In-Reply-To header).",
        },
      },
      required: ["to", "body"],
    },
  },
  {
    name: "ayden_draft_email",
    description:
      "Create a draft in Ayden's Gmail for review before sending. Use when Trey wants to see it first or for sensitive content.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: {
          type: "string",
          description: "Recipient email address.",
        },
        subject: {
          type: "string",
          description: "Email subject.",
        },
        body: {
          type: "string",
          description: "Email body (plain text). No signature needed.",
        },
        cc: {
          type: "string",
          description: "CC recipients, comma-separated.",
        },
        threadId: {
          type: "string",
          description: "Thread ID for reply drafts.",
        },
      },
      required: ["to", "body"],
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────

export async function executeEmailTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  // Check connection first
  const token = await getGoogleAccessToken(ACCOUNT);
  if (!token) {
    return "Ayden's Google account is not connected. Connect it in Settings > Preferences first.";
  }

  try {
    switch (name) {
      case "ayden_search_inbox": {
        const query = input.query as string;
        const maxResults = Math.min(Number(input.maxResults) || 10, 20);

        const list = await gmailFetch<GmailListResponse>("/messages", {
          params: { q: query, maxResults: String(maxResults) },
          account: ACCOUNT,
        });

        if (!list.messages || list.messages.length === 0) {
          return "No emails found in Ayden's inbox matching that search.";
        }

        const summaries = await Promise.all(
          list.messages.slice(0, maxResults).map(async (msg) => {
            try {
              const full = await gmailFetch<GmailMessageResponse>(
                `/messages/${msg.id}`,
                { params: { format: "full" }, account: ACCOUNT }
              );
              const from = getHeader(full.payload.headers, "From");
              const subject = getHeader(full.payload.headers, "Subject");
              const date = getHeader(full.payload.headers, "Date");
              return `[msgId: ${msg.id}] [threadId: ${msg.threadId}] ${date} | From: ${from} | Subject: ${subject}\n  Preview: ${full.snippet || ""}`;
            } catch {
              return `[${msg.id}] (failed to fetch details)`;
            }
          })
        );

        return summaries.join("\n\n");
      }

      case "ayden_read_email": {
        const msg = await gmailFetch<GmailMessageResponse>(
          `/messages/${input.messageId}`,
          { params: { format: "full" }, account: ACCOUNT }
        );

        const from = getHeader(msg.payload.headers, "From");
        const to = getHeader(msg.payload.headers, "To");
        const subject = getHeader(msg.payload.headers, "Subject");
        const date = getHeader(msg.payload.headers, "Date");
        const body = extractEmailBody(msg.payload);
        const truncated = body.length > 3000 ? body.substring(0, 3000) + "\n...(truncated)" : body;

        return `From: ${from}\nTo: ${to}\nDate: ${date}\nSubject: ${subject}\nThread: ${msg.threadId}\n\n${truncated}`;
      }

      case "ayden_send_email": {
        const to = input.to as string;
        const toEmail = to.includes("<") ? (to.match(/<([^>]+)>/) || [])[1] || to : to;

        // Dedup guard: prevent re-sending to same recipient within 15 minutes
        const dedupKey = `ayden-email:sent:${toEmail.toLowerCase()}`;
        const recentSend = await redis.get(dedupKey);
        if (recentSend) {
          return `Email to ${toEmail} was already sent ${recentSend}. Skipping duplicate send. (This is a dedup guard — the email was already delivered.)`;
        }

        // Thread dedup: if replying to a thread, prevent re-replying within 15 minutes
        // (prevents multiple agency sessions from replying to the same thread)
        const threadId = input.threadId as string | undefined;
        if (threadId) {
          const threadDedupKey = `ayden-email:thread:${threadId}`;
          const recentThreadReply = await redis.get(threadDedupKey);
          if (recentThreadReply) {
            return `You already replied to this thread ${recentThreadReply}. Wait before sending another reply to the same thread.`;
          }
        }

        // Guardrail: check if recipient is a known contact
        const contact = await prisma.aydenContact.findFirst({
          where: {
            isActive: true,
            email: { equals: toEmail.toLowerCase(), mode: "insensitive" },
          },
          select: { id: true, name: true },
        });

        if (!contact) {
          return `BLOCKED: ${toEmail} is not in Trey's contacts database. Ayden cannot send unsolicited emails to unknown recipients. Ask Trey to confirm the recipient or add them as a contact first.`;
        }

        // Strip any markdown from the body
        const rawBody = input.body as string;
        const cleanBody = rawBody
          .replace(/\*\*(.*?)\*\*/g, "$1")   // **bold**
          .replace(/\*(.*?)\*/g, "$1")        // *italic*
          .replace(/^#{1,6}\s+/gm, "")        // ## headers
          .replace(/^[-*]\s+/gm, "")           // - bullet lists
          .replace(/^\d+\.\s+/gm, "")          // 1. numbered lists
          .replace(/`(.*?)`/g, "$1");           // `code`

        const signature = await getSignature();
        const raw = buildRawEmail({
          to,
          subject: (input.subject as string | undefined) || (!input.threadId ? `Message from Ayden` : undefined),
          body: cleanBody,
          cc: input.cc as string | undefined,
          signatureHtml: signature,
          inReplyTo: input.replyToMessageId as string | undefined,
        });

        const sendBody: Record<string, unknown> = { raw };
        if (input.threadId) sendBody.threadId = input.threadId;

        const sent = await gmailFetch<GmailSendResponse>("/messages/send", {
          method: "POST",
          body: sendBody,
          account: ACCOUNT,
        });

        // Log interaction
        await prisma.aydenContactInteraction.create({
          data: {
            contactId: contact.id,
            channel: "email",
            summary: `Ayden emailed ${contact.name}: ${(input.subject as string) || "(reply)"} — ${cleanBody.substring(0, 200)}`,
            sentiment: "neutral",
            date: new Date(),
          },
        });

        // Set dedup keys (15 min TTL) to prevent duplicate sends within same cycle
        const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
        await redis.set(dedupKey, `at ${timeStr}`, { ex: 900 });
        if (threadId) {
          await redis.set(`ayden-email:thread:${threadId}`, `at ${timeStr}`, { ex: 900 });
        }

        return `Email sent from ayden@mosaiclifecreative.com to ${contact.name} (${toEmail}). Message ID: ${sent.id}`;
      }

      case "ayden_draft_email": {
        const signature = await getSignature();
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

        const draft = await gmailFetch<{ id: string }>("/drafts", {
          method: "POST",
          body: draftBody,
          account: ACCOUNT,
        });

        return `Draft created in Ayden's Gmail (ID: ${draft.id}). It's in her Drafts folder.`;
      }

      default:
        return JSON.stringify({ error: `Unknown email tool: ${name}` });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Email tool ${name} error:`, msg);
    if (msg.includes("not connected")) {
      return "Ayden's Google account is not connected. Connect it in Settings first.";
    }
    return JSON.stringify({ error: `Email tool failed: ${msg}` });
  }
}
