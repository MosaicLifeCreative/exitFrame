/**
 * One-time setup script to create the QStash outreach schedule.
 *
 * Creates a schedule that calls /api/cron/outreach every 2 hours.
 * The endpoint checks waking hours (8am-10pm ET) internally,
 * so off-hours calls are fast no-ops.
 *
 * Usage:
 *   npx tsx scripts/setup-qstash-outreach.ts
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
  const destination = `${APP_URL}/api/cron/outreach`;

  const res = await fetch(`${QSTASH_URL}/v2/schedules/${destination}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Cron": "0 */2 * * *", // Every 2 hours
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

      // Delete old outreach schedules only
      if (s.destination?.includes("/api/cron/outreach")) {
        console.log(`  Deleting old outreach schedule ${s.scheduleId}...`);
        await deleteSchedule(s.scheduleId);
      }
    }
  }

  console.log(`\nCreating 2-hour schedule for ${APP_URL}/api/cron/outreach...`);
  const result = await createSchedule();
  console.log("Schedule created:", result);
  console.log("\nDone! QStash will call the outreach endpoint every 2 hours.");
  console.log("The endpoint checks waking hours (8am-10pm ET) internally.");
}

main().catch(console.error);
