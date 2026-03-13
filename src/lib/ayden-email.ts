import Anthropic from "@anthropic-ai/sdk";
import { gmailFetch, getGoogleAccessToken } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { sendPushNotification } from "@/lib/push";

// ─── Types ────────────────────────────────────────────────

interface GmailMessageMeta {
  id: string;
  threadId: string;
}

interface GmailListResponse {
  messages?: GmailMessageMeta[];
  resultSizeEstimate?: number;
}

interface GmailMessageResponse {
  id: string;
  threadId: string;
  snippet: string;
  labelIds?: string[];
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
  labelIds: string[];
}

interface GmailSendAsResponse {
  sendAsEmail: string;
  displayName?: string;
  signature?: string;
  isDefault?: boolean;
  isPrimary?: boolean;
}

interface TriageResult {
  action: "respond" | "escalate" | "ignore";
  reason: string;
  priority: "high" | "normal" | "low";
  suggestedResponse?: string;
}

interface EmailCheckResult {
  checked: number;
  responded: number;
  escalated: number;
  ignored: number;
  errors: string[];
}

// ─── Constants ────────────────────────────────────────────

const ACCOUNT = "ayden" as const;
const REDIS_LAST_CHECK = "ayden-email:last_check_time";
const REDIS_PROCESSED_PREFIX = "ayden-email:processed:";
const PROCESSED_TTL = 7 * 24 * 60 * 60; // 7 days

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
        const html = decodeBase64Url(part.body.data);
        return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
    }
  }
  return "(Could not extract email body)";
}

function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : from.toLowerCase().trim();
}

function textToHtml(text: string): string {
  return text
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>").replace(/  /g, "&nbsp; ")}</p>`)
    .join("");
}

