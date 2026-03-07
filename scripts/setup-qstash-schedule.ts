/**
 * One-time setup script to create the hourly QStash schedule.
 *
 * Prerequisites:
 *   - QSTASH_TOKEN in .env
 *   - Your production URL
 *
 * Usage:
 *   npx tsx scripts/setup-qstash-schedule.ts
 *
 * This creates a schedule that calls /api/cron/investing every hour
 * during US market hours (M-F, 9am-5pm ET = 14:00-22:00 UTC).
 * The endpoint itself checks isMarketOpen() so off-hours calls are no-ops.
 */

import "dotenv/config";

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const APP_URL = process.env.APP_URL || "https://www.exitframe.org";

if (!QSTASH_TOKEN) {
  console.error("QSTASH_TOKEN is required in .env");
  process.exit(1);
}

async function listSchedules() {
  const res = await fetch("https://qstash.upstash.io/v2/schedules", {
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  return res.json();
}

async function deleteSchedule(scheduleId: string) {
  const res = await fetch(`https://qstash.upstash.io/v2/schedules/${scheduleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${QSTASH_TOKEN}` },
  });
  return res.ok;
}

async function createSchedule() {
  const destination = `${APP_URL}/api/cron/investing`;

  const res = await fetch(`https://qstash.upstash.io/v2/schedules/${encodeURIComponent(destination)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      "Content-Type": "application/json",
      "Upstash-Cron": "0 * * * *", // Every hour
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

      // Delete old investing cron schedules
      if (s.destination?.includes("/api/cron/investing")) {
        console.log(`  Deleting old schedule ${s.scheduleId}...`);
        await deleteSchedule(s.scheduleId);
      }
    }
  }

  console.log(`\nCreating hourly schedule for ${APP_URL}/api/cron/investing...`);
  const result = await createSchedule();
  console.log("Schedule created:", result);
  console.log("\nDone! QStash will call your cron endpoint every hour.");
  console.log("The endpoint checks market hours internally, so off-hours calls are fast no-ops.");
}

main().catch(console.error);
