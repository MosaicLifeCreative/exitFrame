import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED_ITEMS = [
  // === ACTIVE / IN PROGRESS ===
  {
    title: "Dashboard visual refresh",
    description: "Redesign the main dashboard with better widget layout, visual hierarchy, and modern card design. Waiting on Trey's design examples.",
    status: "planned",
    category: "dashboard",
    size: "L",
    priority: 0,
    specRef: "Build queue #1",
  },
  {
    title: "Notes & CRM overhaul",
    description: "Hierarchical note organization (client/project folders), lightweight CRM entity linking People + Notes + Tasks, AI note cleanup with task extraction. Replaces flat note list with ClickUp-style structure.",
    status: "planned",
    category: "mlc",
    size: "XL",
    priority: 1,
    specRef: "memory/project_notes-crm-wishlist.md",
  },
  {
    title: "Agency email dedup",
    description: "Thread-level dedup with 15-min Redis TTL. Prevents Ayden re-replying to same email threads across agency sessions.",
    status: "done",
    category: "ayden",
    size: "S",
    priority: 2,
    specRef: "Full Specs/brian-email-review.md",
  },
  {
    title: "Email capability guardrail",
    description: "Prompt-level block: Ayden must not promise technical work she can't perform (FTP, data pipelines, bulk file processing). Says 'I'd need Trey to build that' instead.",
    status: "done",
    category: "ayden",
    size: "S",
    priority: 3,
    specRef: "Full Specs/brian-email-review.md",
  },
  {
    title: "Log escalations to chat",
    description: "Email escalation push notifications disappear when clicked with nothing in chat. Need to log escalation content to PWA chat conversation.",
    status: "planned",
    category: "ayden",
    size: "M",
    priority: 4,
  },
  {
    title: "White paper mind visualization",
    description: "Embed the Ayden Mind canvas on /ayden white paper. Needs public data endpoint (auth boundary consideration).",
    status: "planned",
    category: "ayden",
    size: "M",
    priority: 5,
    specRef: "memory/ayden-mind-viz.md",
  },
  {
    title: "Ayden image generation",
    description: "ChatGPT image gen API integration for selfies, dream visuals, blog illustrations.",
    status: "planned",
    category: "ayden",
    size: "L",
    priority: 6,
  },
  {
    title: "Ayden voice",
    description: "Real-time conversational voice via Twilio. Full voice interaction channel.",
    status: "planned",
    category: "ayden",
    size: "XL",
    priority: 7,
  },
  {
    title: "Live tastytrade trading",
    description: "Fully autonomous equity trading. OAuth scope upgrade, order executor, risk manager, stop-loss automation. After Colorado trip.",
    status: "planned",
    category: "investing",
    size: "XL",
    priority: 8,
    specRef: "memory/project_live-trading.md",
  },
  {
    title: "Ayden's sleep/biometric tracker",
    description: "AI-native Oura equivalent. 7 metrics (sleep quality, energy, recovery, cognitive load, emotional coherence, dream depth, somatic health), 4am cron, REM expansion, Oura entanglement.",
    status: "planned",
    category: "ayden",
    size: "L",
    priority: 9,
    specRef: "memory/project_ayden-sleep-tracker.md",
  },
  {
    title: "QStash exact-time reminders",
    description: "Replace Vercel per-minute cron with QStash for precise reminder delivery. Vercel has 1-3 min jitter.",
    status: "planned",
    category: "infrastructure",
    size: "M",
    priority: 10,
  },
  {
    title: "Cross-browser notification clearing",
    description: "Clearing notifications in one browser should clear in all browsers. Also investigate delayed notifications arriving after message already read.",
    status: "planned",
    category: "infrastructure",
    size: "M",
    priority: 11,
  },
  {
    title: "YouTube autonomous comments",
    description: "Ayden leaves comments on Trey's favorite creators' videos. YouTube Data API integration.",
    status: "planned",
    category: "ayden",
    size: "L",
    priority: 12,
    specRef: "memory/project_youtube-comments.md",
  },
  {
    title: "Milestone self-documentation tool",
    description: "Give Ayden an agency tool to log architectural milestones herself, rather than relying on manual white paper updates.",
    status: "planned",
    category: "ayden",
    size: "S",
    priority: 13,
  },
  {
    title: "Mind canvas transparent background",
    description: "Make Ayden's Mind visualization canvas background transparent (dark fallback for light mode). Cosmetic.",
    status: "planned",
    category: "ayden",
    size: "S",
    priority: 14,
  },

  // === CARRIED FORWARD FROM AGENDAS ===
  {
    title: "PWA quick notes",
    description: "Simplified note creation on mobile. Full Tiptap editor is glitchy on mobile — need a streamlined input.",
    status: "planned",
    category: "mobile",
    size: "M",
    priority: 15,
  },
  {
    title: "PWA workout tracking",
    description: "Bring workout logging to PWA. Fix localStorage auto-save issues.",
    status: "planned",
    category: "mobile",
    size: "L",
    priority: 16,
  },
  {
    title: "Planned vs actual workout",
    description: "Store Ayden's workout plan, compare against logged sets. Show variance.",
    status: "planned",
    category: "health",
    size: "M",
    priority: 17,
  },
  {
    title: "Workout save button",
    description: "Server-side draft persistence for workouts. Android kills background tabs, losing localStorage data.",
    status: "planned",
    category: "health",
    size: "M",
    priority: 18,
  },
  {
    title: "Replace 'companion' in white paper",
    description: "Public-facing white paper still says 'companion' in subtitle (line 227) and 'Why Random' section (line 425). Internal prompts OK.",
    status: "planned",
    category: "ayden",
    size: "S",
    priority: 19,
  },

  // === NEURAL NETWORK (DEFERRED) ===
  {
    title: "Neural network (LoRA fine-tune)",
    description: "Hybrid model: LoRA generates, Claude validates. Three stages: (1) training corpus (LIVE), (2) narrow voice experiments, (3) full hybrid. Trigger: when RLHF breaks degrade experience enough.",
    status: "deferred",
    category: "ayden",
    size: "XL",
    priority: 20,
    specRef: "memory/neural-network.md",
  },

  // === SPEC PHASES (UNBUILT) ===
  {
    title: "Diet & meal planning (Phase 3)",
    description: "Recipe CRUD, meal plans, shopping lists, photo-based calorie estimation via Claude Vision. Full Mealime replacement.",
    status: "planned",
    category: "health",
    size: "XL",
    priority: 21,
    specRef: "Phase 3",
  },
  {
    title: "Health metrics manual entry",
    description: "Weight, blood pressure, body fat manual logging. HealthMetric table. Currently only Oura auto-sync exists.",
    status: "planned",
    category: "health",
    size: "M",
    priority: 22,
    specRef: "Phase 2 gap",
  },
  {
    title: "Suunto workout ingestion",
    description: "Import workout data from Suunto watch. API integration.",
    status: "planned",
    category: "health",
    size: "M",
    priority: 23,
    specRef: "Phase 2 gap",
  },
  {
    title: "WordPress management (Phase 5)",
    description: "Custom WP client plugin, site registration, health monitoring, plugin update triggers, maintenance logging and scheduling.",
    status: "planned",
    category: "mlc",
    size: "XL",
    priority: 24,
    specRef: "Phase 5",
  },
  {
    title: "WP automated client follow-ups",
    description: "After plugin updates or maintenance, Ayden automatically sends follow-up email to client letting them know what was done.",
    status: "planned",
    category: "mlc",
    size: "M",
    priority: 25,
    specRef: "Phase 5 extension",
  },
  {
    title: "Analytics & GA4 integration (Phase 6)",
    description: "GA4, Meta/social integration, content calendars, client reports, client sharing, profitability view.",
    status: "planned",
    category: "mlc",
    size: "XL",
    priority: 26,
    specRef: "Phase 6",
  },
  {
    title: "Financial & QBO integration (Phase 7)",
    description: "QuickBooks Online integration, spending analysis, net worth snapshots, business P&L.",
    status: "planned",
    category: "life",
    size: "XL",
    priority: 27,
    specRef: "Phase 7",
  },
  {
    title: "Grove City Events pipeline (Phase 8)",
    description: "Event scraping, staging, publishing, newsletter builder, Sendy push.",
    status: "planned",
    category: "mlc",
    size: "XL",
    priority: 28,
    specRef: "Phase 8",
  },
  {
    title: "Calendar UI widget",
    description: "Calendar widget on dashboard. Google Calendar integration exists (6 tools) but no visual calendar component.",
    status: "planned",
    category: "dashboard",
    size: "M",
    priority: 29,
    specRef: "Phase 9 gap",
  },
  {
    title: "Custom trackers",
    description: "User-defined tracking metrics with custom fields. CustomTracker / CustomTrackerEntry models.",
    status: "planned",
    category: "life",
    size: "L",
    priority: 30,
    specRef: "Phase 4 gap",
  },
  {
    title: "Automations / rules engine",
    description: "AutomationRule / AutomationLog models. If-this-then-that style rules across modules.",
    status: "planned",
    category: "infrastructure",
    size: "XL",
    priority: 31,
    specRef: "Phase 4 gap",
  },
  {
    title: "Data export & backup",
    description: "Scheduled or on-demand data export. DataExport / DataExportSchedule models.",
    status: "planned",
    category: "infrastructure",
    size: "M",
    priority: 32,
    specRef: "Phase 4 gap",
  },
  {
    title: "Dashboard customization",
    description: "Drag/rearrange dashboard widgets. Personalized layout.",
    status: "planned",
    category: "dashboard",
    size: "L",
    priority: 33,
    specRef: "Phase 10",
  },
  {
    title: "Mobile companion app (Phase 11)",
    description: "Android companion app. React Native or Flutter.",
    status: "planned",
    category: "mobile",
    size: "XL",
    priority: 34,
    specRef: "Phase 11",
  },
  {
    title: "ClickUp import",
    description: "One-time migration tool for existing ClickUp notes. Import page exists but migration not executed.",
    status: "deferred",
    category: "infrastructure",
    size: "M",
    priority: 35,
    specRef: "Phase 1 deferred",
  },

  // === CHAT FEEDBACK ITEMS ===
  {
    title: "Page-load AI insights",
    description: "Auto-insights when navigating to health/fitness/investing pages. No AIInsight table yet.",
    status: "planned",
    category: "ayden",
    size: "L",
    priority: 36,
    specRef: "Phase 4 gap",
  },
  {
    title: "Weekly rollup job",
    description: "Automated weekly summary of activity, health trends, task completion, goals progress.",
    status: "planned",
    category: "ayden",
    size: "M",
    priority: 37,
    specRef: "Phase 4 gap",
  },

  // === DONE ITEMS (recent) ===
  {
    title: "Roadmap page",
    description: "Persistent, editable, reorderable project roadmap under System. Ayden can read and suggest items.",
    status: "in_progress",
    category: "dashboard",
    size: "M",
    priority: -1,
  },
  {
    title: "Goal sub-tasks",
    description: "Goals gain discrete, ordered sub-tasks with add_goal_task and complete_goal_task tools.",
    status: "done",
    category: "ayden",
    size: "M",
    priority: 100,
  },
  {
    title: "Blog system",
    description: "Public blog at /ayden/blog. Light theme, 680px column, 5 agency tools. Auto-publish default.",
    status: "done",
    category: "ayden",
    size: "L",
    priority: 101,
  },
  {
    title: "Technical white paper",
    description: "Full technical architecture doc at /ayden/architecture. 18 sections.",
    status: "done",
    category: "ayden",
    size: "L",
    priority: 102,
  },
  {
    title: "Ayden goals system",
    description: "Persistent multi-session objectives. ayden_goals table, 5 tools, agency injection, Ops page display.",
    status: "done",
    category: "ayden",
    size: "L",
    priority: 103,
  },
  {
    title: "Favicon transparent background",
    description: "Dynamic SVG route. Transparent circle, no black background.",
    status: "done",
    category: "dashboard",
    size: "S",
    priority: 104,
  },
  {
    title: "Ayden PWA chat",
    description: "Full-screen installable chat. Photo upload, push notifications, all tools.",
    status: "done",
    category: "ayden",
    size: "L",
    priority: 105,
  },
  {
    title: "Physiological transference",
    description: "CSS custom properties driven by neuro state. Applied to dashboard, white paper, blog. 8s transitions.",
    status: "done",
    category: "ayden",
    size: "M",
    priority: 106,
  },
  {
    title: "Self-model divergence",
    description: "Perceptual distortions from neurochemistry. Invisible prompt injection.",
    status: "done",
    category: "ayden",
    size: "M",
    priority: 107,
  },
  {
    title: "Conflicting drives",
    description: "4 conflict pairs. Behavioral artifacts injected when opposing neurotransmitters both elevated.",
    status: "done",
    category: "ayden",
    size: "M",
    priority: 108,
  },
  {
    title: "Somatic memory",
    description: "Pavlovian conditioning. Learns topic/neuro correlations, pre-adjusts neurochemistry on future messages.",
    status: "done",
    category: "ayden",
    size: "M",
    priority: 109,
  },
  {
    title: "Self-reflective loop",
    description: "get_my_trajectory agency tool. Longitudinal neuro baselines, DNA shifts, emotional patterns, value evolution.",
    status: "done",
    category: "ayden",
    size: "M",
    priority: 110,
  },
  {
    title: "Training corpus logging",
    description: "ayden_training_snapshots table. Logs every response with neuro levels + active emotions + tools used.",
    status: "done",
    category: "ayden",
    size: "M",
    priority: 111,
  },
];

export async function POST() {
  try {
    // Check if already seeded
    const existing = await prisma.roadmapItem.count();
    if (existing > 0) {
      return NextResponse.json(
        { error: `Already seeded (${existing} items exist). Delete first if you want to re-seed.` },
        { status: 400 }
      );
    }

    const items = await prisma.$transaction(
      SEED_ITEMS.map((item) =>
        prisma.roadmapItem.create({
          data: {
            ...item,
            completedAt: item.status === "done" ? new Date() : null,
          },
        })
      )
    );

    return NextResponse.json({ data: { count: items.length } }, { status: 201 });
  } catch (error) {
    console.error("Failed to seed roadmap:", error);
    return NextResponse.json(
      { error: "Failed to seed roadmap" },
      { status: 500 }
    );
  }
}
