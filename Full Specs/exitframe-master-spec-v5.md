# exitFrame — Master Spec & Roadmap v5.0

**Updated:** March 10, 2026
**Supersedes:** Spec v4.2 (35 modules, 12 phases) and all prior phase briefings
**Authors:** Trey (Mosaic Life Creative) + Claude

---

## How to Use This Document

**This is a reference document, not a rigid blueprint.**

The original spec (v4.2) was written before Code started building. Reality diverged — and that's fine. Ayden became far more sophisticated than planned. An entire investing module materialized. Fitness models were restructured. BullMQ was swapped for QStash. Every one of those decisions was the right call in the moment.

This document merges the original spec detail with the current state of the project into a single source of truth. For modules that haven't been built yet, it includes data models, feature descriptions, and AI integration notes from the original spec. **These are starting points, not requirements.** Code should:

- Use the data models as a reference, not copy-paste them. If a better schema emerges during implementation, use it.
- Adapt feature descriptions to what makes sense given what's already built. The spec was written assuming a different build order.
- Make architectural decisions that fit the codebase as it exists today, not as the spec imagined it would be.
- Add, remove, or restructure anything that improves the end result.

The spec imagined a Context Assembler with seven layers and a regex-based intent router. Code built Ayden with persistent memory, emotional state, and 57 tools. The spec was wrong — what got built was better. That pattern should continue.

**The one thing that is rigid:** the module registry and phase ordering. This is the agreed-upon plan for what to build and in what order. Changes to scope or priority should be discussed with Trey.

---

## 1. Project Overview

A personal command center and agency management platform at exitframe.org. Replaces ClickUp, Trello, Airtable, Mealime, and Zapier with a single self-owned application managing Trey's personal life and business operations at Mosaic Life Creative.

**Only one user ever logs in.** No multi-tenancy, no user management, no sign-up flow. Auth is email/password + TOTP 2FA. Failed auth redirects to fbi.gov. Trusted device support allows skipping TOTP on recognized browsers.

### Core Principles
- **Single user** — every pixel serves one person
- **API-first** — the backend is a standalone API enabling a future Android companion app
- **Dynamic everything** — clients, products, integrations, and modules are configurable at runtime
- **AI as connective tissue** — Ayden (Claude-powered) sees across all data domains, providing chat, proactive insights, and action triggers across web, SMS, and Slack
- **AI as project manager** — Claude generates plans, breaks work into phases, provides step-by-step guidance
- **Background intelligence** — scheduled jobs sync external data, detect anomalies, surface insights without being asked
- **SaaS killer** — every module reduces dependency on paid third-party tools
- **Phased build** — ship usable chunks, not a monolith

---

## 2. Organizational Structure

Four top-level domains with dynamic entities within each:

### Life (Personal)
- Health Tracking (metrics, blood work, illness, family history, Oura)
- Fitness (lifting, swimming, cardio, AI workout builder)
- Supplements (tracking + intake logging)
- Diet & Calorie AI / Meal Planning
- Financial (net worth, spending, QBO, investing)
- Goal Tracking (tied to real data across all domains)
- Custom Trackers (the "odds & ends" system)
- Plant Care
- Home Projects

### MLC (Mosaic Life Creative — the agency)
- Client Workspaces (per-client hub: notes, projects, services, communication)
- WordPress Site Manager (remote management via custom plugin)
- Content Calendars (social, email, blog — with AI content generation in client voice)
- Analytics (GA4, Meta/social, Sendy email, Google Business reviews)
- Client Communication (Gmail emails, Twilio SMS)
- Client Reports (AI auto-generated monthly reports)
- Client Onboarding (templated setup flows)

### Products (Trey's own products)
- GetShelfed (daily book guessing game)
- ManlyMan (content site — stubbed)
- MLC Website (quest game, AI sharing stats)
- Grove City Events (event scraping, publishing, newsletters)
- Web Dev Tools (WordPress plugin — Freemius + WP.org analytics)
- Each product can define custom metrics and connect external APIs

### System
- Ayden (AI personality across web, SMS, Slack)
- Dashboard homepage with configurable widgets
- Activity feed (cross-domain)
- Passive time tracking
- Automations / rules engine
- Data export & backup
- Settings & preferences
- System health monitoring

---

## 3. Tech Stack (Current)

- **Framework:** Next.js 14+ (App Router), TypeScript (strict)
- **Styling:** Tailwind CSS + Shadcn/ui (Radix primitives)
- **Database:** Supabase (PostgreSQL) via Prisma ORM (47 models currently)
- **Auth:** Supabase Auth (email/password + TOTP 2FA + trusted device bypass via Redis)
- **Storage:** Supabase Storage (images, documents, exports)
- **Cache:** Upstash Redis
- **Scheduled Jobs:** QStash (replaced BullMQ — Vercel-compatible). Vercel Hobby plan limits daily crons; QStash handles hourly schedules.
- **AI:** Claude API (Anthropic) — two-model strategy (Haiku for tool execution, Sonnet for responses). Ayden personality system with persistent memory and emotional state.
- **Hosting:** Vercel (auto-deploy from GitHub) at exitframe.org
- **Charts:** Recharts
- **Channels:** Web chat (slide-out panel, SSE streaming), Twilio SMS (including MMS vision), Slack Events API
- **External APIs (live):** Oura Ring (OAuth2, 13 data types), Finnhub (stock quotes/news), Google Calendar (OAuth2, 6 tools), Gmail (OAuth2, search/read/send/draft), Google Drive (list/get/export/create), Twilio (SMS/MMS/voice-ready)

---

## 4. API Integrations (Full)

### Currently Connected

| Integration | Data | Auth | Sync | Status |
|---|---|---|---|---|
| **Oura Ring** | Sleep, readiness, activity, HRV, body temp (13 types) | OAuth 2.0 | Every 6 hours | ✅ Live |
| **Finnhub** | Stock quotes, company news | API key | Cron-driven | ✅ Live |
| **Google Calendar** | Events, schedules, availability | OAuth 2.0 | Via Ayden tools | ✅ Live |
| **Gmail** | Search, read, send, draft emails | OAuth 2.0 | Via Ayden tools | ✅ Live |
| **Google Drive** | List, get, export files, create folders | OAuth 2.0 | Via Ayden tools | ✅ Live |
| **Twilio** | SMS/MMS send/receive, voice-ready | API key | On demand | ✅ Live |
| **Claude API** | Chat, vision, analysis, content, workout/meal building | API key | On demand + scheduled | ✅ Live |

### Planned (by phase)

| Integration | Data | Auth | Sync | Phase |
|---|---|---|---|---|
| **Suunto** | Workouts, GPS, heart rate | OAuth 2.0 (partner program required) | Daily | Blocked |
| **OpenWeatherMap** | Weather data | API key | On demand | 3 |
| **Brave Search** | Web search results | API key | On demand | 3 |
| **GA4** | Pageviews, sessions, traffic sources, top pages | Google OAuth | Daily | 6 |
| **Meta Graph API** | FB/IG post reach, engagement, posting time | OAuth per account | Daily | 6 |
| **Google Business Profile** | Reviews, ratings, location data | Google OAuth | Daily | 6 |
| **Sendy** | Campaign sends, opens, clicks, bounces | REST API key | Daily | 6 |
| **QuickBooks Online (Personal)** | Spending, income, categories | OAuth 2.0 | Daily | 7 |
| **QuickBooks Online (Business)** | Revenue, expenses, P&L | OAuth 2.0 | Daily | 7 |
| **tastytrade** | Real-time quotes (DxFeed websocket), positions, balances, order execution | Session token (username/password) | Real-time streaming + on demand | 7 |
| **The Events Calendar** | Event CRUD + featured images on GCE WordPress | REST API (app password) | On demand | 8 |
| **Flight Search API** | Flight prices, routes | API key | On demand | 9 |
| **Freemius** | Plugin sales, installs, revenue, deactivations | API key + secret | Daily | 11 |
| **WordPress.org API** | Download counts, ratings, reviews, versions | Public | Daily | 11 |

