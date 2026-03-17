/**
 * One-time setup script to create QStash backup schedule for agency cron.
 *
 * Vercel cron is primary, QStash is the safety net (guaranteed delivery + retries).
 * The agency route has a 20-minute dedup guard, so double-fires are no-ops.
 *
 * Schedule: "5 14,17,20,23,2 * * *" (UTC) — 5 minutes after Vercel's "0 14,17,20,23,2"
 * This gives Vercel 5 minutes to fire first. If it did, QStash hit gets deduped.
 *
 * Usage:
 *   npx tsx scripts/setup-qstash-agency.ts
 */

import { readFileSync } from "fs";

function loadEnv(path: string) {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* file doesn't exist, skip */ }
}

loadEnv(".env.local");
loadEnv(".env");

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const QSTASH_URL = process.env.QSTASH_URL || "https://qstash.upstash.io";
const APP_URL = process.env.APP_URL || "https://www.exitframe.org";

if (!QSTASH_TOKEN) {
  console.error("QSTASH_TOKEN is required in .env");
  process.exit(1);
}

async function listSchedules() {
  const res = await fetch(`${QSTASH_URL}/v2/schedules`, {
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  return res.json();
}

async function deleteSchedule(scheduleId: string) {
  const res = await fetch(`${QSTASH_URL}/v2/schedules/${scheduleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  return res.ok;
}

async function createSchedule() {
  const destination = `${APP_URL}/api/cron/agency`;

  const res = await fetch(`${QSTASH_URL}/v2/schedules/${destination}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      // 5 minutes after Vercel cron — gives Vercel first shot, QStash is backup
      "Upstash-Cron": "5 14,17,20,23,2 * * *",
      // Retry up to 3 times with backoff
      "Upstash-Retries": "3",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Failed to create schedule:", res.status, text);
    process.exit(1);
  }

  return res.json();
}

async function main() {
  console.log("Checking existing schedules...");
  const existing = await listSchedules();

  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`Found ${existing.length} existing schedule(s):`);
    for (const s of existing) {
      console.log(`  - ${s.scheduleId}: ${s.destination} (${s.cron})`);

      // Delete old agency cron schedules
      if (s.destination?.includes("/api/cron/agency")) {
        console.log(`  Deleting old schedule ${s.scheduleId}...`);
        await deleteSchedule(s.scheduleId);
      }
    }
  }

  console.log(`\nCreating agency backup schedule: ${APP_URL}/api/cron/agency`);
  console.log("Schedule: 5 14,17,20,23,2 * * * (5min after Vercel cron)");
  const result = await createSchedule();
  console.log("Schedule created:", result);
  console.log("\nDone! QStash will fire 5 minutes after each Vercel cron slot.");
  console.log("The agency route deduplicates within 20 minutes, so double-fires are safe.");
}

main().catch(console.error);
