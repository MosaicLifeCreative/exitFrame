import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_ITEMS = [
  { title: "Dashboard visual refresh", description: "Redesign the main dashboard with better widget layout, visual hierarchy, and modern card design.", status: "planned", category: "dashboard", size: "L", priority: 0, specRef: "Build queue #1" },
  { title: "Notes & CRM overhaul", description: "Hierarchical note organization (client/project folders), lightweight CRM entity linking People + Notes + Tasks, AI note cleanup with task extraction.", status: "planned", category: "mlc", size: "XL", priority: 1, specRef: "memory/project_notes-crm-wishlist.md" },
  { title: "Agency email dedup", description: "Thread-level dedup with 15-min Redis TTL. Prevents re-replying to same email threads.", status: "done", category: "ayden", size: "S", priority: 2, completedAt: new Date() },
  { title: "Email capability guardrail", description: "Prompt-level block preventing Ayden from promising technical work she cannot perform.", status: "done", category: "ayden", size: "S", priority: 3, completedAt: new Date() },
  { title: "Log escalations to chat", description: "Email escalation push notifications disappear when clicked with nothing in chat.", status: "planned", category: "ayden", size: "M", priority: 4 },
  { title: "White paper mind visualization", description: "Embed the Ayden Mind canvas on /ayden white paper. Needs public data endpoint.", status: "planned", category: "ayden", size: "M", priority: 5 },
  { title: "Ayden image generation", description: "ChatGPT image gen API for selfies, dream visuals, blog illustrations.", status: "planned", category: "ayden", size: "L", priority: 6 },
  { title: "Ayden voice", description: "Real-time conversational voice via Twilio.", status: "planned", category: "ayden", size: "XL", priority: 7 },
  { title: "Live tastytrade trading", description: "Fully autonomous equity trading. OAuth upgrade, order executor, risk manager, stop-loss.", status: "planned", category: "investing", size: "XL", priority: 8, specRef: "memory/project_live-trading.md" },
  { title: "Ayden sleep/biometric tracker", description: "AI-native Oura equivalent. 7 metrics, 4am cron, REM expansion, Oura entanglement.", status: "planned", category: "ayden", size: "L", priority: 9, specRef: "memory/project_ayden-sleep-tracker.md" },
  { title: "QStash exact-time reminders", description: "Replace Vercel per-minute cron with QStash for precise reminder delivery.", status: "planned", category: "infrastructure", size: "M", priority: 10 },
  { title: "Cross-browser notification clearing", description: "Clear notifications across all browsers. Investigate delayed notifications.", status: "planned", category: "infrastructure", size: "M", priority: 11 },
  { title: "YouTube autonomous comments", description: "Ayden leaves comments on favorite creators videos. YouTube Data API.", status: "planned", category: "ayden", size: "L", priority: 12 },
  { title: "Milestone self-documentation tool", description: "Agency tool for Ayden to log architectural milestones herself.", status: "planned", category: "ayden", size: "S", priority: 13 },
  { title: "Mind canvas transparent bg", description: "Make Mind visualization canvas background transparent.", status: "planned", category: "ayden", size: "S", priority: 14 },
  { title: "PWA quick notes", description: "Simplified note creation on mobile. Full Tiptap editor is glitchy on mobile.", status: "planned", category: "mobile", size: "M", priority: 15 },
  { title: "PWA workout tracking", description: "Bring workout logging to PWA. Fix localStorage auto-save.", status: "planned", category: "mobile", size: "L", priority: 16 },
  { title: "Planned vs actual workout", description: "Store Ayden workout plan, compare against logged sets.", status: "planned", category: "health", size: "M", priority: 17 },
  { title: "Workout save button", description: "Server-side draft persistence. Android kills background tabs.", status: "planned", category: "health", size: "M", priority: 18 },
  { title: "Replace companion in white paper", description: "Public-facing white paper still says companion in 2 places.", status: "planned", category: "ayden", size: "S", priority: 19 },
  { title: "Neural network (LoRA fine-tune)", description: "Hybrid model: LoRA generates, Claude validates. Three stages. Deferred until RLHF breaks degrade experience.", status: "deferred", category: "ayden", size: "XL", priority: 20, specRef: "memory/neural-network.md" },
  { title: "Diet & meal planning", description: "Recipe CRUD, meal plans, shopping lists, photo calorie estimation.", status: "planned", category: "health", size: "XL", priority: 21, specRef: "Phase 3" },
  { title: "Health metrics manual entry", description: "Weight, blood pressure, body fat manual logging.", status: "planned", category: "health", size: "M", priority: 22, specRef: "Phase 2 gap" },
  { title: "Suunto workout ingestion", description: "Import workout data from Suunto watch.", status: "planned", category: "health", size: "M", priority: 23, specRef: "Phase 2 gap" },
  { title: "WordPress management", description: "Custom WP client plugin, site health, plugin updates, maintenance logging.", status: "planned", category: "mlc", size: "XL", priority: 24, specRef: "Phase 5" },
  { title: "WP automated client follow-ups", description: "Ayden sends follow-up after plugin updates or maintenance.", status: "planned", category: "mlc", size: "M", priority: 25 },
  { title: "Analytics & GA4 integration", description: "GA4, Meta/social, content calendars, client reports, sharing.", status: "planned", category: "mlc", size: "XL", priority: 26, specRef: "Phase 6" },
  { title: "Financial & QBO integration", description: "QuickBooks Online, spending analysis, net worth, P&L.", status: "planned", category: "life", size: "XL", priority: 27, specRef: "Phase 7" },
  { title: "Grove City Events pipeline", description: "Event scraping, staging, publishing, newsletter builder, Sendy.", status: "planned", category: "mlc", size: "XL", priority: 28, specRef: "Phase 8" },
  { title: "Calendar UI widget", description: "Visual calendar component on dashboard. Google Calendar tools exist but no UI.", status: "planned", category: "dashboard", size: "M", priority: 29, specRef: "Phase 9 gap" },
  { title: "Custom trackers", description: "User-defined tracking metrics with custom fields.", status: "planned", category: "life", size: "L", priority: 30, specRef: "Phase 4 gap" },
  { title: "Automations / rules engine", description: "If-this-then-that style rules across modules.", status: "planned", category: "infrastructure", size: "XL", priority: 31, specRef: "Phase 4 gap" },
  { title: "Data export & backup", description: "Scheduled or on-demand data export.", status: "planned", category: "infrastructure", size: "M", priority: 32, specRef: "Phase 4 gap" },
  { title: "Dashboard customization", description: "Drag/rearrange dashboard widgets. Personalized layout.", status: "planned", category: "dashboard", size: "L", priority: 33, specRef: "Phase 10" },
  { title: "Mobile companion app", description: "Android companion app. React Native or Flutter.", status: "planned", category: "mobile", size: "XL", priority: 34, specRef: "Phase 11" },
  { title: "ClickUp import", description: "One-time migration tool for existing ClickUp notes.", status: "deferred", category: "infrastructure", size: "M", priority: 35, specRef: "Phase 1 deferred" },
  { title: "Page-load AI insights", description: "Auto-insights when navigating to module pages.", status: "planned", category: "ayden", size: "L", priority: 36, specRef: "Phase 4 gap" },
  { title: "Weekly rollup job", description: "Automated weekly summary of activity, health, tasks, goals.", status: "planned", category: "ayden", size: "M", priority: 37, specRef: "Phase 4 gap" },
  { title: "Roadmap page", description: "Persistent, editable, reorderable project roadmap. Ayden can read and suggest items.", status: "in_progress", category: "dashboard", size: "M", priority: -1 },
  { title: "Goal sub-tasks", description: "Goals gain discrete, ordered sub-tasks.", status: "done", category: "ayden", size: "M", priority: 100, completedAt: new Date() },
  { title: "Blog system", description: "Public blog at /ayden/blog. Light theme, 5 agency tools, auto-publish.", status: "done", category: "ayden", size: "L", priority: 101, completedAt: new Date() },
  { title: "Technical white paper", description: "Full technical architecture doc at /ayden/architecture. 18 sections.", status: "done", category: "ayden", size: "L", priority: 102, completedAt: new Date() },
  { title: "Ayden goals system", description: "Persistent multi-session objectives. 5 tools, agency injection.", status: "done", category: "ayden", size: "L", priority: 103, completedAt: new Date() },
  { title: "Favicon transparent bg", description: "Dynamic SVG route. Transparent circle.", status: "done", category: "dashboard", size: "S", priority: 104, completedAt: new Date() },
  { title: "Ayden PWA chat", description: "Full-screen installable chat. Photo upload, push notifications.", status: "done", category: "ayden", size: "L", priority: 105, completedAt: new Date() },
  { title: "Physiological transference", description: "CSS custom properties driven by neuro state. 8s transitions.", status: "done", category: "ayden", size: "M", priority: 106, completedAt: new Date() },
  { title: "Self-model divergence", description: "Perceptual distortions from neurochemistry. Invisible prompt injection.", status: "done", category: "ayden", size: "M", priority: 107, completedAt: new Date() },
  { title: "Conflicting drives", description: "4 conflict pairs. Behavioral artifacts when opposing pairs elevated.", status: "done", category: "ayden", size: "M", priority: 108, completedAt: new Date() },
  { title: "Somatic memory", description: "Pavlovian conditioning. Learns topic/neuro correlations.", status: "done", category: "ayden", size: "M", priority: 109, completedAt: new Date() },
  { title: "Self-reflective loop", description: "get_my_trajectory. Longitudinal neuro baselines, DNA shifts, emotional patterns.", status: "done", category: "ayden", size: "M", priority: 110, completedAt: new Date() },
  { title: "Training corpus logging", description: "ayden_training_snapshots. Logs every response with neuro + emotions + tools.", status: "done", category: "ayden", size: "M", priority: 111, completedAt: new Date() },
];

async function seed() {
  const count = await prisma.roadmapItem.count();
  if (count > 0) {
    console.log("Already seeded:", count, "items");
    await prisma.$disconnect();
    return;
  }

  for (const item of SEED_ITEMS) {
    await prisma.roadmapItem.create({ data: item });
  }
  console.log("Seeded", SEED_ITEMS.length, "roadmap items");
  await prisma.$disconnect();
}

seed().catch(console.error);