### Integration Architecture
- Each integration is registered as a record in an `integrations` table
- Integrations have a status (active, paused, error), last sync timestamp, and configuration JSON
- Sync jobs managed by QStash cron and can be triggered manually
- All synced data lands in domain-specific tables, not a generic blob

---

## 5. Module Registry

Every module in the system. Status reflects reality as of March 2026.

### Status Key
- ✅ **DONE** — Feature-complete, in production
- 🟡 **PARTIAL** — Core functionality exists, gaps remain
- 🔲 **NOT BUILT** — Nothing exists yet
- 🆕 **NEW** — Not in original spec, added organically or by roadmap update

| # | Module | Status | Phase |
|---|--------|--------|-------|
| 1 | Core Infrastructure | ✅ | 0 |
| 2 | Auth & Security | ✅ | 0 |
| 3 | System Health Monitor | ✅ | 0 |
| 4 | Client Management | ✅ | 1 |
| 5 | Product Management | ✅ | 1 |
| 6 | Project Tracker | ✅ | 1 |
| 7 | Task Management | ✅ | 1 |
| 8 | Notes & Meeting Actions | ✅ | 1 |
| 9 | Client Onboarding | ✅ | 1 |
| 10 | Activity Feed | ✅ | 1 |
| 11 | Passive Time Tracking | ✅ | 1 |
| 12 | Client Profitability | 🔲 | 6 |
| 13 | WordPress Site Manager | 🔲 | 5 |
| 14 | Recurring Maintenance Schedules | 🔲 | 5 |
| 15 | Client Communication Hub | 🟡 | 5 |
| 16 | Content Calendars & Client Sharing | 🔲 | 6 |
| 17 | Client Voice Profiles | 🔲 | 6 |
| 18 | Client Reports (Auto-Generated) | 🔲 | 6 |
| 19 | GA4 Analytics Dashboard | 🔲 | 6 |
| 20 | Social Media Analytics (Meta) | 🔲 | 6 |
| 21 | Sendy Campaign Metrics | 🔲 | 6 |
| 22 | Google My Business & Reviews | 🔲 | 6 |
| 23 | Health Tracking | 🟡 | 3 |
| 24 | Oura Ring Integration | ✅ | 2 |
| 25 | Fitness & Workout Builder | 🟡 | 3 |
| 26 | Supplements Tracking | ✅ 🆕 | 2 |
| 27 | Diet, Meal Planning & Calorie AI | 🔲 | 4 |
| 28 | Investing | ✅ 🆕 | — |
| 29 | Financial / QBO Integration | 🔲 | 7 |
| 30 | Ayden Core | ✅ 🆕 | — |
| 31 | AI Chat Interface | ✅ | 2 |
| 32 | Multi-Channel AI | ✅ 🆕 | — |
| 33 | Dynamic Context Loading | ✅ | 2 |
| 34 | Page-Load AI Insights | 🔲 | 3 |
| 35 | Background AI Jobs | 🔲 | 9 |
| 36 | Ayden Voice | 🔲 🆕 | 9 |
| 37 | Ayden Proactive Outreach | 🔲 🆕 | 4 |
| 38 | Ayden as MLC Operations Interface | 🔲 🆕 | 5 |
| 39 | Goal Tracking | ✅ | 2 |
| 40 | Custom Trackers | 🔲 | 10 |
| 41 | GCE Event Scraper | 🔲 | 8 |
| 42 | GCE Event Manager | 🔲 | 8 |
| 43 | GCE Newsletter Builder | 🔲 | 8 |
| 44 | Google Calendar | 🟡 | 3 |
| 45 | Gmail Integration | 🟡 | 5 |
| 46 | Google Drive Tools | ✅ 🆕 | — |
| 47 | Plant Care | 🔲 | 11 |
| 48 | Home Projects | 🔲 | 11 |
| 49 | Custom Product Metrics | 🔲 | 10 |
| 50 | Generic API Connectors | 🔲 | 10 |
| 51 | WordPress Plugin Analytics | 🔲 | 11 |
| 52 | Automations / Rules Engine | 🔲 | 10 |
| 53 | Data Export & Backup | 🔲 | 11 |
| 54 | Settings & Preferences | ✅ 🆕 | — |
| 55 | Dashboard Homepage | 🟡 | 3 |
| 56 | Command Palette | ✅ | 1 |
| 57 | Dashboard Customization | 🔲 | 12 |
| 58 | Mobile Responsiveness | 🔲 | 3 |
| 59 | Web Fetch Tool | ✅ 🆕 | — |
| 60 | Weather API | 🔲 🆕 | 3 |
| 61 | Web Search (Brave) | 🔲 🆕 | 3 |
| 62 | Brokerage API (tastytrade) | 🟡 🆕 | 7 |
| 63 | Flight Search | 🔲 🆕 | 9 |
| 64 | Android Companion App | 🔲 | 13 |
| 65 | Demo Mode & Showcase | 🔲 | 13 |
| 66 | Ayden Show-Off Mode | 🔲 🆕 | 13 |
| 67 | Suunto Integration | 🔲 | Blocked |

**Totals: 67 modules** — 26 done, 7 partial, 34 not built

---

## 6. Architecture Notes

### What Was Planned vs. What Was Built

These aren't bugs — they're improvements. Documenting them so Code has full context.

**AI System:**
The spec imagined a Context Assembler with seven layers, per-domain Context Providers with `getSummary()`/`getDetailed()` interfaces, a regex-based intent router, and separate Claude calls for page-load insights vs. chat vs. background jobs. What got built was Ayden — a named personality with persistent memory (AydenMemory), emotional state (AydenEmotionalState), a two-model strategy (Haiku for tool calls, Sonnet for responses), 57 tools across 8 tool files, and cross-channel identity (web, SMS, Slack). Context loading works via `crossDomainContext.ts` as a monolithic assembler rather than per-domain providers.

The spec's ContextProvider pattern is still a good reference for page-load AI (Module 34) and background jobs (Module 35), but the chat system has evolved past it. Build page-load and background features in whatever way integrates cleanly with Ayden's existing architecture.

**Scheduled Jobs:**
BullMQ → QStash. All references to BullMQ should be read as "QStash cron job." Vercel Hobby plan limits daily crons; QStash handles the rest.

**Fitness Models:**
The spec defined `Workout → WorkoutExercise → ExerciseSet`. Code built `WorkoutSession` with per-set tracking including RPE (rate of perceived exertion) and a separate `CardioSession` model for swim/cardio. There's an exercise library with 67 pre-loaded exercises. The AI workout builder works through Ayden's fitness tools rather than a dedicated API endpoint. The data model sections below still show the original spec schemas — adapt as needed.