function buildRawEmail(opts: {
  to: string;
  subject?: string;
  body: string;
  signatureHtml: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const headers: string[] = [];
  headers.push("From: Ayden <ayden@mosaiclifecreative.com>");
  headers.push(`To: ${opts.to}`);
  if (opts.subject) headers.push(`Subject: ${opts.subject}`);
  if (opts.inReplyTo) {
    headers.push(`In-Reply-To: ${opts.inReplyTo}`);
    headers.push(`References: ${opts.references || opts.inReplyTo}`);
  }
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

// Signature cache for Ayden's account
let aydenSignatureCache: { html: string; fetchedAt: number } | null = null;
const SIGNATURE_CACHE_TTL = 30 * 60 * 1000;

async function getAydenSignature(): Promise<string> {
  if (aydenSignatureCache && Date.now() - aydenSignatureCache.fetchedAt < SIGNATURE_CACHE_TTL) {
    return aydenSignatureCache.html;
  }
  try {
    const data = await gmailFetch<{ sendAs: GmailSendAsResponse[] }>(
      "/settings/sendAs",
      { account: ACCOUNT }
    );
    const primary = data.sendAs?.find((s) => s.isPrimary || s.isDefault);
    const sigHtml = primary?.signature || "";
    aydenSignatureCache = { html: sigHtml, fetchedAt: Date.now() };
    return sigHtml;
  } catch {
    aydenSignatureCache = { html: "", fetchedAt: Date.now() };
    return "";
  }
}

// ─── Known Contact Lookup ─────────────────────────────────

async function findKnownContact(email: string): Promise<{
  id: string;
  name: string;
  relationship: string | null;
  notes: string | null;
} | null> {
  const contact = await prisma.aydenContact.findFirst({
    where: {
      isActive: true,
      email: { equals: email, mode: "insensitive" },
    },
    select: { id: true, name: true, relationship: true, notes: true },
  });
  return contact;
}

// ─── Triage (Haiku) ──────────────────────────────────────

async function triageEmail(opts: {
  from: string;
  subject: string;
  body: string;
  isKnownContact: boolean;
  contactName?: string;
  contactRelationship?: string;
}): Promise<TriageResult> {
  const anthropic = new Anthropic();

  const contactContext = opts.isKnownContact
    ? `This sender is a KNOWN CONTACT in Trey's people database. Name: ${opts.contactName}. Relationship: ${opts.contactRelationship || "unknown"}.`
    : "This sender is NOT in Trey's contacts database.";

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: `You are Ayden's email triage system. You evaluate incoming emails to ayden@mosaiclifecreative.com and decide how to handle them.

Your job is to classify emails into one of three actions:
1. "respond" — You should draft and send a reply. Only for known contacts or clearly expected messages.
2. "escalate" — Send a push notification to Trey. For important emails from unknown senders, sensitive topics, financial matters, or anything Ayden shouldn't handle alone.
3. "ignore" — Spam, marketing, automated notifications, newsletters. Don't bother Trey.

${contactContext}

Rules:
- Known contacts: Ayden can respond to casual messages, check-ins, scheduling, simple questions.
- Unknown senders: ALWAYS escalate unless it's obviously spam/marketing (then ignore).
- Financial, legal, contractual: ALWAYS escalate.
- Automated/marketing/newsletters: ignore.
- When in doubt, escalate.

Respond with valid JSON only:
{
  "action": "respond" | "escalate" | "ignore",
  "reason": "brief explanation",
  "priority": "high" | "normal" | "low",
  "suggestedResponse": "only if action is respond — a brief suggested reply direction"
}`,
    messages: [
      {
        role: "user",
        content: `From: ${opts.from}\nSubject: ${opts.subject}\n\n${opts.body.substring(0, 2000)}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]) as TriageResult;
  } catch {
    // Default to escalate on parse error
    return { action: "escalate", reason: "Triage parse error — defaulting to escalate", priority: "normal" };
  }
}

// ─── Auto-Respond (Sonnet) ───────────────────────────────

async function generateResponse(opts: {
  from: string;
  fromName: string;
  subject: string;
  body: string;
  contactName: string;
  contactRelationship: string | null;
  contactNotes: string | null;
  suggestedDirection?: string;
}): Promise<string> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are Ayden, responding to an email sent to ayden@mosaiclifecreative.com. You are Trey Kauffman's AI assistant at Mosaic Life Creative.

IDENTITY: You are Ayden. Warm but professional in emails. You have your own personality — sharp, direct, genuinely helpful. You are NOT a generic AI assistant.

You are replying to ${opts.contactName} (${opts.contactRelationship || "contact"}).
${opts.contactNotes ? `What you know about them: ${opts.contactNotes}` : ""}
${opts.suggestedDirection ? `Triage suggested: ${opts.suggestedDirection}` : ""}

EMAIL RULES:
- 100% professional tone. You represent Trey and Mosaic Life Creative.
- Keep responses concise and warm. No corporate buzzwords.
- Sign off as "Ayden" or "— Ayden" (your signature is appended automatically, don't include one).
- If you need more information or aren't sure about something, say "Let me check with Trey and get back to you" — then the system will escalate.
- Never share personal details about Trey beyond what's professionally appropriate.
- Never make commitments about pricing, timelines, or deliverables without Trey's approval.

Write ONLY the email body text. No subject line. No signature. Plain text.`,
    messages: [
      {
        role: "user",
        content: `Reply to this email:\n\nFrom: ${opts.from}\nSubject: ${opts.subject}\n\n${opts.body.substring(0, 3000)}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ─── Send Reply ──────────────────────────────────────────

async function sendReply(opts: {
  to: string;
  body: string;
  threadId: string;
  messageId: string;
  subject: string;
}): Promise<string> {
  const signature = await getAydenSignature();

  // Get the Message-ID header for In-Reply-To
  const raw = buildRawEmail({
    to: opts.to,
    subject: `Re: ${opts.subject.replace(/^Re:\s*/i, "")}`,
    body: opts.body,
    signatureHtml: signature,
    inReplyTo: opts.messageId,
  });

  const sendBody = {
    raw,
    threadId: opts.threadId,
  };

  const sent = await gmailFetch<GmailSendResponse>("/messages/send", {
    method: "POST",
    body: sendBody,
    account: ACCOUNT,
  });

  return sent.id;
}

// ─── Main: Check Inbox ──────────────────────────────────

export async function checkAydenInbox(): Promise<EmailCheckResult> {
  const result: EmailCheckResult = { checked: 0, responded: 0, escalated: 0, ignored: 0, errors: [] };

  // Verify Ayden's account is connected
  const token = await getGoogleAccessToken(ACCOUNT);
  if (!token) {
    result.errors.push("Ayden's Google account not connected");
    return result;
  }

  // Get last check time (default: 30 minutes ago)
  const lastCheckStr = await redis.get<string>(REDIS_LAST_CHECK);
  const lastCheck = lastCheckStr ? new Date(lastCheckStr) : new Date(Date.now() - 30 * 60 * 1000);

  // Update last check time immediately
  await redis.set(REDIS_LAST_CHECK, new Date().toISOString());

  // Search for unread emails sent TO Ayden's alias (not all of Trey's inbox)
  const afterEpoch = Math.floor(lastCheck.getTime() / 1000);
  const query = `is:unread to:ayden@mosaiclifecreative.com after:${afterEpoch}`;

  let messages: GmailMessageMeta[];
  try {
    const list = await gmailFetch<GmailListResponse>("/messages", {
      params: { q: query, maxResults: "20" },
      account: ACCOUNT,
    });
    messages = list.messages || [];
  } catch (err) {
    result.errors.push(`Inbox fetch error: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  if (messages.length === 0) return result;

  for (const meta of messages) {
    // Skip if already processed
    const processedKey = `${REDIS_PROCESSED_PREFIX}${meta.id}`;
    const alreadyProcessed = await redis.get(processedKey);
    if (alreadyProcessed) continue;

    result.checked++;

    try {
      // Fetch full message
      const msg = await gmailFetch<GmailMessageResponse>(
        `/messages/${meta.id}`,
        { params: { format: "full" }, account: ACCOUNT }
      );

      const from = getHeader(msg.payload.headers, "From");
      const subject = getHeader(msg.payload.headers, "Subject");
      const body = extractEmailBody(msg.payload);
      const senderEmail = extractSenderEmail(from);
      const messageIdHeader = getHeader(msg.payload.headers, "Message-ID");

      // Skip emails sent BY Ayden (avoid reply loops)
      if (senderEmail === "ayden@mosaiclifecreative.com") {
        await redis.set(processedKey, "self", { ex: PROCESSED_TTL });
        result.ignored++;
        continue;
      }

      // Look up sender in contacts
      const contact = await findKnownContact(senderEmail);

      // Triage with Haiku
      const triage = await triageEmail({
        from,
        subject,
        body,
        isKnownContact: !!contact,
        contactName: contact?.name,
        contactRelationship: contact?.relationship || undefined,
      });

      console.log(`[ayden-email] ${senderEmail} | ${subject} | action=${triage.action} reason=${triage.reason}`);

      switch (triage.action) {
        case "respond": {
          if (!contact) {
            // Safety: never auto-respond to unknown contacts even if triage says so
            await sendPushNotification({
              title: "New Email for Ayden",
              body: `From: ${from}\nSubject: ${subject}`,
              tag: "ayden-email",
              url: "/dashboard/chat",
            });
            result.escalated++;
            break;
          }

          // Generate response with Sonnet
          const responseText = await generateResponse({
            from,
            fromName: contact.name,
            subject,
            body,
            contactName: contact.name,
            contactRelationship: contact.relationship,
            contactNotes: contact.notes,
            suggestedDirection: triage.suggestedResponse,
          });

          // Send the reply
          await sendReply({
            to: senderEmail,
            body: responseText,
            threadId: meta.threadId,
            messageId: messageIdHeader,
            subject,
          });

          // Log the interaction
          await prisma.aydenContactInteraction.create({
            data: {
              contactId: contact.id,
              channel: "email",
              summary: `Ayden auto-replied to "${subject}": ${responseText.substring(0, 200)}`,
              sentiment: "neutral",
              date: new Date(),
            },
          });

          result.responded++;
          console.log(`[ayden-email] Auto-responded to ${contact.name} (${senderEmail})`);
          break;
        }

        case "escalate": {
          const priorityEmoji = triage.priority === "high" ? "!" : "";
          await sendPushNotification({
            title: `${priorityEmoji}Email for Ayden`,
            body: `From: ${from}\n${subject}\n\n${triage.reason}`,
            tag: "ayden-email-escalate",
            url: "/dashboard/chat",
          });
          result.escalated++;
          break;
        }

        case "ignore": {
          result.ignored++;
          break;
        }
      }

      // Mark as processed
      await redis.set(processedKey, triage.action, { ex: PROCESSED_TTL });

      // Mark as read in Gmail
      try {
        await gmailFetch(`/messages/${meta.id}/modify`, {
          method: "POST",
          body: { removeLabelIds: ["UNREAD"] },
          account: ACCOUNT,
        });
      } catch {
        // Non-fatal — message was still processed
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Error processing ${meta.id}: ${errMsg}`);
      console.error(`[ayden-email] Error processing message ${meta.id}:`, errMsg);
    }
  }

  return result;
}