**Oura:**
Spec called for 3 data types (sleep, readiness, activity). Code syncs 13. The sleep page includes a body status indicator not in the spec.

**Missing from Schema:**
- `HealthMetric` — generic manual health metrics (weight, BP, body fat, resting HR). Phase 3 item.
- `WorkoutPreference` — stored preferences for AI workout generation. Phase 3 item.

### AI Architecture Reference

The spec's AI architecture is still directionally useful for unbuilt features. Key concepts:

**Context Scoping Rules** (which data loads where):

| User Location | Primary Context | Secondary Context |
|---|---|---|
| Dashboard Home | All domains (summary) | Calendar, recent insights, goal progress |
| Health Module | Health metrics, Oura, blood work, illness | Diet, fitness, goals |
| Fitness Module | Workouts, exercise history, preferences | Oura, meals (recovery), goals |
| Diet Module | Recipes, meal logs, macros, meal plans | Health goals, fitness activity |
| Financial Module | QBO data, net worth, spending | Calendar, goals |
| Client Workspace | Client notes, projects, maintenance, voice profile | Analytics, social, content, GMB, time |
| Content Calendar | Calendar entries, client voice, performance | Social metrics, Sendy, content ideas |
| GCE Module | Events, scrape data, newsletters | Sendy metrics |
| Projects | Tasks, deadlines, workload | Calendar, health (capacity), goals |
| Goal Tracking | All goals, progress, linked metrics | Full cross-domain |
| Global Chat | Everything — AI determines relevance | Full cross-domain |

**Interaction Modes:**
1. **Page-Load Insights** — auto-generated on navigation, cached in Redis (4hr TTL), stored in AIInsight table
2. **Chat** — Ayden slide-out panel, always available, context-aware (ALREADY BUILT)
3. **Proactive Insights** — background jobs generate AIInsight records, surface as notifications, urgent ones trigger SMS
4. **Action Triggers** — AI does work: draft emails, build workouts, generate content, process meeting notes. Results presented for review before executing.
5. **Project Manager Mode** — per-project AI guidance with full project context awareness

**Cost Management:**
Target daily API cost: $0.30-0.50 (~$10-15/month). Achieve via:
- Redis caching for page-load insights (4hr TTL)
- Lean context (200-500 tokens per provider summary, 500-1500 for detailed)
- Haiku for tool routing, Sonnet only for final responses
- Background jobs on schedules, not every page load

**Background Job Schedule** (reference — implement as modules are built):

| Job | Frequency | Phase |
|---|---|---|
| Oura Sync | Every 6 hours | ✅ Done |
| Investing Updates | Cron-driven | ✅ Done |
| GA4 Sync | Daily | 6 |
| Meta Sync | Daily | 6 |
| GMB Review Sync | Daily | 6 |
| Sendy Sync | Daily | 6 |
| QBO Sync (Personal + Business) | Daily | 7 |
| Google Calendar Sync | Every 15 min | 3 (widget) |
| GCE Scrape | Daily/configurable | 8 |
| Health Analysis | Weekly (Sunday) | 9 |
| Fitness Analysis | Weekly (Monday) | 9 |
| Financial Analysis | Weekly (Friday) | 9 |
| Cross-Domain Rollup | Weekly (Sunday) | 9 |
| Goal Progress Update | Weekly (Sunday) | 9 |
| Client Profitability | Monthly (1st) | 6 |
| GMB Sentiment Report | Monthly (1st) | 6 |
| Client Report Generation | Monthly (1st) | 6 |
| Plant Watering Check | Daily (morning) | 11 |
| Maintenance Schedule Check | Daily (morning) | 5 |
| Custom Tracker Check | Daily (morning) | 10 |
| Automation Rules | Every 15 min | 10 |
| Data Export | Weekly/Monthly | 11 |

---

## 7. Module Detail — Completed Modules

Brief notes on what exists. No spec detail needed — Code already knows these.

### Module 1: Core Infrastructure ✅
Next.js 14, TypeScript strict, Tailwind + Shadcn/ui, Supabase PostgreSQL + Auth + Storage, Prisma ORM (47 models), Upstash Redis, QStash, Vercel deployment at exitframe.org.

### Module 2: Auth & Security ✅
Email/password + TOTP 2FA via Supabase Auth. Trusted device bypass (cookie + Redis hash, 90-day TTL). FBI redirect on failed auth. Admin API for MFA factor management.

### Module 3: System Health Monitor ✅
/dashboard/system-health — Supabase DB, Redis, Auth service status with response times. DB table row counts. Environment variable presence check. Auto-refresh every 30 seconds.

### Modules 4-11: Business Operations ✅
Client CRUD, Product CRUD (6 products seeded), Projects (domain-polymorphic, phases, dependencies), Tasks (priorities, due dates, reorder), Notes (markdown, meeting notes → AI action pipeline), Client Onboarding (templates, runs, steps), Activity Feed (cross-domain), Passive Time Tracking (heartbeat API, auto per module/client). ClickUp import exists but migration was deferred.

### Module 24: Oura Ring Integration ✅
OAuth2, 13 data types synced, sleep/readiness/activity/HRV, sleep page with body status indicator, trends view.

### Module 26: Supplements Tracking ✅ 🆕
CRUD + intake logging. Not in original spec — built organically.

### Module 28: Investing ✅ 🆕
Holdings CRUD, watchlist, Finnhub quotes/news, AI paper trading (Ayden's Portfolio), cron-driven updates, 11 investing tools.

### Modules 30-33: Ayden & AI ✅ 🆕
Named AI personality with persistent memory (AydenMemory), emotional state (AydenEmotionalState), two-model strategy. Slide-out chat panel on every page with SSE streaming. 57 tools across 8 tool files. Web + SMS (Twilio with MMS vision) + Slack channels. Cross-channel context sharing. Dynamic per-page context loading via crossDomainContext.ts.

### Module 39: Goal Tracking ✅
Quantitative + qualitative goals, milestones, progress entries.

### Modules 46, 54, 56, 59: Utilities ✅ 🆕
Google Drive tools (list, get, export, create folders). Settings/preferences (4-tab page, injected into AI prompts). Command palette (Cmd+K). Web fetch tool (Cheerio-based).

---

## 8. Module Detail — Partially Built

### Module 23: Health Tracking 🟡

**What exists:** Blood test logging (panels, markers, reference ranges, auto-flagging, bulk import), illness/symptom tracking (log, history, resolve), family health history (members + conditions, import), bloodwork trends view.

**What's missing:** The generic `HealthMetric` table for manual daily metrics. There's currently no way to log weight, blood pressure, body fat percentage, or resting heart rate. This is a Phase 3 item.

**Reference data model for the gap:**
```
HealthMetric
├── id (UUID, PK)
├── metric_type (weight, blood_pressure_systolic, blood_pressure_diastolic, body_fat_pct, resting_hr, custom)
├── value (decimal)
├── unit (lbs, mmHg, %, bpm, etc.)
├── recorded_at (timestamp)
├── notes (nullable)
├── created_at
└── updated_at
```

**Reference UI:** Metrics tab on Health page with type selector, line chart (Recharts) with time range selector (7d/30d/90d/1y/all), entry table below, quick-entry dialog.

### Module 25: Fitness & Workout Builder 🟡

**What exists:** WorkoutSession with per-set tracking (weight, reps, RPE), CardioSession for swim/cardio, 67 pre-loaded exercises, AI workout generation via Ayden fitness tools (create_workout_session, etc.), 5-tab fitness interface (sessions, exercises, cardio, templates, history).

**What's missing:** `WorkoutPreference` table — stored preferences the AI uses to build better workouts. Currently AI generates without knowing equipment available, favorite/avoided exercises, pool length, etc.

**Reference data model for the gap:**
```
WorkoutPreference
├── id (UUID, PK)
├── category (lifting, swimming, cardio, flexibility)
├── preference_key (e.g., "favorite_exercises", "avoid_exercises", "pool_length", "default_swim_strokes", "max_workout_duration", "equipment_available")
├── preference_value (JSONB)
├── created_at
└── updated_at
└── @@unique([category, preferenceKey])
```

**Reference UI:** Preferences tab on Fitness page. Lifting: equipment (multi-select), favorites (tag input), avoid list, typical duration, experience level, training split. Swimming: pool length, preferred strokes, typical distance, ability level, equipment. Save → upserts via unique constraint.

### Module 44: Google Calendar 🟡
**What exists:** OAuth connected, 6 calendar tools via Ayden (list, get, create, update, delete, find_free_time).
**What's missing:** Calendar UI widget on dashboard homepage. No visual calendar view — all access is through Ayden chat.

### Module 45: Gmail 🟡
**What exists:** Gmail tools via Ayden (search, read, send, draft).
**What's missing:** Client communication workflow UI (per-client email history, "Draft Email" from maintenance log, etc.). Infrastructure is solid; the UI layer is unbuilt.

### Module 55: Dashboard Homepage 🟡
**What exists:** Layout, sidebar, tasks due today / overdue count / active projects widgets.
**What's missing:** Most widgets are placeholders. Needs Oura scores, recent workouts, investing summary, goals progress, calendar today, and more as modules come online.

### Module 62: Brokerage API (tastytrade) 🟡 🆕
**What exists:** Paper trading via Ayden's Portfolio using Finnhub data.
**What's missing:** Real brokerage connection for live data and execution.

**Decision:** tastytrade (Trey has an existing account). Official JS SDK: `@tastytrade/api` (npm). Sandbox available at `api.cert.tastyworks.com` (resets daily, 15-min delayed quotes).

**Phase 1 — Read-Only (Phase 7 item):**
- Install `@tastytrade/api` SDK
- Auth via `sessionService.login()` — 15-min access tokens, auto-refresh
- Sync real positions via `balancesAndPositionsService.getPositionsList()` → replaces manual holdings entry
- Pull real-time quotes via DxFeed websocket wrapper (replaces Finnhub for price data)
- Display real account balances, buying power, P&L
- Finnhub stays for news only (free tier sufficient)

**Phase 2 — Trading (later, separate decision):**
- Sandbox first — let Ayden trade in sandbox to prove reliability
- Confirmation gates before any live execution
- Order placement via SDK order service
- Options chain data (if needed)

**Env vars needed:** `TASTYTRADE_USERNAME`, `TASTYTRADE_PASSWORD` (or session token approach)

---

## 9. Module Detail — Not Built (Full Reference)

These modules have no code. Data models and feature descriptions are from the original spec — use as reference, adapt freely.

### Module 12: Client Profitability 🔲
**Phase 6** | Requires QBO + time tracking data

Compare hours spent (from passive time tracking) vs revenue per client (from QBO or manual entry). Effective hourly rate calculation. Trend tracking.

```
ClientProfitability
├── id (UUID, PK)
├── client_id (FK → Client)
├── period_month (integer 1-12)
├── period_year (integer)
├── total_hours (decimal)
├── revenue (nullable decimal — from QBO or manual)
├── effective_hourly_rate (nullable decimal)
├── created_at
└── updated_at
```

**AI:** "You spent 14 hours on BCA this month vs 3 hours on Defense Link, but they're at the same rate. Worth revisiting BCA's scope?"

---

### Module 13: WordPress Site Manager 🔲
**Phase 5** | Core MLC business module

Register client WordPress sites. Custom lightweight PHP plugin on each client site exposing authenticated REST endpoints. View site health, trigger remote updates, log maintenance.

```
WordPressSite
├── id (UUID, PK)
├── client_id (FK → Client)
├── domain
├── admin_url
├── api_endpoint (custom plugin endpoint URL)
├── auth_token (encrypted)
├── wp_version (nullable)
├── php_version (nullable)
├── last_health_check (nullable timestamp)
├── health_status (JSONB, nullable)
├── created_at
└── updated_at

MaintenanceLog
├── id (UUID, PK)
├── wordpress_site_id (FK → WordPressSite)
├── maintenance_type (plugin_update, theme_update, core_update, security_scan, backup, custom)
├── description (text)
├── plugins_updated (JSONB, nullable — [{name, from_version, to_version}])
├── performed_at (timestamp)
├── email_drafted (boolean, default false)
├── email_sent (boolean, default false)
├── created_at
└── updated_at
```

**Custom WP Plugin endpoints:**
- `GET /site-health` — versions, plugin list, disk space
- `POST /update-plugins` — trigger plugin updates
- `POST /update-theme` — trigger theme update
- `POST /update-core` — trigger WP core update
- `GET /update-status` — results of last update run
- Auth: shared secret in wp-config.php

---

### Module 14: Recurring Maintenance Schedules 🔲
**Phase 5** | Depends on Module 13

```
MaintenanceSchedule
├── id (UUID, PK)
├── wordpress_site_id (FK → WordPressSite, nullable — null for "all sites")
├── title (e.g., "Monthly Plugin Updates")
├── description (nullable)
├── frequency (weekly, biweekly, monthly, quarterly)
├── day_of_week (nullable integer 0-6)
├── day_of_month (nullable integer 1-28)
├── maintenance_type
├── auto_create_task (boolean, default true)
├── is_active (boolean)
├── last_run_at (nullable)
├── next_run_at (nullable)
├── created_at
└── updated_at

MaintenanceScheduleLog
├── id (UUID, PK)
├── maintenance_schedule_id (FK)
├── wordpress_site_id (FK)
├── status (completed, skipped, failed, overdue)
├── task_id (FK → Task, nullable)
├── maintenance_log_id (FK → MaintenanceLog, nullable)
├── due_date (date)
├── completed_at (nullable)
├── notes (nullable)
├── created_at
└── updated_at
```

---

### Module 15: Client Communication Hub 🟡→🔲 (UI layer)
**Phase 5** | Infrastructure exists (Gmail + Twilio tools), workflow UI doesn't

Build the per-client communication workflow UI over existing Ayden tool infrastructure.

```
Email
├── id (UUID, PK)
├── client_id (FK → Client)
├── recipient_name, recipient_email
├── subject, body_html, body_plain
├── status (draft, ready_to_send, sent, failed)
├── generated_by_ai (boolean)
├── ai_prompt_context (JSONB, nullable)
├── sent_at (nullable), sent_via (gmail)
├── external_id (nullable — Gmail message ID)
├── created_at, updated_at

SMSMessage
├── id (UUID, PK)
├── client_id (FK → Client, nullable)
├── recipient_phone, recipient_name (nullable)
├── message_body (text)
├── direction (outbound, inbound)
├── status (draft, sent, delivered, failed)
├── twilio_sid (nullable)
├── sent_at (nullable)
├── purpose (client_update, reminder, alert, custom)
├── created_at, updated_at
```

**Key feature:** After logging maintenance → "Draft Email" button → AI generates professional email using maintenance log + client contact info → review → send via Gmail. AI varies tone each time.

---

### Module 16: Content Calendars & Client Sharing 🔲
**Phase 6** | Replaces Trello

```
ClientVoice
├── id (UUID, PK)
├── client_id (FK → Client)
├── voice_type (social, email, general)
├── tone (text)
├── vocabulary_notes (text, nullable)
├── example_content (text[])
├── brand_guidelines (text, nullable)
├── target_audience (text, nullable)
├── created_at, updated_at

ContentCalendar
├── id (UUID, PK)
├── client_id (FK → Client)
├── name, calendar_type (social, email, blog, mixed)
├── month, year, status (draft, active, completed, archived)
├── share_token (UUID, nullable), share_enabled, share_expires_at
├── created_at, updated_at

ContentCalendarEntry
├── id (UUID, PK)
├── content_calendar_id (FK)
├── scheduled_date, scheduled_time (nullable)
├── platform (facebook, instagram, email, blog, other)
├── content_type (post, reel, story, carousel, email_campaign, blog_post)
├── title, content_body, caption, hashtags (text[])
├── image_notes, image_url (nullable)
├── status (idea, draft, ready, scheduled, published, skipped)
├── ai_generated (boolean), client_approved (boolean)
├── notes, sort_order
├── created_at, updated_at

EmailContentPlan
├── id (UUID, PK)
├── client_id (FK), content_calendar_id (FK, nullable)
├── campaign_name, scheduled_date
├── subject_line, preview_text, body_content
├── audience_segment, status
├── ai_generated (boolean)
├── sendy_campaign_id (nullable)
├── created_at, updated_at

ClientShareLink
├── id (UUID, PK)
├── client_id (FK)
├── share_type (content_calendar, project_status, report, custom)
├── share_ref_id (nullable)
├── token (UUID), is_active, expires_at
├── password_protected, password_hash
├── last_accessed_at, access_count
├── created_at, updated_at
```

**Key features:**
- Calendar view (month) + board view (Trello-style columns: Idea → Draft → Ready → Scheduled → Published)
- AI generates content in client voice (from ClientVoice profiles)
- Secure share links: clients view read-only at exitframe.org/share/{token}, can approve entries
- "Generate 8 Instagram post ideas for Papa Boo's for March" → Claude generates in Papa Boo's voice

---

### Module 19: GA4 Analytics Dashboard 🔲
**Phase 6**

```
GA4Property
├── id (UUID, PK)
├── client_id (FK, nullable), product_id (FK, nullable)
├── property_id, property_name, domain
├── created_at, updated_at

GA4Snapshot
├── id (UUID, PK)
├── ga4_property_id (FK)
├── date
├── pageviews, sessions, users, new_users (integers)
├── avg_session_duration_seconds, bounce_rate (decimals)
├── top_pages (JSONB), traffic_sources (JSONB)
├── created_at, updated_at
```

Connect multiple GA4 properties. Per-site dashboard: pageviews, sessions, users, bounce rate, top pages, traffic sources. Date range selection, comparison views, combined overview.

---

### Module 20: Social Media Analytics (Meta) 🔲
**Phase 6**

```
SocialAccount
├── id, client_id (FK), platform, account_id, account_name
├── access_token (encrypted), token_expires_at
├── created_at, updated_at

SocialPostMetric
├── id, social_account_id (FK)
├── post_id, post_date, post_time, day_of_week
├── post_type (image, video, carousel, story, reel, text)
├── content_preview, reach, impressions, engagement
├── likes, comments, shares, clicks
├── created_at, updated_at

SocialContentIdea
├── id, social_account_id (FK), client_id (FK)
├── idea_type, title, description, rationale
├── suggested_post_time, suggested_format
├── status (new, saved, used, dismissed)
├── created_at, updated_at
```

**AI features:** Analyzes performance → generates content ideas in client voice → suggests optimal posting times → ideas feed into Content Calendars.

---

### Module 21: Sendy Campaign Metrics 🔲
**Phase 6**

```
SendyCampaign
├── id, client_id (FK, nullable), product_id (FK, nullable)
├── sendy_campaign_id, campaign_name, subject
├── sent_at, total_recipients
├── opens, clicks, bounces, unsubscribes
├── open_rate, click_rate
├── created_at, updated_at
```

---

### Module 22: Google My Business & Reviews 🔲
**Phase 6**

```
GMBLocation
├── id, client_id (FK), gmb_location_id, location_name, address
├── is_active, last_synced_at
├── created_at, updated_at

GMBReview
├── id, gmb_location_id (FK), review_id
├── reviewer_name, star_rating, review_text, review_date
├── reply_text, reply_date
├── sentiment (positive, neutral, negative — AI-classified)
├── sentiment_tags (text[] — food_quality, service_speed, cleanliness, etc.)
├── created_at, updated_at

GMBSentimentReport
├── id, gmb_location_id (FK), client_id (FK)
├── report_month, report_year
├── total_reviews, avg_rating
├── sentiment_breakdown (JSONB), top_themes (JSONB)
├── ai_summary (text), ai_recommendations (text)
├── share_token, share_enabled
├── created_at, updated_at
```

Monthly sentiment reports: total reviews, rating, sentiment breakdown, theme extraction, AI recommendations. Shareable via client links.

---

### Module 18: Client Reports (Auto-Generated) 🔲
**Phase 6**

```
ClientReport
├── id, client_id (FK)
├── report_type (monthly_summary, sentiment, analytics, custom)
├── report_month, report_year, title
├── content_html (rendered report)
├── content_data (JSONB — structured data)
├── sections_included (text[])
├── ai_generated (boolean)
├── share_token, share_enabled, share_expires_at
├── status (draft, ready, shared, archived)
├── created_at, updated_at
```

One-click monthly reports combining maintenance, analytics, social, content, reviews, time spent. AI-generated narrative. Bulk generation. Shareable via secure link.

---

### Module 27: Diet, Meal Planning & Calorie AI 🔲
**Phase 4** | Replaces Mealime

```
Recipe
├── id, name, description, servings
├── prep_time_minutes, cook_time_minutes
├── instructions (text), source (nullable)
├── image_url (nullable), tags (text[]), cuisine (nullable)
├── is_favorite (boolean)
├── created_at, updated_at

RecipeIngredient
├── id, recipe_id (FK), name
├── quantity (decimal), unit
├── calories, protein_g, carbs_g, fat_g (nullable decimals)
├── aisle (nullable — for shopping list grouping)
├── sort_order
├── created_at, updated_at

MealPlan
├── id, name, start_date, end_date
├── status (draft, active, completed)
├── ai_generated (boolean)
├── ai_params (JSONB — calories_target, high_protein, exclude, etc.)
├── created_at, updated_at

MealPlanEntry
├── id, meal_plan_id (FK), date
├── meal_type (breakfast, lunch, dinner, snack)
├── recipe_id (FK), servings, sort_order
├── created_at, updated_at

ShoppingList
├── id, meal_plan_id (FK, nullable), name
├── status (draft, active, completed)
├── created_at, updated_at

ShoppingListItem
├── id, shopping_list_id (FK)
├── ingredient_name, quantity, unit, aisle
├── is_checked (boolean)
├── recipe_sources (JSONB — [{recipe_id, recipe_name}])
├── sort_order
├── created_at, updated_at

MealLog
├── id, date, meal_type
├── recipe_id (FK, nullable), description (nullable)
├── servings_consumed (decimal)
├── photo_url (nullable)
├── ai_calorie_estimate, ai_protein_estimate, ai_carbs_estimate, ai_fat_estimate
├── ai_analysis (JSONB, nullable)
├── created_at, updated_at
```

**Key features:**
- Recipe CRUD with ingredients, macros, tags
- AI Recipe Builder: "Build me a high-protein dinner with chicken and rice" → full recipe
- Meal logging with photo upload → Claude Vision estimates portions/calories
- Weekly meal plans (manual or AI-generated based on calorie/macro targets)
- Shopping list auto-generated from meal plan, organized by aisle, check-off UI

---

### Module 29: Financial / QBO Integration 🔲
**Phase 7**

```
QBOAccount
├── id, qbo_type (personal, business), company_name
├── realm_id, access_token (encrypted), refresh_token (encrypted)
├── token_expires_at, last_sync_at
├── created_at, updated_at

NetWorthSnapshot
├── id, date, total_assets, total_liabilities, net_worth
├── created_at, updated_at

Asset
├── id, snapshot_id (FK), name
├── category (cash, investment, retirement, property, vehicle, other)
├── value (decimal)
├── created_at, updated_at

Liability
├── id, snapshot_id (FK), name
├── category (mortgage, auto_loan, student_loan, credit_card, other)
├── value (decimal)
├── created_at, updated_at

SpendingCategory
├── id, qbo_account_id (FK), period_start, period_end
├── category, amount, transaction_count
├── created_at, updated_at

SpendingTransaction
├── id, qbo_account_id (FK), qbo_transaction_id
├── date, description, category, amount, vendor
├── created_at, updated_at
```

Personal QBO: spending by category, income, budget vs actual. Business QBO: revenue, expenses, P&L, tax tracking. Net worth snapshots with asset allocation.

---

### Modules 41-43: Grove City Events Pipeline 🔲
**Phase 8**

```
ScrapeSource
├── id, name, url, scrape_type (html, api, rss)
├── scrape_config (JSONB — CSS selectors, parsing rules)
├── is_active, last_scraped_at
├── created_at, updated_at

ScrapedEvent
├── id, scrape_source_id (FK), raw_data (JSONB)
├── title, description, start_date, end_date
├── location_name, location_address, url, image_url
├── status (pending_review, approved, rejected, published, duplicate)
├── ai_cleaned (boolean), ai_notes, category
├── created_at, updated_at

PublishedEvent
├── id, scraped_event_id (FK, nullable), tec_event_id
├── title, description, start_date, end_date
├── location_name, location_address, category
├── featured_image_url, published_at
├── created_at, updated_at

Newsletter
├── id, week_start_date, week_end_date, title
├── status (draft, building, ready, sent)
├── html_content, sendy_campaign_id
├── created_at, updated_at

NewsletterEvent
├── id, newsletter_id (FK), published_event_id (FK)
├── sort_order, featured (boolean)
├── custom_description, is_included (boolean)
├── manually_added (boolean)
├── created_at, updated_at
```

**Pipeline:** Configure scrape sources → scheduled scrapes → AI auto-cleans/categorizes → staging view (approve/reject) → publish to The Events Calendar via REST API → pull into newsletter builder → reorder/feature/exclude → generate HTML → push to Sendy.

---

### Module 34: Page-Load AI Insights 🔲
**Phase 3**

No new data models needed if AIInsight already exists. If not:

```
AIInsight
├── id (UUID, PK)
├── insight_type (anomaly, trend, recommendation, alert, weekly_rollup, page_load)
├── domain (health, fitness, financial, projects, social, cross_domain)
├── title, content (text)
├── data_references (JSONB)
├── severity (info, notable, important, urgent)
├── is_read, is_dismissed (booleans)
├── triggered_by (background_job, page_load, user_query)
├── page_context (nullable)
├── created_at, updated_at
```

**Implementation:** POST /api/ai/page-insight endpoint. Check Redis cache → if miss, assemble context → Claude call (Sonnet) → cache result (4hr TTL) → store in AIInsight → return. Invalidate on relevant data writes.

---

### Module 37: Ayden Proactive Outreach 🔲 🆕
**Phase 4**

Self-scheduled messaging system. Ayden sends texts based on triggers without being asked.

Examples:
- Morning briefing: "Hey Trey, readiness score is 82 today. You've got a client call at 2pm and 3 tasks due. Want me to build a workout?"
- Workout reminders based on schedule/patterns
- Goal check-ins: "How's the weight goal going? You haven't logged in 3 days."
- Medication/supplement reminders
- Overdue task nudges

**Implementation:** QStash-driven. Schedule configurations stored in preferences or a dedicated table. Each trigger type has rules for when to fire and what context to include. Messages go through existing Twilio SMS channel.

---

### Module 38: Ayden as MLC Operations Interface 🔲 🆕
**Phase 5**

New Ayden tools for client operations:
- `draft_client_email` — generates email from context (maintenance, project update, etc.) in client voice
- `text_client` — sends SMS to client via Twilio
- `log_maintenance` — creates maintenance log entry
- `check_site_health` — pings client WP plugin endpoint
- `list_overdue_maintenance` — checks maintenance schedules
- `generate_content_ideas` — creates content ideas in client voice
- `create_content_entry` — adds entry to content calendar

"Text BCA that their updates are done" → looks up client → finds contact phone → sends via Twilio.

---

### Module 36: Ayden Voice 🔲 🆕
**Phase 9**

Real-time conversational AI via Twilio Voice. Inbound and outbound calls. Speech-to-text → Ayden processes → text-to-speech response. Same personality and context as chat/SMS.

---

### Module 40: Custom Trackers 🔲
**Phase 10** | The "odds & ends" system

```
CustomTracker
├── id, name, description, category
├── icon (nullable — emoji or icon name)
├── tracker_type (recurring, value_log, checklist, countdown)
├── recurrence_config (JSONB — frequency, interval, unit_label)
├── reminder_enabled, reminder_method (notification, sms, both)
├── reminder_advance_days
├── last_completed_at, next_due_at (auto-calculated)
├── status (active, paused, archived)
├── metadata (JSONB — flexible extra fields)
├── linked_goal_id (FK → Goal, nullable)
├── sort_order
├── created_at, updated_at

CustomTrackerEntry
├── id, tracker_id (FK)
├── entry_type (completed, logged, skipped, noted)
├── value (nullable decimal), value_unit (nullable)
├── notes, cost (nullable decimal)
├── performed_at (timestamp)
├── next_due_at (nullable — override auto-calculated)
├── created_at, updated_at
```

**Four types:** Recurring (contacts every 30 days), Value Log (track numbers over time), Checklist (annual tax prep steps), Countdown (passport expiration).

**Key design:** One table, one set of CRUD endpoints, one context provider. Whether 5 trackers or 50, system handles identically.

---

### Module 49: Custom Product Metrics 🔲
**Phase 10**

```
ProductMetric
├── id, product_id (FK)
├── name, description, category, unit
├── format (number, currency, percentage, duration)
├── direction (higher_is_better, lower_is_better, neutral)
├── target_value, display_color, sort_order
├── reminder_enabled, reminder_cron
├── is_active
├── created_at, updated_at

ProductMetricEntry
├── id, metric_id (FK), value (decimal)
├── recorded_date, source (manual, api_connector, import)
├── connector_id (FK → ApiConnector, nullable)
├── notes
├── created_at, updated_at
```

User-defined KPIs per product. Charts with goal lines, trend indicators. Quick-entry form for weekly check-ins.

---

### Module 50: Generic API Connectors 🔲
**Phase 10**

```
ApiConnector
├── id, product_id (FK, nullable), name, description
├── base_url, auth_type, auth_config (JSONB, encrypted)
├── default_headers (JSONB), rate_limit_rpm, rate_limit_rph
├── is_active, template_slug
├── created_at, updated_at

ApiConnectorEndpoint
├── id, connector_id (FK), name, path, http_method
├── request_body (JSONB, nullable)
├── template_variables (JSONB, nullable)
├── response_mappings (JSONB — extraction rules with JSONPath + transforms)
├── sync_schedule, sync_window, retry_count
├── is_active, sort_order
├── created_at, updated_at

ApiConnectorSyncLog
├── id, endpoint_id (FK), started_at, completed_at
├── status, data_points_written, response_status_code
├── error_message, response_sample (JSONB)
├── created_at, updated_at

ApiConnectorTemplate
├── id, slug (unique), name, description, icon
├── base_url, auth_type
├── default_endpoints (JSONB), setup_instructions (text)
├── created_at, updated_at
```

Visual builder for REST API data pulls. Pre-built templates for Stripe, Gumroad, GitHub, Plausible, Mailchimp, Google Search Console, Shopify, App Store Connect.

---

### Module 51: WordPress Plugin Analytics 🔲
**Phase 11**

```
PluginProduct
├── id, product_id (FK), plugin_slug
├── freemius_plugin_id, freemius_developer_id
├── freemius_api_key (encrypted), freemius_api_secret (encrypted)
├── is_active, last_synced_at
├── created_at, updated_at

PluginStatsSnapshot (daily)
├── id, plugin_product_id (FK), snapshot_date
├── active_installs, active_installs_exact (boolean)
├── total_downloads, rating, num_ratings
├── open_support_threads, resolved_support_threads
├── mrr, total_revenue, free/trial/paid/expired_installs
├── churn_rate, refund_count, trial_conversion_rate
├── deactivations_today, wp_tested_up_to, latest_version
├── created_at, updated_at

PluginVersionAdoption (per version per day)
├── id, plugin_product_id (FK), snapshot_date
├── version, install_count, install_percentage
├── created_at, updated_at

PluginReview
├── id, plugin_product_id (FK), wp_review_id
├── reviewer_name, star_rating, review_text, review_date
├── reply_text, reply_date
├── sentiment, sentiment_tags (text[])
├── is_read
├── created_at, updated_at

PluginDeactivationReason
├── id, plugin_product_id (FK), snapshot_date
├── reason_code, reason_label, count
├── created_at, updated_at

PluginGeoDistribution
├── id, plugin_product_id (FK), snapshot_date
├── country_code, country_name
├── install_count, install_percentage
├── created_at, updated_at

PluginRelease (roadmap)
├── id, plugin_product_id (FK), version, title
├── status (planning, in_development, testing, released)
├── target_date, released_date
├── changelog, ai_drafted_changelog
├── downloads_at_release
├── project_id (FK → Project, nullable)
├── created_at, updated_at
```

Full product intelligence for Web Dev Tools. Freemius + WordPress.org data. AI review sentiment, version adoption, geo distribution, deactivation analysis, development roadmap with AI changelog drafting.

---

### Module 52: Automations / Rules Engine 🔲
**Phase 10**

```
AutomationRule
├── id, name, description
├── trigger_type (schedule, event, condition)
├── trigger_config (JSONB — cron, event name, or condition definition)
├── action_type (create_task, send_sms, send_notification, flag_record, create_activity, draft_email)
├── action_config (JSONB)
├── is_active, last_triggered_at, trigger_count
├── created_at, updated_at

AutomationLog
├── id, rule_id (FK), triggered_at
├── trigger_data (JSONB), action_result (JSONB)
├── status (success, failed), error_message
├── created_at, updated_at
```

**Examples:**
- "If any client site has a core update >7 days → create task + text me"
- "If content calendar entry hits scheduled date still in draft → flag it"
- "If Oura readiness <60 → suggest lighter workout"
- "If plant not watered 2 days past due → text me"

Deterministic rules, not AI. Cheap, fast, reliable.

---

### Module 53: Data Export & Backup 🔲
**Phase 11**

```
DataExport
├── id, export_type (full, domain, module), scope
├── format (json, csv), file_url, file_size_bytes
├── status (queued, in_progress, completed, failed)
├── triggered_by (scheduled, manual)
├── started_at, completed_at, error_message
├── created_at, updated_at

DataExportSchedule
├── id, frequency (weekly, monthly), day_of_week
├── export_type, scope, format
├── retain_count (how many to keep)
├── is_active, last_run_at, next_run_at
├── created_at, updated_at
```

Application-level data export (not database-level — Supabase handles that). Scheduled + on-demand. Compressed uploads to Supabase Storage. SMS alert on failure.

---

### Module 47: Plant Care 🔲
**Phase 11**

```
Plant
├── id, name, species, location
├── watering_frequency_days
├── last_watered, next_water_date (computed)
├── sunlight_needs (low, medium, high)
├── notes, image_url
├── is_active (false if plant died RIP)
├── created_at, updated_at

WateringLog
├── id, plant_id (FK), watered_at
├── notes (e.g., "fertilized", "moved to new pot")
├── created_at, updated_at
```

---

### Module 48: Home Projects 🔲
**Phase 11**

```
HomeProject
├── id, project_id (FK → Project, nullable), name
├── category (lawn, landscaping, seasonal_maintenance, appliance, other)
├── status, start_date, target_completion_date
├── recurrence, budget, spent, notes
├── created_at, updated_at

HomeProjectTask
├── id, home_project_id (FK), title, description
├── status, due_date, sort_order
├── created_at, updated_at

LawnCareSchedule
├── id, home_project_id (FK), month (1-12)
├── activity, product (nullable), notes
├── is_completed, completed_at
├── created_at, updated_at
```

Complex home projects (garage drywall, kitchen remodel) use the full Project system with `project_type: "construction"`. HomeProject is for simpler maintenance and lawn care.

---

### Module 65: Demo Mode & Architecture Showcase 🔲
**Phase 13**

- Demo login at exitframe.org/demo (no auth required)
- Synthetic data across all modules (feels real, reveals nothing)
- Full functionality — every module works in demo mode
- Architecture breakdown page: system diagram, tech stack rationale, API map, AI architecture, security model, DB schema visualization
- Guided tour, demo watermark

### Module 66: Ayden Show-Off Mode 🔲 🆕
**Phase 13** | Requires most modules to be built first

Triggered by telling Ayden to "show off" (or a guest-facing trigger). Ayden takes autonomous control of the dashboard, navigating page to page, pulling live data, and narrating what each module does and how she works.

**Core tools needed:**
- `navigate_to` tool — Ayden calls it, chat panel intercepts and triggers `router.push()`. She controls where the browser goes.
- `highlight_element` tool (optional) — Ayden calls with a CSS selector or element ID, a spotlight overlay dims everything except the target. Simple custom overlay (~50 lines) or library like Shepherd.js.
- `demo_pause` tool — waits N seconds so the viewer can absorb before Ayden moves on.

**Tour choreography:** Hybrid approach — loose script with room for Ayden's personality. She knows what pages exist, what data is on each, and what tools she has. A special system prompt provides tour structure and talking points, but she improvises the narration.

**Data redaction layer:**
- `showOffMode` context flag (React context or Zustand store)
- Components check the flag and blur/mask sensitive fields: bloodwork values, financial numbers, email addresses, portfolio positions, personal health metrics
- Redaction is visual only (CSS blur + placeholder text) — no data filtering at the API level
- Ayden's system prompt in show-off mode instructs her not to read out specific personal values

**Example flow:**
1. Ayden greets the viewer, explains what exitFrame is
2. Navigates to Health → pulls sleep scores, explains Oura integration (values blurred)
3. Moves to Fitness → shows workout history, explains the AI workout builder
4. Hops to Investing → shows AI portfolio, explains her autonomous trading
5. Opens Calendar or Gmail → demonstrates real-time Google integration
6. Returns to Dashboard → wraps up with architecture highlights
7. The whole time she's narrating in the chat panel, streaming text as she goes

---

## 10. Roadmap Phases

### Sizing Key
- **S** = 1-3 days | **M** = 3-7 days | **L** = 1-2 weeks | **XL** = 2-4 weeks

### Phase 0: Foundation — ✅ COMPLETE
### Phase 1: Project Tracker & Client Workspaces — ✅ COMPLETE
### Phase 2: Health & Fitness — ✅ MOSTLY COMPLETE

---

### Phase 3: Close the Gaps + Ayden Quick Wins

| Item | Size | Module(s) |
|------|------|-----------|
| HealthMetric table + UI | M | 23 |
| WorkoutPreference table + UI | S | 25 |
| Page-load AI insights (Health + Fitness) | M | 34 |
| Weather API (Ayden tool) | S | 60 |
| Web search / Brave (Ayden tool) | S | 61 |
| Task management via SMS/Slack | S | 7, 32 |
| Workout editing via SMS | S | 25, 32 |
| Dashboard refresh (real widgets) | M | 55 |
| Calendar UI widget on dashboard | S | 44 |
| Mobile responsiveness (first pass) | M | 58 |
| CLAUDE.md update | S | — |

---

### Phase 4: Diet, Meal Planning & Calorie AI + Proactive Ayden

| Item | Size | Module(s) |
|------|------|-----------|
| Recipe system (CRUD + ingredients + macros) | M | 27 |
| AI Recipe Builder (Ayden tool) | S | 27 |
| Meal logging + photo calorie estimation | M | 27 |
| Meal Planner (AI-generated weekly plans) | L | 27 |
| Shopping list generator | M | 27 |
| Ayden Proactive Outreach | M | 37 |

---

### Phase 5: MLC Business Core — WordPress & Client Ops

| Item | Size | Module(s) |
|------|------|-----------|
| WordPress Site Manager + custom WP plugin | L | 13 |
| Maintenance logging | M | 13 |
| Recurring maintenance schedules | M | 14 |
| Client Communication Hub (UI layer) | M | 15 |
| Client Voice Profiles | M | 17 |
| Ayden as MLC Operations Interface | M | 38 |

---

### Phase 6: Analytics, Content & Client Intelligence

| Item | Size | Module(s) |
|------|------|-----------|
| GA4 Analytics Dashboard | L | 19 |
| Meta/Social Analytics | L | 20 |
| Content Calendars & Client Sharing | XL | 16 |
| Sendy Campaign Metrics | M | 21 |
| GMB Reviews & Sentiment | L | 22 |
| Client Reports (auto-generated) | L | 18 |
| Client Profitability | M | 12 |

---

### Phase 7: Financial & QBO

| Item | Size | Module(s) |
|------|------|-----------|
| QBO Integration (Personal) | L | 29 |
| QBO Integration (Business/MLC) | M | 29 |
| Net Worth Tracking | M | 29 |
| tastytrade Integration (read-only: positions, quotes, balances) | M | 62 |

---

### Phase 8: Grove City Events Pipeline

| Item | Size | Module(s) |
|------|------|-----------|
| Event Scraper | L | 41 |
| Event Manager | M | 42 |
| Newsletter Builder | L | 43 |

---

### Phase 9: Ayden Advanced

| Item | Size | Module(s) |
|------|------|-----------|
| Ayden Voice (Twilio real-time) | L | 36 |
| Flight Search API | M | 63 |
| Background AI Jobs (weekly rollups, notifications) | M | 35 |
| Page-load AI expansion (all major pages) | S | 34 |

---

### Phase 10: Extensibility & Automation

| Item | Size | Module(s) |
|------|------|-----------|
| Custom Trackers | L | 40 |
| Automations / Rules Engine | L | 52 |
| Custom Product Metrics | M | 49 |
| Generic API Connectors | XL | 50 |

---

### Phase 11: Product Intelligence & Life Modules

| Item | Size | Module(s) |
|------|------|-----------|
| WordPress Plugin Analytics (Web Dev Tools) | L | 51 |
| Product integration stubs (GetShelfed, ManlyMan, MLC) | S | 5 |
| Plant Care | M | 47 |
| Home Projects | M | 48 |
| Data Export & Backup | M | 53 |

---

### Phase 12: Polish & Platform

| Item | Size | Module(s) |
|------|------|-----------|
| Dashboard customization (drag/rearrange) | M | 57 |
| Mobile responsiveness (final pass) | M | 58 |
| Performance optimization | M | — |
| ClickUp import (resolve or remove) | S | — |

---

### Phase 13: Mobile & Showcase (Future)

| Item | Size | Module(s) |
|------|------|-----------|
| Android companion app | XL | 64 |
| Demo mode + architecture showcase | L | 65 |
| Ayden Show-Off Mode (navigate, narrate, redact) | M | 66 |

---

## 11. Suunto Status

The Suunto Cloud API explicitly states: "We currently don't offer the API access for personal use." Requires partner program acceptance at https://apizone.suunto.com/.

**Options:**
1. Apply as Mosaic Life Creative — real company, real deployed app at exitframe.org
2. FIT file import — Suunto app exports .fit files, parse with fit-file-parser npm package
3. Return the watch to REI, pick a device with better developer support (Garmin has open APIs for personal use)

The Workout/WorkoutSession model already supports external data (external_id, raw_data, source fields). When resolved, integration follows the Oura pattern.

---

## 12. Environment Variables Roadmap

| Variable | Phase | Service |
|----------|-------|---------|
| OURA_CLIENT_ID, OURA_CLIENT_SECRET | ✅ Done | Oura Ring |
| OPENWEATHERMAP_API_KEY | 3 | Weather |
| BRAVE_SEARCH_API_KEY | 3 | Web Search |
| GA4 credentials | 6 | Google Analytics |
| META_APP_ID, META_APP_SECRET | 6 | Facebook/Instagram |
| SENDY_API_KEY, SENDY_URL | 6 | Sendy |
| GOOGLE_BUSINESS_API credentials | 6 | GMB Reviews |
| QBO_CLIENT_ID, QBO_CLIENT_SECRET | 7 | QuickBooks Online |
| TASTYTRADE_USERNAME | 7 | Brokerage (tastytrade) |
| TASTYTRADE_PASSWORD | 7 | Brokerage (tastytrade) |
| FLIGHT_SEARCH_API_KEY | 9 | Flight Search |
| FREEMIUS credentials | 11 | Plugin Analytics |
