# Mosaic Life Dashboard — Full Project Specification
## exitframe.org

**Version:** 4.1
**Last Updated:** February 21, 2026
**Author:** Trey (Mosaic Life Creative) + Claude

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Organizational Structure](#2-organizational-structure)
3. [Design Direction](#3-design-direction)
4. [Tech Stack & Architecture](#4-tech-stack--architecture)
5. [API Integrations](#5-api-integrations)
6. [Data Models](#6-data-models)
7. [Feature Modules — Detailed](#7-feature-modules--detailed)
8. [AI Architecture](#8-ai-architecture)
9. [Phasing Plan](#9-phasing-plan)
10. [Cost Analysis](#10-cost-analysis)
11. [SaaS Replacement Summary](#11-saas-replacement-summary)
12. [Migration Plan](#12-migration-plan)
13. [Open Questions & Future Considerations](#13-open-questions--future-considerations)

---

## 1. Project Overview

### What Is This?
A personal command center and agency management platform, hosted at exitframe.org. It replaces multiple SaaS tools (ClickUp, Trello, Airtable, Mealime, Zapier workflows) with a single, self-owned application that manages every aspect of Trey's personal life and business operations at Mosaic Life Creative.

### Core Principles
- **Single user** — this is built for Trey. No multi-tenant overhead. Every pixel serves one person.
- **API-first architecture** — the backend is a standalone API that the Next.js frontend consumes as a client. This enables a future Android companion app (React Native) to use the same backend.
- **Dynamic everything** — clients, products, integrations, and modules are all configurable at runtime. No dev work to onboard a new client or spin up a new product.
- **AI as connective tissue** — one Claude-powered AI layer that can see across all data domains, providing chat, proactive insights, and action triggers.
- **AI as project manager** — Claude doesn't just track projects, it manages them. For any project type (construction, development, business, personal), Claude can generate plans, break work into phases, provide step-by-step guidance, and walk Trey through unfamiliar tasks in real time.
- **AI on arrival** — page-load AI prompts surface contextual insights automatically when navigating to key sections, without requiring manual queries.
- **Background intelligence** — scheduled jobs sync external data, process trends, detect anomalies, and surface insights without being asked.
- **SaaS killer** — every module built reduces dependency on paid third-party tools.
- **Phased build** — ship usable chunks, not a monolith.

---

## 2. Organizational Structure

The dashboard organizes everything into four top-level domains, with dynamic entities within each.

### Life (Personal)
- Health Tracking
- Fitness (Lifting + Swimming Workout Builder)
- Diet & Calorie AI / Meal Planning
- Financial (Net Worth + Spending Analysis via QBO)
- Goal Tracking (tied to real data across all domains)
- **Custom Trackers** (contacts, oil changes, tax payments, renewals — anything)
- Plant Care
- Home Projects (Lawn Care, Maintenance, Construction with AI PM)
- Calendar (Google Calendar integration)

### MLC — Business Operations
- Client Management (dynamic client list with contact info)
- Client Onboarding Templates (one-click new client setup)
- WordPress Site Manager
- Recurring Maintenance Schedules
- Client Communication Hub (email + Twilio SMS)
- Content Calendars (social + email, Trello-style boards, AI content in client voice)
- GA4 Analytics Dashboard
- Social Media Analytics (Meta) + Content Ideation
- Google My Business / Review Sentiment
- Sendy Campaign Metrics
- Client Reports (auto-generated monthly summaries)
- Passive Time Tracking & Client Profitability
- Financial (Business books via QBO)
- Automations / Rules Engine
- Calendar (Google Calendar integration)

### MLC — Client Workspaces (Dynamic)
Each client gets their own workspace with toggleable modules:
- Notes (including meeting notes with AI action detection)
- Project Tracking / To-Do Lists
- Content Calendar (with client sharing)
- Maintenance Logs
- GA4 Analytics (if connected)
- Social Media Analytics (if connected)
- Google Reviews / Sentiment Reports (if connected)
- Email Campaign Metrics (if connected)
- Client Voice Profile (tone, vocabulary, examples for AI content)
- Monthly Reports (auto-generated, shareable)
- Contact Information (name, email, phone — used in email/SMS personalization)
- Time Spent / Profitability

**Current clients include:** BCA Mechanical, Defense Link, Cristy's, Papa Boo's — but the system supports unlimited clients created at any time.

### Cross-Domain Systems
- AI Chat + Page-Load Insights + Background Intelligence
- Global Activity Feed
- Data Export & Backup
- Demo Mode & Architecture Showcase (future)

### Products (Dynamic)
Each product gets its own workspace with configurable modules:
- GetShelfed.com — game scheduling admin
- ManlyMan.men — stubbed for future (content scheduling, analytics TBD)
- MLC Website — quest game monitoring, AI sharing stats
- Grove City Events — event scraping, staging, publishing (with featured images), newsletter builder

**New products can be created at any time** with whatever modules are relevant.

---

## 3. Design Direction

### Login Screen (exitframe.org landing)
- **Aesthetic:** Top-secret / military / classified
- Dark background (near black or very dark charcoal)
- Subtle animated elements — scan lines, grid pulse, particle field, or matrix-style rain (tasteful, not cheesy)
- Monospace font for input fields
- Minimal branding — small logo mark or wordmark, nothing loud
- **2FA required** — after password, prompt for TOTP code (authenticator app)
- "Authenticating..." animation sequence on submit
- Possibly a brief "ACCESS GRANTED" confirmation before dashboard loads
- No indication of what the site actually does — it just looks like a secure terminal
- **Failed login redirect:** After failed authentication, redirect the user to fbi.gov. No error message, no "try again" — just a clean redirect to the FBI's website. 🫡

### Authenticated Dashboard
- **Aesthetic:** Sleek, modern, clean
- Light or dark mode (user toggle, default dark to match login vibe)
- Dashboard-first homepage with widget-style cards for key metrics across all domains
- Left sidebar navigation organized by domain (Life, MLC, Products)
- Dead simple — if something takes more than one click to find, it's wrong
- Responsive, but desktop-primary (mobile companion app handles mobile use case later)
- Consistent component library — cards, tables, charts, forms all share a design language
- Data visualization using clean charts (Recharts or similar)

### General UI Principles
- No clutter. White space is a feature.
- Progressive disclosure — show summary first, drill down on click
- Toasts/notifications for background AI insights ("Your HRV dropped 15% this week")
- Command palette (Cmd+K style) for quick navigation and AI chat access
- **Page-load AI insights** — when navigating to key sections (Health, Fitness, Financial, etc.), the AI automatically generates and displays contextual insights at the top of the page. No need to open chat or ask a question.

---

## 4. Tech Stack & Architecture

### Frontend
- **Next.js 14+** (App Router) — React-based, supports SSR/SSG, great DX
- **TypeScript** — type safety across the entire codebase
- **Tailwind CSS** — utility-first styling, easy to maintain consistent design
- **Shadcn/ui** — component library built on Radix, highly customizable
- **Recharts** — data visualization
- **Zustand or Jotai** — lightweight client state management

### Backend (API-First)
- **Next.js API Routes** as a thin layer, OR a separate Express/Fastify server
- **Recommendation:** Start with Next.js API routes organized as a clean REST API with clear separation. If the Android app requires a fully decoupled backend later, extract to a standalone server.
- All API routes follow RESTful conventions and are documented
- Authentication via middleware — every route is protected

### Database
- **Supabase** (managed PostgreSQL) — already in use for ManlyMan, keeps everything consolidated
- **Prisma ORM** — type-safe database access, migrations, schema management
- **Supabase Storage** — file storage for food photos, recipe images, GCE event featured images, document uploads
- **Supabase Auth** — built-in 2FA (TOTP) support, handles the authentication layer cleanly

### Background Jobs & Caching
- **Upstash Redis** — serverless Redis, job queue and caching layer
- **BullMQ** — job scheduling and processing (runs on Redis)
- Jobs include: Oura sync, Suunto sync, GA4 pull, Meta pull, Sendy pull, QBO sync, Google Calendar sync, AI analysis runs, GCE scraping, weekly rollups

### AI
- **Claude API (Anthropic)** — all AI functionality
  - Chat / conversational interface
  - Vision (food photo calorie estimation)
  - Analysis (trend detection, anomaly detection, cross-domain insights)
  - Content generation (client emails, newsletter copy, social content ideation)
  - Data cleanup (GCE scraped events)
  - Workout building (lifting + swimming programs)
  - Meal planning and recipe building
  - Page-load contextual insights

### Authentication
- **Supabase Auth** with email/password + **TOTP 2FA**
- JWT session tokens
- API key authentication option for future Android app
- **Failed login behavior:** Redirect to fbi.gov

### Hosting
- **Vercel** — hosts the Next.js application (purpose-built for Next.js)
  - Free tier likely sufficient for single user
  - Pro ($20/mo) if needed for additional serverless function execution time
- **SiteGround** — continues hosting all WordPress sites (client sites, GCE, MLC, etc.)
- **Supabase** — database, auth, file storage (managed, no server maintenance)
- **Upstash** — serverless Redis (no server to manage)
- **AWS** — S3 for Sendy assets (already using with credits)
- Domain: exitframe.org pointed to Vercel
- SSL included via Vercel

### Communication
- **Twilio** — SMS messaging for client texts, personal reminders, alert notifications
- **Gmail API** — send client emails from Trey's email address

---

## 5. API Integrations

### Health & Fitness
| Integration | Data | Auth Method | Sync Frequency |
|---|---|---|---|
| **Oura Ring** | Sleep, readiness, activity, HRV, body temp | OAuth 2.0 | Every 6 hours |
| **Suunto** | Workouts, GPS data, heart rate | OAuth 2.0 | After each workout / daily |

### Analytics & Marketing
| Integration | Data | Auth Method | Sync Frequency |
|---|---|---|---|
| **Google Analytics 4** | Pageviews, sessions, conversions, traffic sources, top pages | Google API (OAuth) | Daily |
| **Meta Graph API** | FB/IG post reach, engagement, impressions, clicks, post time | OAuth per client account | Daily |
| **Google Business Profile API** | Reviews, ratings, replies, location data | Google API (OAuth) | Daily |
| **Sendy** | Campaign sends, opens, clicks, bounces, unsubscribes | REST API (API key) | On demand + daily |

### Financial
| Integration | Data | Auth Method | Sync Frequency |
|---|---|---|---|
| **QuickBooks Online (Personal)** | Personal income, expenses, spending by category | OAuth 2.0 | Daily |
| **QuickBooks Online (Business/MLC)** | Business income, expenses, P&L, spending by category | OAuth 2.0 | Daily |

### Calendar
| Integration | Data | Auth Method | Sync Frequency |
|---|---|---|---|
| **Google Calendar** | Events, schedules, availability | OAuth 2.0 | Real-time / every 15 min |

### Content & Publishing
| Integration | Data | Auth Method | Sync Frequency |
|---|---|---|---|
| **The Events Calendar** | Event CRUD + featured images on GCE WordPress site | REST API (app password) | On demand |
| **WordPress REST API** | Plugin updates, site health (via custom plugin on client sites) | Custom auth token per site | On demand |

### Communication
| Integration | Data | Auth Method | Sync Frequency |
|---|---|---|---|
| **Gmail API** | Send client emails from Trey's email address | OAuth 2.0 | On demand |
| **Twilio** | Send/receive SMS — client texts, reminders, alerts | API key + auth token | On demand |

### AI
| Integration | Data | Auth Method | Sync Frequency |
|---|---|---|---|
| **Claude API** | Chat, vision, analysis, content generation, workout/meal building | API key | On demand + scheduled analysis + page-load triggers |

### Integration Architecture
- Each integration is registered as a record in an `integrations` table
- Integrations have a status (active, paused, error), last sync timestamp, and configuration JSON
- New integrations are added by creating a new integration module — no changes to core architecture
- Sync jobs are managed by BullMQ and can be triggered manually or on schedule
- All synced data lands in domain-specific tables, not a generic blob

---

## 6. Data Models

### Core / System

```
User
├── id (UUID, PK)
├── email
├── password_hash
├── name
├── totp_secret (encrypted — for 2FA)
├── totp_enabled (boolean, default true)
├── failed_login_count (integer, default 0)
├── created_at
└── updated_at

Session
├── id (UUID, PK)
├── user_id (FK → User)
├── token
├── expires_at
└── created_at

Integration
├── id (UUID, PK)
├── name (e.g., "oura", "ga4", "meta", "qbo_personal", "qbo_business", "google_calendar", "twilio")
├── type (health, analytics, communication, content, financial, calendar)
├── status (active, paused, error, not_configured)
├── config (JSONB — API keys, tokens, settings)
├── last_sync_at
├── sync_frequency_minutes
├── created_at
└── updated_at
```

### Clients & Products

```
Client
├── id (UUID, PK)
├── name (business name)
├── contact_first_name
├── contact_last_name
├── contact_email
├── contact_phone (nullable)
├── domain (nullable)
├── address (nullable, text)
├── notes (text)
├── is_active
├── created_at
└── updated_at

ClientService (toggle-on modules per client)
├── id (UUID, PK)
├── client_id (FK → Client)
├── service_type (wordpress, ga4, social_meta, sendy, notes, projects, twilio_sms, gmb, content_calendar)
├── config (JSONB — site-specific settings, GA4 property ID, etc.)
├── is_active
├── created_at
└── updated_at

Product
├── id (UUID, PK)
├── name
├── domain (nullable)
├── description
├── is_active
├── created_at
└── updated_at

ProductModule (configurable modules per product)
├── id (UUID, PK)
├── product_id (FK → Product)
├── module_type (admin_panel, analytics, content_mgmt, game_scheduling, event_pipeline, etc.)
├── config (JSONB)
├── is_active
├── created_at
└── updated_at
```

### Projects & Tasks (Replaces ClickUp)

```
Project
├── id (UUID, PK)
├── name
├── description
├── domain (life, mlc, product)
├── domain_ref_id (nullable FK — client_id, product_id, or null for personal)
├── project_type (general, construction, development, business, creative, learning)
├── status (active, on_hold, completed, archived)
├── priority (low, medium, high, urgent)
├── due_date (nullable)
├── ai_managed (boolean, default false — whether Claude is acting as PM)
├── ai_project_plan (JSONB, nullable — full AI-generated project plan with phases, guidance, notes)
├── current_phase_id (FK → ProjectPhase, nullable — which phase is active)
├── estimated_budget (nullable decimal)
├── actual_spent (nullable decimal)
├── created_at
└── updated_at

ProjectPhase (ordered stages of a project — AI generates these)
├── id (UUID, PK)
├── project_id (FK → Project)
├── name (e.g., "Demo", "Framing", "Electrical", "Drywall", "Mud & Tape", "Paint", "Trim")
├── description (text — AI-generated guidance on what this phase involves)
├── status (not_started, in_progress, completed, blocked)
├── sort_order (integer)
├── depends_on_phase_id (FK → ProjectPhase, nullable — phase dependency)
├── estimated_duration_days (nullable integer)
├── started_at (nullable timestamp)
├── completed_at (nullable timestamp)
├── ai_guidance (text, nullable — detailed step-by-step instructions from Claude)
├── ai_tips (text, nullable — common mistakes, safety warnings, pro tips)
├── created_at
└── updated_at

Task
├── id (UUID, PK)
├── project_id (FK → Project, nullable — tasks can be standalone)
├── phase_id (FK → ProjectPhase, nullable — tasks can belong to a phase)
├── title
├── description (text)
├── status (todo, in_progress, done)
├── priority (low, medium, high, urgent)
├── due_date (nullable)
├── sort_order (integer — manual ordering)
├── depends_on_task_id (FK → Task, nullable — task dependency)
├── created_at
└── updated_at

ProjectMaterial (materials/supplies needed for a project or phase)
├── id (UUID, PK)
├── project_id (FK → Project)
├── phase_id (FK → ProjectPhase, nullable — specific to a phase)
├── name (e.g., "1/2\" Drywall Sheets", "Joint Compound", "Drywall Screws")
├── quantity (decimal)
├── unit (e.g., "sheets", "bucket", "box", "lbs", "ft", "each")
├── estimated_cost (nullable decimal)
├── actual_cost (nullable decimal)
├── where_to_buy (nullable — e.g., "Home Depot", "Lowes")
├── is_purchased (boolean, default false)
├── notes (nullable)
├── sort_order (integer)
├── created_at
└── updated_at

ProjectTool (tools/equipment needed)
├── id (UUID, PK)
├── project_id (FK → Project)
├── phase_id (FK → ProjectPhase, nullable)
├── name (e.g., "Drywall T-Square", "Utility Knife", "Drill/Driver")
├── is_owned (boolean, default false — do you already have this?)
├── estimated_cost (nullable decimal — if need to buy/rent)
├── rent_or_buy (nullable — "rent", "buy", "borrow")
├── notes (nullable)
├── sort_order (integer)
├── created_at
└── updated_at

ProjectMeasurement (dimensions, quantities, calculations)
├── id (UUID, PK)
├── project_id (FK → Project)
├── phase_id (FK → ProjectPhase, nullable)
├── label (e.g., "Garage East Wall", "Kitchen Cabinet Run", "Ceiling Height")
├── value (text — "12ft x 8ft", "34.5 sq ft", "9ft 2in")
├── measurement_type (length, area, volume, count, custom)
├── notes (nullable)
├── created_at
└── updated_at

ProjectPhoto
├── id (UUID, PK)
├── project_id (FK → Project)
├── phase_id (FK → ProjectPhase, nullable)
├── photo_url (stored in Supabase Storage)
├── photo_type (before, during, after, reference, issue)
├── caption (nullable)
├── taken_at (nullable timestamp)
├── created_at
└── updated_at

ProjectContractor (if bringing in help)
├── id (UUID, PK)
├── project_id (FK → Project)
├── name
├── trade (e.g., "Electrician", "Plumber", "General")
├── phone (nullable)
├── email (nullable)
├── quoted_amount (nullable decimal)
├── paid_amount (nullable decimal)
├── notes (nullable)
├── created_at
└── updated_at

Note
├── id (UUID, PK)
├── domain (life, mlc, product)
├── domain_ref_id (nullable FK — client_id, product_id, or null)
├── note_type (general, meeting_notes, reference, checklist)
├── title
├── content (text/markdown)
├── is_pinned
├── has_pending_actions (boolean, default false — true when AI detects unprocessed action items)
├── imported_from (nullable — "clickup" for migrated notes)
├── imported_at (nullable timestamp)
├── created_at
└── updated_at

NoteAction (AI-detected action items from notes — especially meeting notes)
├── id (UUID, PK)
├── note_id (FK → Note)
├── client_id (FK → Client, nullable — if action relates to a specific client)
├── detected_text (text — the excerpt from the note that triggered this action)
├── suggested_action_type (create_task, add_to_content_calendar, schedule_email, schedule_sms, create_project, add_calendar_event, create_reminder, other)
├── suggested_action_data (JSONB — structured payload for the action, e.g., {"title": "Spring Email Blast", "date": "2026-04-01", "platform": "email", "content_summary": "Promote spring menu specials"})
├── status (pending, accepted, dismissed, completed)
├── executed_ref_type (nullable — "content_calendar_entry", "task", "email_content_plan", "calendar_event", etc.)
├── executed_ref_id (nullable UUID — FK to whatever was created when accepted)
├── created_at
└── updated_at
```

### Health Tracking

```
HealthMetric
├── id (UUID, PK)
├── metric_type (weight, blood_pressure_systolic, blood_pressure_diastolic, body_fat_pct, resting_hr, etc.)
├── value (decimal)
├── unit (lbs, mmHg, %, bpm, etc.)
├── recorded_at (timestamp)
├── notes (nullable)
├── created_at
└── updated_at

BloodTest
├── id (UUID, PK)
├── test_date
├── lab_name (nullable)
├── notes (nullable)
├── created_at
└── updated_at

BloodTestResult
├── id (UUID, PK)
├── blood_test_id (FK → BloodTest)
├── marker (e.g., "cholesterol_total", "vitamin_d", "testosterone")
├── value (decimal)
├── unit
├── reference_range_low (nullable decimal)
├── reference_range_high (nullable decimal)
├── flag (normal, low, high, critical)
├── created_at
└── updated_at

Illness
├── id (UUID, PK)
├── name (e.g., "Cold", "COVID-19", "Stomach flu")
├── start_date
├── end_date (nullable — null means ongoing)
├── severity (mild, moderate, severe)
├── symptoms (text[])
├── treatment (text, nullable)
├── notes (nullable)
├── created_at
└── updated_at

FamilyHealthHistory
├── id (UUID, PK)
├── relation (father, mother, sibling, grandparent_paternal, grandparent_maternal, etc.)
├── relation_name (nullable)
├── condition
├── diagnosis_age (nullable integer)
├── notes (nullable)
├── created_at
└── updated_at

OuraData (synced from API)
├── id (UUID, PK)
├── date
├── data_type (sleep, readiness, activity)
├── data (JSONB — full API response for that day/type)
├── readiness_score (nullable integer — extracted for quick queries)
├── sleep_score (nullable integer)
├── activity_score (nullable integer)
├── hrv_average (nullable decimal)
├── created_at
└── updated_at
```

### Fitness

```
Workout
├── id (UUID, PK)
├── date
├── workout_type (strength, cardio, swimming, flexibility, sport, recovery, etc.)
├── name (e.g., "Upper Body Push", "5K Run", "2000yd Swim")
├── duration_minutes (nullable integer)
├── calories_burned (nullable integer)
├── notes (nullable)
├── source (manual, suunto, ai_generated)
├── ai_generation_params (JSONB, nullable — e.g., {"type": "swimming", "target_yards": 2000, "focus": "endurance"})
├── external_id (nullable — Suunto workout ID)
├── raw_data (JSONB, nullable — full Suunto data)
├── created_at
└── updated_at

WorkoutExercise (for strength/structured workouts)
├── id (UUID, PK)
├── workout_id (FK → Workout)
├── exercise_name (e.g., "Bench Press", "Squat", "Freestyle 100yd")
├── sort_order (integer)
├── notes (nullable — e.g., "superset with next exercise")
├── created_at
└── updated_at

ExerciseSet
├── id (UUID, PK)
├── workout_exercise_id (FK → WorkoutExercise)
├── set_number (integer)
├── reps (nullable integer)
├── weight (nullable decimal)
├── weight_unit (lbs, kg)
├── distance (nullable decimal — for swimming/cardio)
├── distance_unit (yards, meters, miles)
├── duration_seconds (nullable integer — for timed exercises/swim intervals)
├── rest_seconds (nullable integer — rest period after this set)
├── notes (nullable)
├── created_at
└── updated_at

WorkoutPreference (AI uses these to build workouts)
├── id (UUID, PK)
├── category (lifting, swimming, cardio, flexibility)
├── preference_key (e.g., "favorite_exercises", "avoid_exercises", "pool_length", "default_swim_strokes", "max_workout_duration")
├── preference_value (JSONB — flexible storage for different preference types)
├── created_at
└── updated_at
```

### Diet, Meal Planning & Calorie AI (Replaces Mealime)

```
Recipe
├── id (UUID, PK)
├── name
├── description (nullable)
├── servings (integer)
├── prep_time_minutes (nullable)
├── cook_time_minutes (nullable)
├── instructions (text)
├── source (nullable — URL or book name)
├── image_url (nullable — stored in Supabase Storage)
├── tags (text[] — e.g., ["high-protein", "meal-prep", "quick"])
├── cuisine (nullable — e.g., "Italian", "Mexican", "American")
├── is_favorite (boolean, default false)
├── created_at
└── updated_at

RecipeIngredient
├── id (UUID, PK)
├── recipe_id (FK → Recipe)
├── name (e.g., "chicken breast")
├── quantity (decimal)
├── unit (g, oz, cup, tbsp, tsp, whole, etc.)
├── calories (nullable decimal — per this quantity)
├── protein_g (nullable decimal)
├── carbs_g (nullable decimal)
├── fat_g (nullable decimal)
├── aisle (nullable — e.g., "Produce", "Meat", "Dairy" — for shopping list grouping)
├── sort_order (integer)
├── created_at
└── updated_at

MealPlan
├── id (UUID, PK)
├── name (nullable — e.g., "Week of March 2")
├── start_date
├── end_date
├── status (draft, active, completed)
├── ai_generated (boolean, default false)
├── ai_params (JSONB, nullable — e.g., {"calories_target": 2200, "high_protein": true, "exclude": ["shellfish"]})
├── created_at
└── updated_at

MealPlanEntry
├── id (UUID, PK)
├── meal_plan_id (FK → MealPlan)
├── date
├── meal_type (breakfast, lunch, dinner, snack)
├── recipe_id (FK → Recipe)
├── servings (decimal)
├── sort_order (integer)
├── created_at
└── updated_at

ShoppingList
├── id (UUID, PK)
├── meal_plan_id (FK → MealPlan, nullable — can be standalone)
├── name (e.g., "Week of March 2 Groceries")
├── status (draft, active, completed)
├── created_at
└── updated_at

ShoppingListItem
├── id (UUID, PK)
├── shopping_list_id (FK → ShoppingList)
├── ingredient_name
├── quantity (decimal)
├── unit
├── aisle (nullable — for store organization)
├── is_checked (boolean, default false)
├── recipe_sources (JSONB — [{recipe_id, recipe_name}] — which recipes need this item)
├── sort_order (integer)
├── created_at
└── updated_at

MealLog
├── id (UUID, PK)
├── date
├── meal_type (breakfast, lunch, dinner, snack)
├── recipe_id (FK → Recipe, nullable — null for non-recipe meals)
├── description (nullable — for non-recipe meals or notes)
├── servings_consumed (decimal — e.g., 1.5 servings)
├── photo_url (nullable — stored in Supabase Storage)
├── ai_calorie_estimate (nullable integer)
├── ai_protein_estimate (nullable decimal)
├── ai_carbs_estimate (nullable decimal)
├── ai_fat_estimate (nullable decimal)
├── ai_analysis (JSONB, nullable — full Claude response)
├── created_at
└── updated_at
```

### Financial (Personal + Business via QBO)

```
QBOAccount
├── id (UUID, PK)
├── qbo_type (personal, business)
├── company_name
├── realm_id (QBO company ID)
├── access_token (encrypted)
├── refresh_token (encrypted)
├── token_expires_at
├── last_sync_at
├── created_at
└── updated_at

NetWorthSnapshot
├── id (UUID, PK)
├── date
├── total_assets (decimal)
├── total_liabilities (decimal)
├── net_worth (decimal — computed)
├── created_at
└── updated_at

Asset
├── id (UUID, PK)
├── snapshot_id (FK → NetWorthSnapshot)
├── name (e.g., "Checking - Chase", "401k", "Home Value")
├── category (cash, investment, retirement, property, vehicle, other)
├── value (decimal)
├── created_at
└── updated_at

Liability
├── id (UUID, PK)
├── snapshot_id (FK → NetWorthSnapshot)
├── name (e.g., "Mortgage", "Car Loan", "Credit Card")
├── category (mortgage, auto_loan, student_loan, credit_card, other)
├── value (decimal)
├── created_at
└── updated_at

SpendingCategory (synced from QBO)
├── id (UUID, PK)
├── qbo_account_id (FK → QBOAccount)
├── period_start (date)
├── period_end (date)
├── category (e.g., "Rent/Mortgage", "Groceries", "Software", "Utilities", "Dining Out", "Contractor Payments")
├── amount (decimal)
├── transaction_count (integer)
├── created_at
└── updated_at

SpendingTransaction (synced from QBO for detail views)
├── id (UUID, PK)
├── qbo_account_id (FK → QBOAccount)
├── qbo_transaction_id (external ID)
├── date
├── description
├── category
├── amount (decimal)
├── vendor (nullable)
├── created_at
└── updated_at
```

### Calendar

```
CalendarEvent (synced from Google Calendar)
├── id (UUID, PK)
├── google_event_id
├── calendar_id (which Google Calendar)
├── title
├── description (nullable)
├── start_time (timestamp)
├── end_time (timestamp)
├── location (nullable)
├── is_all_day (boolean)
├── status (confirmed, tentative, cancelled)
├── attendees (JSONB, nullable)
├── last_synced_at
├── created_at
└── updated_at
```

### Plant Care

```
Plant
├── id (UUID, PK)
├── name (e.g., "Living Room Fern", "Office Succulent")
├── species (nullable)
├── location (e.g., "Living Room", "Back Porch", "Office")
├── watering_frequency_days (integer)
├── last_watered (date, nullable)
├── next_water_date (date, computed)
├── sunlight_needs (low, medium, high)
├── notes (nullable)
├── image_url (nullable)
├── is_active (boolean — false if plant died RIP)
├── created_at
└── updated_at

WateringLog
├── id (UUID, PK)
├── plant_id (FK → Plant)
├── watered_at (timestamp)
├── notes (nullable — e.g., "fertilized", "moved to new pot")
├── created_at
└── updated_at
```

### Home Projects

Note: Home projects that are construction/renovation type (garage drywall, kitchen remodel, etc.) use the full Project system with phases, materials, tools, measurements, photos, and contractors. The HomeProject table below is for simpler home maintenance and lawn care tracking. Complex home projects should be created as a Project with `project_type: "construction"` and `domain: "life"` to get the full AI project manager experience.

```
HomeProject (for maintenance and lawn care — simpler projects)
├── id (UUID, PK)
├── project_id (FK → Project, nullable — link to full Project system for complex projects)
├── name (e.g., "2026 Lawn Care Plan", "Gutter Cleaning Schedule")
├── category (lawn, landscaping, seasonal_maintenance, appliance, other)
├── status (planned, in_progress, completed)
├── start_date (nullable)
├── target_completion_date (nullable)
├── recurrence (nullable — "annual", "seasonal", "monthly", "one_time")
├── budget (nullable decimal)
├── spent (nullable decimal)
├── notes (text, nullable)
├── created_at
└── updated_at

HomeProjectTask
├── id (UUID, PK)
├── home_project_id (FK → HomeProject)
├── title
├── description (nullable)
├── status (todo, in_progress, done)
├── due_date (nullable)
├── sort_order (integer)
├── created_at
└── updated_at

LawnCareSchedule
├── id (UUID, PK)
├── home_project_id (FK → HomeProject)
├── month (integer 1-12)
├── activity (e.g., "Fertilize", "Aerate", "Overseed", "Mow weekly")
├── product (nullable — e.g., "Scotts Turf Builder")
├── notes (nullable)
├── is_completed (boolean)
├── completed_at (nullable timestamp)
├── created_at
└── updated_at
```

### WordPress Site Manager

```
WordPressSite
├── id (UUID, PK)
├── client_id (FK → Client)
├── domain
├── admin_url
├── api_endpoint (custom plugin endpoint URL)
├── auth_token (encrypted)
├── wp_version (nullable — last known)
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
├── email_id (FK → Email, nullable)
├── created_at
└── updated_at
```

### Client Communication

```
Email
├── id (UUID, PK)
├── client_id (FK → Client)
├── recipient_name (pulled from client contact info)
├── recipient_email (pulled from client contact info)
├── subject
├── body_html (text)
├── body_plain (text)
├── status (draft, ready_to_send, sent, failed)
├── generated_by_ai (boolean)
├── ai_prompt_context (JSONB, nullable — what data was used to generate)
├── sent_at (nullable timestamp)
├── sent_via (gmail)
├── external_id (nullable — Gmail message ID)
├── created_at
└── updated_at

SMSMessage
├── id (UUID, PK)
├── client_id (FK → Client, nullable — null for personal reminders)
├── recipient_phone
├── recipient_name (nullable)
├── message_body (text)
├── direction (outbound, inbound)
├── status (draft, sent, delivered, failed)
├── twilio_sid (nullable — Twilio message SID)
├── sent_at (nullable timestamp)
├── purpose (client_update, reminder, alert, custom)
├── created_at
└── updated_at
```

### Analytics

```
GA4Property
├── id (UUID, PK)
├── client_id (FK → Client, nullable — null for own sites)
├── product_id (FK → Product, nullable)
├── property_id (GA4 property ID string)
├── property_name
├── domain
├── created_at
└── updated_at

GA4Snapshot
├── id (UUID, PK)
├── ga4_property_id (FK → GA4Property)
├── date
├── pageviews (integer)
├── sessions (integer)
├── users (integer)
├── new_users (integer)
├── avg_session_duration_seconds (decimal)
├── bounce_rate (decimal)
├── top_pages (JSONB — [{path, views}])
├── traffic_sources (JSONB — [{source, medium, sessions}])
├── created_at
└── updated_at

SocialAccount
├── id (UUID, PK)
├── client_id (FK → Client)
├── platform (facebook, instagram)
├── account_id (platform-specific ID)
├── account_name
├── access_token (encrypted)
├── token_expires_at (nullable)
├── created_at
└── updated_at

SocialPostMetric
├── id (UUID, PK)
├── social_account_id (FK → SocialAccount)
├── post_id (platform-specific)
├── post_date
├── post_time (time — for optimal posting time analysis)
├── day_of_week (integer 0-6 — for posting pattern analysis)
├── post_type (image, video, carousel, story, reel, text)
├── content_preview (text, nullable — first 200 chars)
├── reach (integer)
├── impressions (integer)
├── engagement (integer)
├── likes (integer)
├── comments (integer)
├── shares (integer)
├── clicks (nullable integer)
├── created_at
└── updated_at

SocialContentIdea (AI-generated based on metrics)
├── id (UUID, PK)
├── social_account_id (FK → SocialAccount)
├── client_id (FK → Client)
├── idea_type (post_concept, content_series, optimal_timing, format_recommendation)
├── title
├── description (text)
├── rationale (text — why AI suggested this based on data)
├── suggested_post_time (nullable — optimal day/time based on metrics)
├── suggested_format (nullable — e.g., "reel", "carousel")
├── status (new, saved, used, dismissed)
├── created_at
└── updated_at

SendyCampaign
├── id (UUID, PK)
├── client_id (FK → Client, nullable)
├── product_id (FK → Product, nullable — for GCE newsletters)
├── sendy_campaign_id
├── campaign_name
├── subject
├── sent_at (nullable timestamp)
├── total_recipients (integer)
├── opens (integer)
├── clicks (integer)
├── bounces (integer)
├── unsubscribes (integer)
├── open_rate (decimal, computed)
├── click_rate (decimal, computed)
├── created_at
└── updated_at
```

### Content Calendars & Client Sharing

```
ClientVoice (defines a client's brand voice for AI content generation)
├── id (UUID, PK)
├── client_id (FK → Client)
├── voice_type (social, email, general)
├── tone (e.g., "professional but approachable", "playful and bold", "formal and authoritative")
├── vocabulary_notes (text, nullable — specific words/phrases to use or avoid)
├── example_content (text[] — sample posts/emails that represent the voice well)
├── brand_guidelines (text, nullable — any additional brand rules)
├── target_audience (text, nullable — who the content is for)
├── created_at
└── updated_at

ContentCalendar
├── id (UUID, PK)
├── client_id (FK → Client)
├── name (e.g., "Papa Boo's March 2026 Social Calendar")
├── calendar_type (social, email, blog, mixed)
├── month (integer 1-12)
├── year (integer)
├── status (draft, active, completed, archived)
├── share_token (UUID, nullable — unique token for client-facing shared link)
├── share_enabled (boolean, default false)
├── share_expires_at (nullable timestamp)
├── created_at
└── updated_at

ContentCalendarEntry
├── id (UUID, PK)
├── content_calendar_id (FK → ContentCalendar)
├── scheduled_date (date)
├── scheduled_time (nullable time)
├── platform (facebook, instagram, email, blog, other)
├── content_type (post, reel, story, carousel, email_campaign, blog_post, other)
├── title (nullable)
├── content_body (text, nullable — the actual copy/content)
├── caption (text, nullable — for social posts)
├── hashtags (text[], nullable)
├── image_notes (text, nullable — description of visual needed)
├── image_url (nullable — if asset is uploaded)
├── status (idea, draft, ready, scheduled, published, skipped)
├── ai_generated (boolean, default false)
├── client_approved (boolean, default false — tracked via shared view)
├── notes (text, nullable)
├── sort_order (integer)
├── created_at
└── updated_at

EmailContentPlan (for email/Sendy clients — planned campaigns)
├── id (UUID, PK)
├── client_id (FK → Client)
├── content_calendar_id (FK → ContentCalendar, nullable — can be linked to a calendar)
├── campaign_name
├── scheduled_date (date)
├── subject_line (nullable)
├── preview_text (nullable)
├── body_content (text, nullable — AI-drafted or manual)
├── audience_segment (nullable)
├── status (idea, draft, ready, sent, skipped)
├── ai_generated (boolean, default false)
├── sendy_campaign_id (nullable — linked after sending)
├── notes (nullable)
├── created_at
└── updated_at

ClientShareLink (secure read-only access for clients)
├── id (UUID, PK)
├── client_id (FK → Client)
├── share_type (content_calendar, project_status, report, custom)
├── share_ref_id (nullable — ID of the shared entity)
├── token (UUID — unique URL token)
├── is_active (boolean, default true)
├── expires_at (nullable timestamp)
├── password_protected (boolean, default false)
├── password_hash (nullable)
├── last_accessed_at (nullable timestamp)
├── access_count (integer, default 0)
├── created_at
└── updated_at
```

### Grove City Events

```
ScrapeSource
├── id (UUID, PK)
├── name (e.g., "City of Grove City Events Page")
├── url
├── scrape_type (html, api, rss)
├── scrape_config (JSONB — CSS selectors, parsing rules)
├── is_active
├── last_scraped_at (nullable)
├── created_at
└── updated_at

ScrapedEvent (staging area)
├── id (UUID, PK)
├── scrape_source_id (FK → ScrapeSource)
├── raw_data (JSONB — original scraped data)
├── title
├── description (text, nullable)
├── start_date (timestamp)
├── end_date (nullable timestamp)
├── location_name (nullable)
├── location_address (nullable)
├── url (nullable — link to original event)
├── image_url (nullable — scraped featured image)
├── status (pending_review, approved, rejected, published, duplicate)
├── ai_cleaned (boolean — whether AI has processed this)
├── ai_notes (text, nullable — AI suggestions/flags)
├── category (nullable)
├── created_at
└── updated_at

PublishedEvent
├── id (UUID, PK)
├── scraped_event_id (FK → ScrapedEvent, nullable — null if manually created)
├── tec_event_id (The Events Calendar post ID)
├── title
├── description
├── start_date
├── end_date
├── location_name
├── location_address
├── category
├── featured_image_url (nullable — image pushed to TEC with the event)
├── published_at
├── created_at
└── updated_at

Newsletter
├── id (UUID, PK)
├── week_start_date (date — Monday of the newsletter week)
├── week_end_date (date — Sunday)
├── title (e.g., "Grove City Events — Week of March 2")
├── status (draft, building, ready, sent)
├── html_content (text, nullable — final newsletter HTML)
├── sendy_campaign_id (nullable — after sending)
├── created_at
└── updated_at

NewsletterEvent (junction — which events appear in which newsletter)
├── id (UUID, PK)
├── newsletter_id (FK → Newsletter)
├── published_event_id (FK → PublishedEvent)
├── sort_order (integer)
├── featured (boolean, default false)
├── custom_description (text, nullable — override for newsletter)
├── is_included (boolean, default true — false to exclude/delete from email)
├── manually_added (boolean, default false — true if not auto-pulled)
├── created_at
└── updated_at
```

### Passive Time Tracking

```
TimeEntry (auto-tracked based on module/client activity — hands-off)
├── id (UUID, PK)
├── client_id (FK → Client, nullable)
├── project_id (FK → Project, nullable)
├── domain (life, mlc, product)
├── module (wordpress, notes, content_calendar, projects, communication, analytics, etc.)
├── activity_description (auto-generated — e.g., "Editing BCA content calendar", "Reviewing GA4 analytics", "Drafting email")
├── started_at (timestamp)
├── ended_at (nullable timestamp)
├── duration_minutes (computed)
├── source (auto — inferred from page activity, idle detection)
├── created_at
└── updated_at

ClientProfitability (computed/cached — AI uses for insights)
├── id (UUID, PK)
├── client_id (FK → Client)
├── period_month (integer 1-12)
├── period_year (integer)
├── total_hours (decimal)
├── revenue (nullable decimal — from QBO or manual)
├── effective_hourly_rate (nullable decimal — revenue / hours)
├── created_at
└── updated_at
```

### Google My Business / Reviews

```
GMBLocation (connected Google Business Profile)
├── id (UUID, PK)
├── client_id (FK → Client)
├── gmb_location_id (Google's location ID)
├── location_name
├── address (nullable)
├── is_active (boolean)
├── last_synced_at (nullable timestamp)
├── created_at
└── updated_at

GMBReview
├── id (UUID, PK)
├── gmb_location_id (FK → GMBLocation)
├── review_id (Google's review ID)
├── reviewer_name
├── star_rating (integer 1-5)
├── review_text (text, nullable)
├── review_date (timestamp)
├── reply_text (text, nullable — the auto-response or manual reply)
├── reply_date (nullable timestamp)
├── sentiment (positive, neutral, negative — AI-classified)
├── sentiment_tags (text[], nullable — e.g., ["food_quality", "service_speed", "cleanliness"])
├── created_at
└── updated_at

GMBSentimentReport (AI-generated monthly reports)
├── id (UUID, PK)
├── gmb_location_id (FK → GMBLocation)
├── client_id (FK → Client)
├── report_month (integer 1-12)
├── report_year (integer)
├── total_reviews (integer)
├── avg_rating (decimal)
├── sentiment_breakdown (JSONB — {"positive": 12, "neutral": 3, "negative": 2})
├── top_themes (JSONB — [{"theme": "food_quality", "count": 8, "avg_sentiment": 0.85}])
├── ai_summary (text — narrative analysis)
├── ai_recommendations (text — suggestions for improvement)
├── share_token (UUID, nullable — for client sharing)
├── share_enabled (boolean, default false)
├── created_at
└── updated_at
```

### Client Reports

```
ClientReport (auto-generated or manual monthly reports)
├── id (UUID, PK)
├── client_id (FK → Client)
├── report_type (monthly_summary, sentiment, analytics, custom)
├── report_month (integer 1-12)
├── report_year (integer)
├── title (e.g., "BCA Mechanical — March 2026 Report")
├── content_html (text — rendered report)
├── content_data (JSONB — structured data behind the report)
├── sections_included (text[] — e.g., ["maintenance", "analytics", "social", "content", "reviews"])
├── ai_generated (boolean, default true)
├── share_token (UUID, nullable)
├── share_enabled (boolean, default false)
├── share_expires_at (nullable timestamp)
├── status (draft, ready, shared, archived)
├── created_at
└── updated_at
```

### Recurring Maintenance Schedules

```
MaintenanceSchedule (recurring WP maintenance tasks)
├── id (UUID, PK)
├── wordpress_site_id (FK → WordPressSite, nullable — null for "all sites")
├── title (e.g., "Monthly Plugin Updates", "Weekly Security Scan")
├── description (nullable)
├── frequency (weekly, biweekly, monthly, quarterly)
├── day_of_week (nullable integer 0-6 — for weekly)
├── day_of_month (nullable integer 1-28 — for monthly)
├── maintenance_type (plugin_update, theme_update, core_update, security_scan, backup, full_checkup)
├── auto_create_task (boolean, default true — auto-generates a Task when due)
├── is_active (boolean)
├── last_run_at (nullable timestamp)
├── next_run_at (nullable timestamp)
├── created_at
└── updated_at

MaintenanceScheduleLog
├── id (UUID, PK)
├── maintenance_schedule_id (FK → MaintenanceSchedule)
├── wordpress_site_id (FK → WordPressSite)
├── status (completed, skipped, failed, overdue)
├── task_id (FK → Task, nullable — the auto-generated task)
├── maintenance_log_id (FK → MaintenanceLog, nullable — linked when completed)
├── due_date (date)
├── completed_at (nullable timestamp)
├── notes (nullable)
├── created_at
└── updated_at
```

### Activity Feed

```
ActivityEntry (unified cross-domain activity log)
├── id (UUID, PK)
├── domain (life, mlc, product)
├── domain_ref_id (nullable — client_id, product_id)
├── module (health, fitness, diet, projects, wordpress, communication, analytics, social, gce, financial, content_calendar, etc.)
├── activity_type (created, updated, completed, sent, published, synced, logged, generated, approved, dismissed)
├── title (short description — e.g., "Updated BCA plugins", "Logged lunch", "Completed garage drywall Phase 2")
├── description (nullable — more detail)
├── ref_type (nullable — "task", "email", "maintenance_log", "meal_log", "content_calendar_entry", etc.)
├── ref_id (nullable UUID — FK to the specific record)
├── created_at
└── (no updated_at — activity entries are immutable)
```

### Goal Tracking

```
Goal
├── id (UUID, PK)
├── domain (life, mlc, product)
├── category (health, fitness, financial, business, project, learning, custom)
├── title (e.g., "Hit 185 lbs", "Save $10K", "Complete garage drywall")
├── description (nullable)
├── goal_type (target_value, target_date, habit, milestone)
├── metric_source (nullable — ties to existing data: "health_metric:weight", "financial:net_worth", "project:completion", etc.)
├── target_value (nullable decimal — for measurable goals)
├── target_unit (nullable — "lbs", "$", "%", etc.)
├── current_value (nullable decimal — auto-updated from source or manual)
├── target_date (nullable date)
├── status (active, on_track, at_risk, behind, completed, abandoned)
├── progress_pct (nullable decimal — computed or AI-estimated)
├── check_in_frequency (daily, weekly, monthly, none)
├── last_check_in (nullable timestamp)
├── ai_assessment (text, nullable — latest AI analysis of progress)
├── created_at
└── updated_at

GoalCheckIn (periodic progress entries)
├── id (UUID, PK)
├── goal_id (FK → Goal)
├── value (nullable decimal — measured value at check-in)
├── notes (text, nullable)
├── ai_feedback (text, nullable — AI response to progress)
├── recorded_at (timestamp)
├── created_at
└── updated_at
```

### Data Export & Backup

```
DataExport (scheduled or on-demand backups)
├── id (UUID, PK)
├── export_type (full, domain, module)
├── scope (nullable — specific domain or module name)
├── format (json, csv)
├── file_url (Supabase Storage URL)
├── file_size_bytes (nullable integer)
├── status (queued, in_progress, completed, failed)
├── triggered_by (scheduled, manual)
├── started_at (nullable timestamp)
├── completed_at (nullable timestamp)
├── error_message (nullable)
├── created_at
└── updated_at

DataExportSchedule
├── id (UUID, PK)
├── frequency (weekly, monthly)
├── day_of_week (nullable integer 0-6)
├── export_type (full, domain, module)
├── scope (nullable)
├── format (json, csv)
├── retain_count (integer — how many backups to keep, default 4)
├── is_active (boolean)
├── last_run_at (nullable timestamp)
├── next_run_at (nullable timestamp)
├── created_at
└── updated_at
```

### Client Onboarding

```
OnboardingTemplate
├── id (UUID, PK)
├── name (e.g., "New WordPress Client", "Social Media Only Client", "Full Service Client")
├── description (nullable)
├── steps (JSONB — ordered list of onboarding actions: [
│   {"action": "create_workspace", "config": {}},
│   {"action": "enable_service", "service_type": "wordpress", "config": {}},
│   {"action": "enable_service", "service_type": "ga4", "config": {}},
│   {"action": "enable_service", "service_type": "social_meta", "config": {}},
│   {"action": "enable_service", "service_type": "content_calendar", "config": {}},
│   {"action": "install_wp_plugin", "config": {}},
│   {"action": "connect_ga4", "config": {}},
│   {"action": "create_content_calendar", "config": {"type": "social", "months_ahead": 1}},
│   {"action": "create_project", "config": {"name": "Website Launch", "project_type": "development"}},
│   {"action": "create_tasks", "config": {"tasks": ["Install WP plugin", "Configure GA4", "Set up social accounts"]}},
│   {"action": "send_welcome_email", "config": {}}
│ ])
├── is_default (boolean, default false)
├── created_at
└── updated_at

OnboardingRun (log of each time a template is executed)
├── id (UUID, PK)
├── template_id (FK → OnboardingTemplate)
├── client_id (FK → Client)
├── status (in_progress, completed, failed)
├── steps_completed (JSONB — tracks which steps succeeded/failed)
├── started_at (timestamp)
├── completed_at (nullable timestamp)
├── created_at
└── updated_at
```

### Automations / Rules

```
AutomationRule
├── id (UUID, PK)
├── name (e.g., "Flag overdue core updates", "Alert on draft content past schedule date")
├── description (nullable)
├── trigger_type (schedule, event, condition)
├── trigger_config (JSONB — {
│   schedule: "0 9 * * 1" (cron), or
│   event: "maintenance_schedule_overdue", or
│   condition: {"table": "content_calendar_entry", "field": "status", "operator": "eq", "value": "draft", "when": "scheduled_date_passed"}
│ })
├── action_type (create_task, send_sms, send_notification, flag_record, create_activity, draft_email)
├── action_config (JSONB — parameters for the action)
├── is_active (boolean)
├── last_triggered_at (nullable timestamp)
├── trigger_count (integer, default 0)
├── created_at
└── updated_at

AutomationLog
├── id (UUID, PK)
├── rule_id (FK → AutomationRule)
├── triggered_at (timestamp)
├── trigger_data (JSONB — what condition/event fired)
├── action_result (JSONB — what happened)
├── status (success, failed)
├── error_message (nullable)
├── created_at
└── updated_at
```

### Custom Trackers (Flexible "Odds & Ends" System)

```
CustomTracker (user-defined trackable things)
├── id (UUID, PK)
├── name (e.g., "Contact Lenses", "Estimated Tax Payments", "Oil Changes", "Haircuts")
├── description (nullable)
├── category (health, financial, home, vehicle, personal, business, custom)
├── icon (nullable — emoji or icon name for dashboard display)
├── tracker_type (recurring, value_log, checklist, countdown)
│   ├── recurring: repeats on a schedule (contacts every 30 days, oil change every 5000 miles)
│   ├── value_log: track a value over time (blood pressure, tire tread depth)
│   ├── checklist: one-off or periodic list of items (annual tax prep steps)
│   └── countdown: tracking toward a specific date (passport expiration, license renewal)
├── recurrence_config (JSONB, nullable — for recurring type: {
│   "frequency": "days" | "weeks" | "months" | "miles" | "custom",
│   "interval": 30,
│   "unit_label": "days" (for display)
│ })
├── reminder_enabled (boolean, default true)
├── reminder_method (notification, sms, both)
├── reminder_advance_days (integer, default 1 — remind N days before due)
├── last_completed_at (nullable timestamp)
├── next_due_at (nullable timestamp — auto-calculated from recurrence_config + last_completed_at)
├── status (active, paused, archived)
├── metadata (JSONB, nullable — flexible extra fields: {"current_mileage": 45000, "brand": "Acuvue Oasys"})
├── linked_goal_id (FK → Goal, nullable — optionally tie to a goal)
├── sort_order (integer — for dashboard display order)
├── created_at
└── updated_at

CustomTrackerEntry (individual log entries / completions)
├── id (UUID, PK)
├── tracker_id (FK → CustomTracker)
├── entry_type (completed, logged, skipped, noted)
├── value (nullable decimal — for value_log type: 120/80, 4.5mm, $1,200)
├── value_unit (nullable — "mmHg", "mm", "$", etc.)
├── notes (text, nullable)
├── cost (nullable decimal — what it cost this time: $180 for contacts, $45 for oil change)
├── performed_at (timestamp — when the action happened)
├── next_due_at (nullable timestamp — override auto-calculated next due)
├── created_at
└── updated_at
```

### AI System
├── id (UUID, PK)
├── context_domain (global, life, mlc, product)
├── context_ref_id (nullable — client_id, product_id, etc.)
├── context_module (nullable — health, fitness, projects, etc.)
├── title (nullable — auto-generated or user-set)
├── created_at
└── updated_at

AIMessage
├── id (UUID, PK)
├── conversation_id (FK → AIConversation)
├── role (user, assistant, system)
├── content (text)
├── context_data (JSONB, nullable — what data was loaded for this message)
├── tokens_used (nullable integer)
├── created_at
└── updated_at

AIInsight (proactive, background-generated)
├── id (UUID, PK)
├── insight_type (anomaly, trend, recommendation, alert, weekly_rollup, page_load)
├── domain (health, fitness, financial, projects, social, cross_domain)
├── title
├── content (text)
├── data_references (JSONB — what data points generated this insight)
├── severity (info, notable, important, urgent)
├── is_read (boolean, default false)
├── is_dismissed (boolean, default false)
├── triggered_by (background_job, page_load, user_query)
├── page_context (nullable — which page triggered this insight)
├── created_at
└── updated_at

AIActionLog (when AI performs actions, not just analysis)
├── id (UUID, PK)
├── action_type (draft_email, clean_event, adjust_schedule, generate_newsletter, build_workout, build_meal_plan, generate_content_idea, generate_project_plan, generate_phase_guidance, calculate_materials, generate_recipe, process_meeting_notes, execute_note_action)
├── description
├── input_context (JSONB)
├── output_result (JSONB)
├── status (completed, failed, pending_review)
├── project_id (FK → Project, nullable — links action to specific project)
├── created_at
└── updated_at
```

---

## 7. Feature Modules — Detailed

### Module 1: Health Tracking

**Purpose:** Centralized health data — metrics, blood work, illness history, family history, Oura data.

**Key Features:**
- Log health metrics manually (weight, BP, body fat, etc.)
- Upload/log blood test results with reference ranges and flags
- Track illnesses with symptoms, duration, severity, treatment
- Store family health history for reference (and AI pattern matching)
- Auto-sync Oura data on schedule (sleep, readiness, activity, HRV)
- Dashboard view: trend charts for key metrics, Oura readiness at a glance, recent blood work flags

**Page-Load AI:** When navigating to the Health page, Claude automatically analyzes recent data and displays insights at the top — sleep trends, metric changes, correlations with fitness/diet.

**AI Integration:**
- Correlate Oura data with illness onset ("You typically see a readiness drop 2 days before getting sick")
- Flag blood markers that are trending in a concerning direction
- Compare metrics against family history for proactive alerts

---

### Module 2: Fitness (with AI Workout Builder)

**Purpose:** Workout logging, trend analysis, wearable data context, and AI-powered workout generation.

**Key Features:**
- Log workouts manually (type, exercises, sets, reps, weight, duration)
- Auto-sync Suunto workouts
- View workout history with filters (by type, date range, muscle group)
- Track personal records and progressions
- Integrate Oura readiness data to contextualize performance
- **AI Workout Builder:**
  - Lifting: "Build me an upper body push workout" → generates workout based on your preferences, equipment, and recent history
  - Swimming: "I want to swim 2,000 yards today with a focus on endurance" → generates structured swim workout with intervals, sets, rest periods
  - Knows your preferences (stored in WorkoutPreference table): favorite exercises, pool length, default strokes, equipment access, etc.
  - Considers recent workout history to avoid overtraining specific muscle groups

**Page-Load AI:** Fitness page loads with insights on recent training trends, recovery status from Oura, and suggestions.

**AI Integration:**
- Trend analysis ("Your bench press has plateaued for 3 weeks — consider deload week")
- Recovery recommendations based on Oura readiness + recent workout load
- Identify correlations between sleep/nutrition and workout performance
- Progressive overload suggestions

---

### Module 3: Diet, Meal Planning & Calorie AI (Replaces Mealime)

**Purpose:** Photo-based calorie estimation, recipe management, meal planning, and shopping lists.

**Key Features:**
- Full recipe database with ingredients, macros, prep/cook times
- **AI Recipe Builder:** "Build me a high-protein dinner with chicken and rice" → generates full recipe with ingredients, instructions, macros
- Meal logging with date, meal type, recipe selection, servings
- Photo upload with recipe context → Claude Vision estimates portions/calories
- Daily/weekly macro summaries
- **Meal Planner:**
  - Create weekly meal plans (manual or AI-generated)
  - AI considers: calorie targets, macro goals, existing recipes, preferences, variety
  - "Plan my meals for next week, high protein, under 2200 calories/day"
- **Shopping List Generator:**
  - Auto-generate from meal plan — aggregates all ingredients across all planned recipes
  - Organized by aisle for in-store efficiency
  - Check off items as you shop
  - Standalone shopping lists also supported

**Page-Load AI:** Diet page shows today's nutrition status, macro progress, and any flags.

**AI Integration:**
- Photo + recipe → portion estimation → calorie/macro calculation
- "You've been under on protein 4 of the last 7 days"
- Recipe suggestions based on nutritional gaps
- Meal plan generation based on goals and preferences
- Smart shopping list deduplication and quantity aggregation

---

### Module 4: Financial (Personal + Business via QBO)

**Purpose:** Track net worth, monitor spending by category, and view business financials.

**Key Features:**
- Monthly (or custom frequency) net worth snapshots
- Add assets by category (cash, investments, retirement, property, vehicles)
- Add liabilities by category (mortgage, auto, student loans, credit cards)
- Net worth trend chart over time
- Asset allocation breakdown
- **QBO Integration (Personal):**
  - Spending by category over time (groceries, dining, utilities, subscriptions, etc.)
  - Income tracking
  - Month-over-month spending comparison
  - Budget vs actual by category
- **QBO Integration (Business/MLC):**
  - Revenue and expenses
  - P&L overview
  - Client-related spending
  - Tax category tracking

**Page-Load AI:** Financial page shows spending trends, budget alerts, and net worth trajectory insights.

**AI Integration:**
- "Your dining out spending increased 40% this month"
- "Net worth grew 3.2% this quarter, primarily driven by investment gains"
- "Business expenses in Software category are up — review subscriptions"
- Track progress toward financial goals if defined

---

### Module 5: Project Tracker + AI Project Manager (Replaces ClickUp)

**Purpose:** Personal and work project/task management with Claude as an active project manager that can plan, guide, and teach.

**Key Features:**
- Create projects under any domain (Life, MLC, specific client, specific product)
- **Project types:** general, construction, development, business, creative, learning — each type gets contextually relevant AI behavior
- Kanban or list view for tasks within a project
- Task priorities, due dates, status tracking, task dependencies
- Standalone tasks (not tied to a project) for quick to-dos
- Notes system with markdown support, pinning, organization by domain
- **Note types:** general, meeting notes, reference, checklist
- **Meeting notes → action pipeline:** Save meeting notes and Claude automatically detects action items (tasks, content calendar entries, emails, reminders) and suggests them for one-click execution
- **ClickUp import support** — one-time migration of existing notes

**AI Project Manager (Core Feature):**
When creating or managing any project, Claude can be activated as the project manager. This means:

- **Project Planning:** Tell Claude what you want to do ("I want to drywall my garage" or "I want to build a SaaS product"). Claude interviews you about scope, budget, timeline, experience level, then generates a complete project plan with phases, tasks, dependencies, materials, tools, and estimated costs.
- **Phase-by-Phase Guidance:** Each phase includes AI-generated step-by-step instructions tailored to your skill level. For construction: "Here's how to measure and cut drywall for the east wall. Common first-timer mistakes to avoid: ..."
- **Proactive Tips & Safety:** Before you start a phase, Claude surfaces what you need to know — safety considerations, common pitfalls, when to call a professional ("This phase involves electrical work in the junction box — strongly recommend hiring a licensed electrician for this step").
- **Materials & Tools Lists:** AI generates what you need for each phase, with estimated quantities based on your measurements, cost estimates, and where to buy.
- **Contextual Q&A:** While working on a phase, ask Claude anything. It knows your project, your current phase, your measurements, and what you've completed. "The drywall isn't sitting flush in the corner — what do I do?"
- **Progress Tracking:** Mark phases and tasks complete. Claude adjusts remaining estimates and surfaces what's next.
- **Budget Tracking:** Track estimated vs actual costs per material, per phase, and project-wide.
- **Photo Documentation:** Before/during/after photos per phase for reference and progress tracking.

**Construction Project Enhancements:**
- Measurement storage (room dimensions, wall areas, ceiling heights)
- Materials calculator (AI estimates quantities from measurements — "For 480 sq ft of wall, you'll need approximately 15 sheets of 4x8 drywall")
- Contractor tracking if bringing in help
- Phase dependencies enforced (can't start mudding until drywall is hung)
- Permit awareness ("Check if your municipality requires a permit for this scope of work")

**Applies to ALL Project Types:**
- **Development:** "I want to build a React Native app" → phases: planning, setup, core features, testing, deployment. Claude walks through each.
- **Business:** "I want to launch a new service offering" → phases: research, pricing, marketing materials, outreach. Claude guides strategy.
- **Learning:** "I want to learn woodworking" → structured learning plan with progressive projects.
- **Creative:** "I want to redesign my brand identity" → phases: mood board, concepts, refinement, asset creation.

**AI Integration:**
- "You have 3 overdue tasks across 2 clients"
- Smart prioritization suggestions based on deadlines and workload
- Restructure your day when you say "I'm feeling bad"
- Google Calendar integration for schedule-aware task management
- **Project planning and phase generation**
- **Step-by-step guidance within each phase**
- **Materials/tools estimation from measurements**
- **Safety and professional-referral flags**
- **Contextual Q&A that knows your full project state**
- **Meeting notes processing** — detects action items, suggests tasks/calendar entries/emails/content, executes on approval

---

### Module 6: Plant Care

**Purpose:** Never forget to water a plant again.

**Key Features:**
- Plant catalog with species, location, watering frequency, sunlight needs
- Automatic next-water-date calculation
- Dashboard widget showing which plants need water today/this week
- Watering log
- Mark plants as inactive (RIP 🪦)

**AI Integration:**
- Seasonal watering adjustments ("It's winter — your fern may need less frequent watering")
- Twilio reminder option: text yourself when plants need water

---

### Module 7: Home Projects

**Purpose:** Track lawn care plans, home maintenance, and renovation/construction projects — with Claude as project manager for complex builds.

**Two Tiers:**

**Simple/Recurring (HomeProject table):**
- Lawn care schedules, gutter cleaning, HVAC filter changes, seasonal maintenance
- Task breakdown per project
- Dedicated lawn care schedule (month-by-month activities, products, completion tracking)
- Maintenance reminders
- Recurrence support (annual, seasonal, monthly)

**Construction/Renovation (Full Project system with AI PM):**
- Garage drywall, kitchen remodel, bathroom renovation, deck build, etc.
- Created as a Project with `project_type: "construction"` — triggers full AI project manager experience
- Claude generates phased plans, materials lists, tool requirements, step-by-step guidance
- Measurements stored and used for materials calculations
- Before/during/after photo documentation per phase
- Budget tracking at phase and project level
- Contractor management if needed
- See **Module 5: AI Project Manager** for full capabilities

**Page-Load AI:** Home Projects page shows upcoming maintenance tasks, active construction project status, and seasonal recommendations.

**AI Integration:**
- Lawn care recommendations based on season/region
- Budget tracking insights
- Twilio reminders for seasonal tasks
- **Full AI project management for construction projects** (see Module 5)
- "Your garage drywall project is in the 'Mud & Tape' phase. Before you start today, make sure your first coat of compound is fully dry (typically 24 hours). Here's what you'll need for today's session..."

---

### Module 8: WordPress Site Manager

**Purpose:** Manage client WordPress sites from the dashboard.

**Key Features:**
- Register client sites with API endpoint (custom plugin on each site)
- View site health: WP version, PHP version, plugin list, update availability
- Trigger plugin/theme/core updates remotely
- View update results and any errors
- Maintenance log per site

**Custom Client Plugin (to be built):**
- Lightweight WordPress plugin installed on each client site
- Exposes authenticated REST endpoints for:
  - `GET /site-health` — versions, plugin list, disk space, etc.
  - `POST /update-plugins` — trigger all or specific plugin updates
  - `POST /update-theme` — trigger theme update
  - `POST /update-core` — trigger WP core update
  - `GET /update-status` — check results of last update run
- Auth: shared secret / API key stored in wp-config.php, validated on every request
- Minimal footprint — no admin UI needed on the client site

---

### Module 9: Client Communication Hub

**Purpose:** AI-drafted, human-reviewed client emails and SMS.

**Key Features:**
- After logging maintenance, click "Draft Email" → AI generates professional email summarizing work done, addressed to client by first name
- AI varies tone and phrasing each time (no canned feel)
- Review in dashboard, edit if needed, hit send via Gmail
- Email history per client
- **Twilio SMS:** Quick text updates to clients ("Hey [Name], just finished updating plugins on your site. Everything looks good!")
- SMS templates with personalization
- SMS history per client

**AI Integration:**
- Core feature: Claude drafts emails using maintenance log context + client contact info
- Learns your communication style over time (via example emails)
- Can draft other client communications beyond maintenance (project updates, etc.)

---

### Module 10: GetShelfed Admin

**Purpose:** Manage the daily book guessing game from the dashboard.

**Key Features:**
- View scheduled games (upcoming queue)
- Schedule new games (select book from Big Book API, set date)
- Edit/reorder upcoming schedule
- View game stats (participation, solve rates)

**Integration:** Direct database or API access to Shelf's backend.

---

### Module 11: ManlyMan Integration (Stubbed)

**Purpose:** Placeholder for future ManlyMan.men management.

**Potential Features (TBD):**
- Content scheduling
- Analytics dashboard
- Content pipeline management

---

### Module 12: MLC Website Integration

**Purpose:** Monitor quest game and AI sharing stats.

**Key Features:**
- View quest game engagement (completions, active players, progression)
- AI sharing stats dashboard
- Read-only initially, deeper control added later

---

### Module 13: GA4 Analytics Dashboard

**Purpose:** Clean, readable analytics for all connected sites — no more navigating GA4.

**Key Features:**
- Connect multiple GA4 properties (client sites + own sites + products)
- Per-site dashboard: pageviews, sessions, users, bounce rate, top pages, traffic sources
- Date range selection
- Comparison views (this month vs last month, YoY)
- Combined overview across all sites

**Page-Load AI:** Per-site analytics page loads with AI summary of notable changes and trends.

**AI Integration:**
- "BCA's traffic dropped 18% this month — primarily from organic search. Check if recent plugin updates affected SEO."
- Weekly traffic summaries

---

### Module 14: Social Media Analytics (Meta) + Content Ideation

**Purpose:** Facebook and Instagram post performance per client, with AI-generated content ideas informed by client voice.

**Key Features:**
- Connect client FB pages and IG business accounts (one-time OAuth)
- Post-level metrics: reach, impressions, engagement, likes, comments, shares
- **Post timing data** — track what time and day each post went live
- Best-performing content identification
- Posting frequency analysis
- **AI Content Ideation:**
  - Analyzes what content performs best (format, topic, timing)
  - Generates content ideas based on performance patterns
  - **Uses client voice profile** to generate copy that sounds like the client's brand, not generic AI
  - Suggests optimal posting times per client based on historical engagement
  - "Papa Boo's Instagram reels posted on Thursday at 6pm get 3x more engagement than Tuesday morning static posts"
  - Content ideas stored and tracked (new → saved → used → dismissed)
  - Ideas feed directly into **Content Calendars** (Module 22)

**Page-Load AI:** Social page loads with performance highlights and fresh content ideas.

**AI Integration:**
- Performance-driven content recommendations
- Optimal posting schedule suggestions
- Trend identification across clients
- **Brand-voice-aware content generation** — each client has a voice profile that Claude uses

---

### Module 15: Sendy Campaign Metrics + Email Content Ideation

**Purpose:** Email campaign performance and AI-powered email content planning per client.

**Key Features:**
- Pull campaign stats: sends, opens, clicks, bounces, unsubscribes
- Campaign history per brand/client
- Open rate and click rate trends
- **Email Content Ideation:**
  - AI generates email campaign ideas based on past performance (what subject lines get opens, what CTAs get clicks)
  - **Uses client voice profile** for brand-consistent email copy
  - Plans feed into **Content Calendars** (Module 22) and **Email Content Plans**
  - "BCA's emails with question-style subject lines have 40% higher open rates — here are 5 subject line ideas for March"

**AI Integration:**
- "GCE newsletter open rates have declined 5% over 4 weeks — consider A/B testing subject lines"
- Email campaign ideation based on engagement patterns
- Subject line and content suggestions in client voice
- Optimal send time recommendations

---

### Module 16: Client Workspaces

**Purpose:** Per-client workspace combining notes, projects, and all connected services.

**Key Features:**
- Client overview page showing all active services and **contact information**
- **Client voice profile** — define tone, vocabulary, example content for AI to match per client
- Notes section (markdown, pinnable)
- Project/task board
- Maintenance history
- **Content calendar** (if social/email services active)
- GA4 widget (if connected)
- Social metrics widget (if connected)
- Sendy campaigns widget (if connected)
- Quick actions: "Draft maintenance email", "Text client", "Log maintenance", "Generate content ideas"
- **Client sharing** — generate secure read-only links to share content calendars, project status, or reports with clients

---

### Module 17: GCE Event Scraper

**Purpose:** Automatically pull event data from configured source websites.

**Key Features:**
- Configure scrape sources with URL and parsing rules
- Run scrapes on schedule or on demand
- Events land in staging area for review
- **Scrape featured images** where available

**AI Integration:**
- Auto-clean scraped data (normalize dates, fix formatting, categorize)
- Flag potential duplicates
- Extract structured data from messy source pages

---

### Module 18: GCE Event Manager

**Purpose:** Review, edit, and publish events to Grove City Events site.

**Key Features:**
- Staging view of scraped events (pending review, approved, rejected)
- Edit event details before publishing
- **Upload or assign featured image** per event
- Bulk approve/reject
- **Publish to The Events Calendar via REST API — including featured image**
- Manual event creation for events not scraped
- Duplicate detection

---

### Module 19: GCE Newsletter Builder

**Purpose:** Build the weekly GCE newsletter and send via Sendy.

**Key Features:**
- Hit button → pull next week's published events from GCE
- Events populate a database/table view (replaces Airtable workflow)
- Drag to reorder, mark as featured, add custom descriptions
- **Delete events from the email** (toggle is_included to false)
- **Manually add events** that weren't auto-pulled (set manually_added flag)
- Generate newsletter HTML from template
- Preview newsletter
- Push to Sendy for sending — no Zapier needed

**AI Integration:**
- Auto-generate event blurbs for newsletter
- Suggest featured events based on engagement history
- Write newsletter intro copy

---

### Module 20: Dashboard Homepage

**Purpose:** The first thing you see after login. High-level snapshot across everything.

**Key Widgets (configurable):**
- Today's Oura readiness/sleep score
- Tasks due today / overdue count
- Google Calendar — today's schedule at a glance
- **Active goals** — progress bars for top goals, on-track/at-risk indicators
- Plants needing water
- Recent AI insights/alerts
- **Overdue maintenance** — any WP sites past their scheduled maintenance
- Quick stats: GA4 traffic summary, recent campaign performance
- **Recent review activity** — new Google reviews across clients, sentiment flags
- Upcoming GCE newsletter status
- Active project count by domain
- Today's meal log status / macro progress
- Net worth trend mini-chart
- Recent spending alerts
- **Automation activity** — recent rule triggers
- **Custom trackers** — overdue and upcoming items (contacts due in 3 days, oil change overdue)
- Quick actions: log meal, add task, draft email, run site updates, text client

**Page-Load AI:** Dashboard home generates a daily briefing on load — a quick "here's what matters today" summary.

---

### Module 21: Demo Mode & Architecture Showcase (Future)

**Purpose:** Showcase the platform without exposing any real data. Doubles as a technical portfolio piece.

**Key Features:**
- **Demo login** — accessible via exitframe.org/demo or a toggle on the login screen
- **Synthetic data** — pre-generated realistic fake data across all modules (clients, health, fitness, meals, projects, analytics, GCE pipeline). Feels real, reveals nothing.
- **Full functionality** — every module works in demo mode. AI chat responds using demo context. Dashboards populate with demo data. Workflows are interactive.
- **Architecture breakdown page** — deep dive into how the system is built:
  - Interactive system diagram (modules, connections, data flow)
  - Tech stack with rationale for each choice
  - API integration map (all external services)
  - AI architecture explanation (context loading, interaction modes, background jobs)
  - Security model overview
  - Database schema visualization
- **Guided tour** — optional walkthrough highlighting key features
- **Demo watermark** — subtle indicator throughout that this is synthetic data
- **No auth required** — demo mode is read-only with no ability to modify production data

**Not Built Until:** Way late in development (Phase 12). Everything else ships first.

---

### Module 22: Content Calendars & Client Sharing (Replaces Trello)

**Purpose:** Plan, organize, and share content schedules for social media and email clients. Trello-style board/calendar view with AI content generation in each client's brand voice.

**Key Features:**

**Content Calendar:**
- Create monthly content calendars per client (social, email, or mixed)
- **Calendar view** — visual month view showing scheduled content by date
- **Board view** — Trello-style columns (Idea → Draft → Ready → Scheduled → Published)
- Entries include: platform, content type, copy/caption, hashtags, image notes, scheduled date/time
- Drag and drop to rearrange or reschedule
- Status tracking per entry (idea → draft → ready → scheduled → published → skipped)
- Link content ideas from Module 14 (social ideation) and Module 15 (email ideation) directly into calendar entries

**AI Content Generation:**
- **Client voice profiles** — each client has a defined tone, vocabulary, example content, target audience, and brand guidelines
- "Generate 8 Instagram post ideas for Papa Boo's for March" → Claude generates ideas in Papa Boo's voice, informed by what content performs best
- "Write the caption for this carousel post about our spring menu" → Claude writes copy that sounds like the client, not like AI
- AI can populate an entire month's calendar draft from a few prompts
- Email campaign content drafted in client voice with subject lines, preview text, and body

**Client Sharing:**
- **Generate a secure share link** for any content calendar → client can view (read-only) at a unique URL like exitframe.org/share/{token}
- Client sees a clean, branded view of their content calendar — no dashboard chrome, no other client data
- **Client can approve entries** — simple approve/flag mechanism on shared view (tracked via `client_approved` field)
- Share links can be:
  - Password-protected (optional)
  - Time-limited (expiration date)
  - Revoked at any time
  - Tracked (last accessed, access count)
- **Also shareable:** Project status views, custom reports — anything you want a client to see without giving them dashboard access

**Email Content Planning:**
- For Sendy/email clients, plan campaigns alongside social content
- AI drafts campaign content in client voice
- Subject line A/B suggestions based on past open rate data
- Planned campaigns can be pushed to Sendy when ready

**Page-Load AI:** Content calendar page loads with suggestions for gaps in the schedule, upcoming deadlines, and performance-informed ideas.

**AI Integration:**
- Brand-voice-aware content generation across all content types
- Auto-fill calendar gaps with AI-generated ideas
- Performance-based recommendations (format, timing, topic)
- "You have 3 clients with no content planned past next week"
- Cross-client pattern recognition ("Carousel posts are outperforming across all your restaurant clients")

---

### Module 23: Passive Time Tracking & Client Profitability

**Purpose:** Automatically track time spent per client/module without any manual input. Surface profitability insights.

**Key Features:**
- **100% hands-off** — time is tracked by monitoring which module/client workspace you're active in. No timers, no start/stop, no logging.
- Idle detection — stops counting after inactivity threshold (e.g., 5 minutes)
- Auto-generates time entries with activity descriptions ("Editing BCA content calendar — 22 min", "Reviewing Defense Link GA4 — 8 min")
- Per-client time summaries (daily, weekly, monthly)
- **Client profitability view** — compare hours spent vs revenue per client (revenue from QBO or manual entry)
- Effective hourly rate calculation per client
- Trend tracking — are you spending more or less time on this client over time?

**AI Integration:**
- "You spent 14 hours on BCA this month vs 3 hours on Defense Link, but they're at the same rate. Worth revisiting BCA's scope?"
- Monthly profitability insights on page load
- Flags clients trending toward unprofitability

---

### Module 24: Google My Business + Review Sentiment

**Purpose:** Sync Google reviews and generate monthly sentiment reports for clients like Cristy's.

**Key Features:**
- Connect client GMB locations via Google Business Profile API
- Sync all reviews (rating, text, date, replies)
- **AI sentiment classification** — each review tagged as positive/neutral/negative with theme tags (food quality, service speed, cleanliness, atmosphere, etc.)
- **Monthly sentiment reports** — auto-generated narrative analysis:
  - Total reviews, average rating, sentiment breakdown
  - Top themes (what people love, what they complain about)
  - Trends vs previous months
  - AI recommendations ("Negative reviews mentioning wait times increased 40% — consider addressing staffing during Friday dinner rush")
- **Shareable via client link** — same secure sharing system as content calendars
- Review response tracking (ties into existing Zap auto-responses)

**Page-Load AI:** Client's GMB section shows latest review summary and any concerning trends.

**AI Integration:**
- Monthly sentiment report generation
- Theme extraction and trend analysis
- Recommendations based on review patterns
- Alerts for negative review spikes

---

### Module 25: Client Reports (Auto-Generated)

**Purpose:** One-click monthly reports per client pulling data from all connected services.

**Key Features:**
- **AI auto-generates monthly client reports** combining:
  - Maintenance performed (from WP site manager)
  - Analytics highlights (from GA4 — traffic, top pages, trends)
  - Social media performance (from Meta — engagement, reach, best posts)
  - Content published (from content calendar)
  - Email campaign results (from Sendy)
  - Review sentiment summary (from GMB, if connected)
  - Time spent on client (from passive tracking)
- Reports rendered as clean HTML — professional and readable
- **Configurable sections** — toggle which sections to include per client
- **Shareable via secure link** — clients see a polished report, not your dashboard
- Report history — archive of all past reports per client
- **Bulk generation** — "Generate all client reports for February" in one action

**AI Integration:**
- Pulls data from all connected services and writes a narrative summary
- Highlights wins, flags concerns, suggests next steps
- Reports written in a professional but personable tone
- "BCA's organic traffic is up 12% this month, largely driven by the new service pages we launched. Plugin updates were completed on schedule with no issues."

---

### Module 26: Recurring Maintenance Schedules

**Purpose:** Automate WP maintenance workflows so nothing falls through the cracks.

**Key Features:**
- Create recurring schedules per site or across all sites (e.g., "Monthly plugin updates for all client sites")
- Frequency options: weekly, biweekly, monthly, quarterly
- When a schedule comes due, auto-creates a Task in the project tracker
- Track completion per site per schedule cycle
- Flag overdue maintenance
- Ties into existing MaintenanceLog when work is completed

**AI Integration:**
- "BCA hasn't had a plugin update in 6 weeks — last scheduled run was skipped"
- Auto-generates maintenance summary for client reports
- Suggests schedule adjustments based on update frequency patterns

---

### Module 27: Global Activity Feed

**Purpose:** Unified "what happened" view across every domain and module.

**Key Features:**
- Chronological feed of all activity: tasks completed, emails sent, content published, maintenance performed, meals logged, workouts tracked, events scraped, reviews synced, etc.
- **Filter by domain** (Life, MLC, specific client, specific product)
- **Filter by module** (WordPress, content, analytics, health, etc.)
- **Filter by activity type** (created, completed, sent, published, etc.)
- **Search** the feed
- Date range selection
- Quick reference links — click any entry to jump to the source record
- Different from the dashboard homepage (which is widgets/summary) — this is a detailed log

**AI Integration:**
- Daily/weekly activity summaries on request
- "What did I do for BCA this month?" → AI filters and summarizes
- Cross-domain pattern detection from activity data

---

### Module 28: Goal Tracking

**Purpose:** Set goals tied to real data, track progress, get AI coaching.

**Key Features:**
- Create goals in any domain: health, fitness, financial, business, project, learning, custom
- **Goal types:**
  - **Target value** — "Hit 185 lbs" (auto-tracked from health metrics)
  - **Target date** — "Complete garage drywall by March 15" (linked to project)
  - **Habit** — "Log meals every day" (tracked from activity)
  - **Milestone** — "Land 2 new clients this quarter" (manual tracking)
- **Auto-link to existing data** — weight goals pull from health metrics, financial goals pull from QBO/net worth, project goals pull from project completion status
- Progress percentage computed automatically where possible
- **Check-ins** — periodic progress entries with AI feedback
- Visual progress tracking (progress bars, trend lines)
- Status indicators: on track, at risk, behind, completed
- Dashboard widget showing active goals at a glance

**AI Integration:**
- "You're 3 lbs from your weight goal with 6 weeks to go — you're ahead of pace"
- "Your savings goal is at risk — spending was $800 over budget last month"
- Goal suggestions based on patterns: "You've been consistently swimming 3x/week. Want to set a distance goal?"
- Weekly goal progress in cross-domain rollup
- Connects to fitness (Oura readiness), health, financial, and project data for holistic assessment

---

### Module 29: Data Export & Backup

**Purpose:** Protect the investment. Regular automated backups of all dashboard data.

**Key Features:**
- **Scheduled full exports** — weekly or monthly, configurable
- Export as JSON (preserves structure) or CSV (human-readable)
- Stored in Supabase Storage (or optionally S3)
- **Retention policy** — keep last N backups, auto-delete older ones
- **On-demand export** — full or filtered by domain/module
- **Export history** — see all past exports, download any
- File size tracking
- Failure alerting (Twilio SMS if a scheduled export fails)

**Technical Notes:**
- BullMQ job handles the export process
- Iterates all tables, serializes to JSON/CSV
- Compresses before upload
- Not a database-level backup (that's Supabase's built-in) — this is an application-level data export you fully control and can restore from anywhere

---

### Module 30: Client Onboarding Templates

**Purpose:** Automate the repetitive setup when onboarding a new client.

**Key Features:**
- Create reusable templates (e.g., "New WordPress Client", "Social Media Only", "Full Service")
- Each template defines a sequence of onboarding steps:
  - Create client workspace
  - Enable services (WordPress, GA4, social, content calendar, GMB, etc.)
  - Install WP plugin on client site (manual step, flagged as to-do)
  - Connect GA4 property
  - Create initial content calendar
  - Create onboarding project with tasks
  - Set up recurring maintenance schedule
  - Draft welcome email
- **One-click onboarding** — select client + template → everything is scaffolded
- Track which steps completed/failed
- Customizable per run — skip steps that don't apply
- **Default template** — set one template as the starting point for all new clients

**AI Integration:**
- "New client BCA Mechanical added — suggest onboarding template: 'Full Service WordPress Client'?"
- AI can suggest template modifications based on the client's stated needs
- Auto-populates welcome email draft in client voice

---

### Module 31: Automations / Rules Engine

**Purpose:** Simple if/then rules that run without AI — lightweight triggers for common patterns.

**Key Features:**
- Create rules with a trigger → action pattern:
  - **Schedule triggers** — run on a cron (e.g., "Every Monday at 9am")
  - **Event triggers** — fire when something happens (e.g., "Maintenance schedule overdue")
  - **Condition triggers** — fire when data matches a condition (e.g., "Content calendar entry still in draft status past scheduled date")
- **Available actions:**
  - Create a task
  - Send SMS (via Twilio)
  - Send a notification in the dashboard
  - Flag a record
  - Log to activity feed
  - Draft an email
- Rule builder UI — no code, just dropdowns and fields
- Enable/disable rules
- Trigger log — see when each rule fired and what it did

**Example Rules:**
- "If any client site has a core update available for more than 7 days → create task + send me a text"
- "If a content calendar entry hits its scheduled date and status is still 'draft' → flag it and send notification"
- "If any client has no content planned for next week → send me a Monday morning notification"
- "If Oura readiness score drops below 60 → suggest lighter workout in fitness module"
- "If a plant hasn't been watered past its due date by 2 days → text me"

**Difference from AI:** These are deterministic rules, not AI intelligence. They run reliably, cheaply, and instantly. AI handles nuance and analysis; rules handle "if X then Y" logic.

---

### Module 32: Custom Trackers (The "Odds & Ends" System)

**Purpose:** A flexible, user-defined tracking system for anything that doesn't warrant its own module. This is the catch-all for the random things you want to track, get reminded about, or log over time — without needing a spec change for each one.

**The Problem It Solves:** You'll constantly think of things: "I should track when I change my contacts," "I need to remember estimated tax payments," "When was my last oil change?" Each of these is too small for a module but too important to forget. Custom Trackers gives you a single system that handles all of them.

**Tracker Types:**

1. **Recurring** — Something you do on a schedule.
   - Change contacts every 30 days
   - Oil change every 5,000 miles or 6 months
   - Replace HVAC filter every 90 days
   - Quarterly estimated tax payments
   - Annual car registration renewal
   - Rotate mattress every 3 months

2. **Value Log** — Track a value over time, see trends.
   - Blood pressure readings (not part of formal health module)
   - Tire tread depth
   - Home water heater temperature
   - Anything you want to graph

3. **Checklist** — Periodic lists of steps.
   - Annual tax prep checklist (gather W-2s, 1099s, deductions, file)
   - Seasonal home maintenance (clean gutters, winterize, etc.)
   - Vehicle inspection prep

4. **Countdown** — Tracking toward a specific date.
   - Passport expiration (June 2028)
   - Driver's license renewal
   - Domain name renewals
   - Warranty expiration dates

**Key Features:**
- **Create any tracker in seconds** — name it, pick a type, set a schedule or date, done
- **Automatic next-due calculation** — complete an entry, next due date auto-calculates
- **Reminders via notification + optional SMS** — configurable advance notice (remind me 3 days before, remind me day of)
- **Cost tracking per entry** — "Contacts cost $180 this time" → AI can tell you yearly cost
- **Metadata** — flexible extra fields per tracker (brand, mileage, etc.)
- **Link to goals** — optionally tie a tracker to a goal ("I want to reduce contact lens cost")
- **Dashboard widget** — overdue and upcoming items at a glance
- **History** — see all past entries per tracker with dates and notes
- **Categories** — health, financial, home, vehicle, personal, business, custom

**AI Integration:**
- "Your contacts are 3 days overdue"
- "You've spent $720 on oil changes this year across 4 changes — might be worth looking into synthetic oil to extend intervals"
- "Estimated tax payment due in 12 days — $1,200 based on last quarter"
- "Your passport expires in 8 months — you might want to start renewal soon, processing times are currently 6-8 weeks"
- Custom trackers feed into the cross-domain AI rollup — the AI sees the full picture of your life
- The AI can suggest new trackers based on patterns: "You've mentioned your water heater a few times — want to set up a maintenance tracker?"

**Why This Matters for Architecture:**
Custom Trackers is designed so that the system grows with you without growing the codebase. One table, one set of CRUD endpoints, one context provider. Whether you have 5 trackers or 50, the system handles it identically. When you think of something new to track next Tuesday, you just create a tracker — no development needed.

---

## 8. AI Architecture

### Core Approach: One Brain, Dynamic Context

A single Claude API integration serves all AI needs. The AI layer dynamically loads relevant context based on where the user is and what they're asking.

### Context Loading Strategy

When an AI request is made (via chat, background job, or page load):

1. **Determine scope** — is this global, domain-specific, or module-specific?
2. **Load relevant data** — pull recent records from appropriate tables
3. **Build context window** — assemble a system prompt + data payload that fits within Claude's context limits
4. **Include cross-domain data when relevant** — "I'm feeling bad" triggers health + fitness + project + calendar data loading
5. **Call Claude API** — with appropriate model (Sonnet for quick stuff/page loads, Opus for deep analysis)
6. **Process response** — parse, store insight if applicable, present to user

### Context Assembly Architecture (Deep Dive)

Claude has no memory between API calls. Every request is a blank slate. The **Context Assembler** is the middleware layer that makes Claude feel omniscient by building the right context payload for every call. This is the most important piece of infrastructure in the AI system.

#### The Seven Layers

**Layer 1: Static System Prompt (~500 tokens, never changes)**
Every Claude call starts with a base identity prompt:
- "You are the AI brain for Trey's Mosaic Life Dashboard."
- Brief system overview: personal life tracking, MLC agency operations, product management
- Behavioral guidelines: be direct, be specific, reference real data, flag concerns
- Current date/time (injected dynamically)
- This layer gives Claude orientation but zero actual data

**Layer 2: Location-Aware Context Assembly (the smart part)**
When a Claude call is triggered, the assembler receives a context request:

```typescript
interface ContextRequest {
  domain: 'life' | 'mlc' | 'product' | 'global';
  module: string;           // 'health', 'client_workspace', 'fitness', etc.
  trigger: 'page_load' | 'chat' | 'background' | 'action';
  entityId?: string;        // client_id, project_id, product_id
  userMessage?: string;     // for chat triggers — used to detect cross-domain needs
}
```

The assembler looks up the context scoping rules (see table below) and calls the appropriate **Context Providers** — small, focused functions that each know how to fetch and summarize data from one domain.

**Layer 3: Context Providers (modular data fetchers)**
Each domain/module has a registered context provider. Providers return lean, pre-summarized data — never raw database dumps.

```
Context Providers:
├── HealthContextProvider      → latest weight, trend, Oura scores, flags, recent blood work
├── FitnessContextProvider     → this week's workouts, volume trend, PRs, next scheduled
├── DietContextProvider        → today's meals, weekly macro averages, active meal plan
├── FinancialContextProvider   → month spending vs budget, net worth trend, notable transactions
├── ClientContextProvider      → client profile, voice profile, active projects, recent notes
├── WPMaintenanceProvider      → site health status, overdue updates, last maintenance per site
├── AnalyticsContextProvider   → GA4 week-over-week, social engagement summary, campaign stats
├── GMBContextProvider         → recent reviews, sentiment trend, last report summary
├── ContentCalendarProvider    → upcoming scheduled content, gaps, pending approvals
├── ProjectContextProvider     → active projects, current phases, upcoming tasks, blockers
├── GoalContextProvider        → active goals, progress %, on-track/at-risk status
├── CalendarContextProvider    → today's events, upcoming deadlines, scheduling conflicts
├── PlantContextProvider       → plants needing water, overdue plants
├── GCEContextProvider         → pending events for review, next newsletter status
├── ActivityFeedProvider       → recent activity summary (filtered by scope)
├── TimeTrackingProvider       → hours this week/month per client, profitability flags
├── CustomTrackerProvider      → active trackers, overdue items, upcoming reminders
└── AutomationProvider         → recent rule triggers, any failures
```

Each provider implements the same interface:
```typescript
interface ContextProvider {
  getSummary(entityId?: string): Promise<ContextChunk>;  // ~200-500 tokens
  getDetailed(entityId?: string): Promise<ContextChunk>; // ~500-1500 tokens
}
```

The assembler calls `getSummary()` for secondary context and `getDetailed()` for primary context. This keeps the total payload lean.

**Example: BCA Client Workspace Chat**
```
Primary (detailed):
  → ClientContextProvider.getDetailed('bca-id')     // ~800 tokens
  → ProjectContextProvider.getDetailed('bca-id')     // ~600 tokens
  → WPMaintenanceProvider.getDetailed('bca-id')      // ~400 tokens

Secondary (summary):
  → AnalyticsContextProvider.getSummary('bca-id')    // ~300 tokens
  → ContentCalendarProvider.getSummary('bca-id')     // ~250 tokens
  → GMBContextProvider.getSummary('bca-id')          // ~200 tokens
  → TimeTrackingProvider.getSummary('bca-id')        // ~150 tokens

Total context: ~2,700 tokens + system prompt (500) + conversation history
```

**Example: Dashboard Home Page-Load**
```
All summary-level:
  → HealthContextProvider.getSummary()      // ~200 tokens (Oura score, weight)
  → GoalContextProvider.getSummary()        // ~300 tokens (top 5 goals, status)
  → ProjectContextProvider.getSummary()     // ~250 tokens (active count, overdue tasks)
  → CalendarContextProvider.getSummary()    // ~200 tokens (today's events)
  → WPMaintenanceProvider.getSummary()      // ~150 tokens (overdue count)
  → FinancialContextProvider.getSummary()   // ~200 tokens (spending trend)
  → CustomTrackerProvider.getSummary()      // ~150 tokens (overdue reminders)

Total context: ~1,450 tokens + system prompt (500)
```

**Example: Cross-Domain "How am I doing?" Chat**
```
All detailed (this is the expensive one):
  → HealthContextProvider.getDetailed()     // ~500 tokens
  → FitnessContextProvider.getDetailed()    // ~500 tokens
  → DietContextProvider.getDetailed()       // ~400 tokens
  → FinancialContextProvider.getDetailed()  // ~500 tokens
  → GoalContextProvider.getDetailed()       // ~600 tokens
  → ProjectContextProvider.getSummary()     // ~250 tokens
  → CalendarContextProvider.getSummary()    // ~200 tokens

Total context: ~2,950 tokens + system prompt (500) + conversation history
```

**Layer 4: Query Optimization (what the providers actually run)**
Each provider runs purpose-built queries that return summaries, not raw records:

```sql
-- HealthContextProvider.getSummary() might run:
-- 1. Latest weight + 7-day trend
SELECT value, recorded_at FROM health_metrics
  WHERE metric_type = 'weight' ORDER BY recorded_at DESC LIMIT 7;

-- 2. Today's Oura scores (just 3 numbers)
SELECT readiness_score, sleep_score, activity_score FROM oura_data
  WHERE date = CURRENT_DATE;

-- 3. Any out-of-range blood work flags (just the flags, not all results)
SELECT btr.test_name, btr.value, btr.reference_range, btr.flag
  FROM blood_test_results btr
  JOIN blood_tests bt ON btr.blood_test_id = bt.id
  WHERE bt.test_date > NOW() - INTERVAL '90 days' AND btr.flag IS NOT NULL;
```

These are fast (indexed, milliseconds) and return minimal data. The provider formats the results into a structured text block:

```
[HEALTH SNAPSHOT]
Weight: 192 lbs (↓3 lbs over 7 days)
Oura: Readiness 78, Sleep 82, Activity 65
Blood Work Flags (last 90 days): Vitamin D low (18 ng/mL, ref 30-100)
```

**Layer 5: Conversation History Management**
For multi-turn chat, the system stores messages in AIConversation/AIMessage tables. On each new message:
- Include the last 10-15 turns of conversation
- If conversation exceeds ~20 turns, summarize older messages: run a quick Sonnet call to compress the first N messages into a ~200 token summary
- The summary replaces the full history, keeping the context window manageable
- Conversation context + assembled data context combined should target under 8,000 tokens total for most calls

**Layer 6: Intelligent Caching (Redis)**
Not every Claude call needs to hit the API:

| Cache Type | TTL | Invalidation |
|---|---|---|
| Page-load insights | 4 hours | Invalidated when underlying data changes (new health entry, new task, etc.) |
| Dashboard daily briefing | 4 hours | Invalidated on any significant data change |
| Background weekly rollups | 7 days | Regenerated on schedule |
| Monthly client reports | Until regenerated | Manual or monthly job |
| Sentiment reports | Until regenerated | Monthly job |
| Context provider results | 5-15 minutes | Short TTL, cheap to regenerate |

Cache keys are scoped: `insight:health:page_load`, `insight:client:bca:workspace`, `context:health:summary`, etc.

When data changes (new meal logged, task completed, review synced), the relevant cache keys are invalidated. The next page load triggers a fresh Claude call.

**Layer 7: Cross-Domain Intent Detection (for chat)**
When a chat message comes in, before assembling context, the system does a quick intent check:
- If the message mentions health/body/feeling → include health + fitness + diet providers
- If the message mentions a client name → include that client's providers
- If the message is general/vague ("how's everything?") → go wide with summaries
- If the message is specific ("what did I do for BCA this week?") → go deep on BCA + activity feed

This can be simple keyword/pattern matching — no AI needed for intent detection. A regex-based router handles 90% of cases. Edge cases fall back to "ask Claude with minimal context, let it request more."

#### Cost Management

| Call Type | Model | Est. Context Tokens | Est. Cost per Call |
|---|---|---|---|
| Page-load insight (cached) | None | 0 | $0 |
| Page-load insight (fresh) | Sonnet | 2,000-3,000 | ~$0.003-0.005 |
| Chat message (scoped) | Sonnet | 3,000-5,000 | ~$0.005-0.010 |
| Chat message (cross-domain) | Sonnet | 5,000-8,000 | ~$0.010-0.015 |
| Deep analysis / PM session | Opus | 6,000-12,000 | ~$0.10-0.20 |
| Background insight job | Sonnet | 3,000-5,000 | ~$0.005-0.010 |
| Meeting notes action detection | Sonnet | 1,000-2,000 | ~$0.002-0.004 |
| Content generation (client voice) | Sonnet | 2,000-4,000 | ~$0.005-0.008 |
| Monthly client report | Sonnet | 4,000-6,000 | ~$0.008-0.012 |

With caching, a typical day might involve:
- 5-10 fresh page-load insights (~$0.05)
- 10-20 chat messages (~$0.15)
- 1-2 background jobs (~$0.02)
- Occasional deep analysis (~$0.15)
- **Daily total: ~$0.30-0.50, or $10-15/month typical usage**

#### Architecture Diagram (Conceptual)

```
User Action (page nav, chat msg, background timer)
        │
        ▼
┌─────────────────────────┐
│   Context Assembler     │
│                         │
│  1. Identify trigger    │
│  2. Check cache (Redis) │◄──── Cache hit? Return cached insight
│  3. Look up scoping     │
│     rules               │
│  4. Call context         │
│     providers            │
│  5. Build payload        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Context Providers      │
│                          │
│  health.getSummary()     │──── DB queries (fast, indexed)
│  fitness.getDetailed()   │──── DB queries
│  client.getDetailed()    │──── DB queries
│  ...                     │
└────────┬─────────────────┘
         │ Structured context chunks
         ▼
┌─────────────────────────┐
│   Claude API Call        │
│                          │
│  System prompt (static)  │
│  + Assembled context     │
│  + Conversation history  │
│  + User message          │
│                          │
│  Model: Sonnet (default) │
│  or Opus (deep analysis) │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Response Handler       │
│                          │
│  - Parse response        │
│  - Cache if page-load    │
│  - Store if insight      │
│  - Execute if action     │
│  - Return to UI          │
└──────────────────────────┘
```

#### Extensibility

Adding a new module to the AI system requires:
1. Create a new Context Provider (implements `getSummary()` and `getDetailed()`)
2. Register it in the provider registry
3. Add a row to the context scoping rules (which pages include this provider)
4. Done — Claude now knows about the new data source

This is critical for the "odds and ends" pattern — when Trey thinks of a new thing to track (contact lenses, tax payments, etc.), the flexible Custom Tracker system (Module 32) handles the data, and a single `CustomTrackerProvider` handles all custom trackers' AI context. No new providers needed per tracker.

### Context Scoping Rules

| User Location | Primary Context | Secondary Context (if relevant) |
|---|---|---|
| Dashboard Home | All domains (summary level) | Calendar, recent AI insights, goal progress |
| Health Module | Health metrics, Oura, blood work, illness | Diet, fitness (related), goals |
| Fitness Module | Workouts, Suunto, exercise history, preferences | Oura, meals (recovery context), goals |
| Diet Module | Recipes, meal logs, macros, meal plans | Health goals, fitness activity |
| Financial Module | QBO data, net worth, spending | Calendar (upcoming expenses), goals |
| Client Workspace | Client notes, projects, maintenance, voice profile | Analytics, social, content calendar, GMB reviews, time spent |
| Content Calendar | Calendar entries, client voice, performance data | Social metrics, Sendy metrics, content ideas |
| Social Analytics | Post metrics, timing data, content ideas | Client context, campaign data |
| GMB / Reviews | Reviews, sentiment data, trends | Client context, report history |
| GCE Module | Events, scrape data, newsletters | Sendy metrics (engagement) |
| Projects (General) | Tasks, deadlines, workload | Calendar, health (capacity), goals |
| Projects (AI PM Active) | Full project state: phases, tasks, materials, tools, measurements, photos, progress | Calendar, budget, related domain data, goals |
| Home Projects | Maintenance schedules, lawn care, active construction | Calendar, weather (if integrated) |
| Goal Tracking | All goals, progress data, linked metrics | Full cross-domain (whatever each goal ties to) |
| Activity Feed | Recent activity across all domains | Filtered by user's current view |
| Client Reports | All connected data for that client | Time tracking, analytics, social, maintenance, reviews |
| Global Chat | Everything — AI determines what's relevant | Full cross-domain |

### Interaction Modes

**1. Page-Load Insights (Automatic)**
- Triggered when navigating to key sections
- Uses Claude Sonnet for speed
- Generates contextual insights displayed at top of page
- Cached for a configurable duration (e.g., refresh every 4 hours) to avoid excessive API calls
- Can be refreshed manually ("Show me fresh insights")
- Insight stored in AIInsight table with triggered_by = "page_load"

**2. Chat (On-Demand)**
- Slide-out panel or dedicated chat view
- Always available from any page
- Context-aware based on current page, but can access anything
- Conversation history preserved
- Supports text and image input (food photos)

**3. Proactive Insights (Background)**
- Generated by scheduled BullMQ jobs
- Stored in AIInsight table
- Surface as notifications/toasts on dashboard
- Types: anomalies, trends, recommendations, alerts, weekly rollups
- Severity-based prioritization (info → urgent)
- Can trigger Twilio SMS for urgent alerts

**4. Action Triggers (AI Does Work)**
- Draft client email from maintenance log (addressed by name)
- Draft SMS to client
- Clean scraped GCE events
- Generate newsletter content
- Build workout (lifting or swimming)
- Build meal plan + shopping list
- Generate social content ideas
- Restructure today's task priorities
- **Generate full project plans with phases, tasks, materials, tools**
- **Calculate material quantities from measurements**
- **Process meeting notes → detect action items → suggest and execute actions on approval**
- Results always presented for review before executing (90% automated, 10% human)

**4a. Meeting Notes → Action Pipeline**
When a note (especially meeting notes) is saved or updated, Claude automatically scans the content for actionable items and surfaces them as suggestions:

- **"Client wants an email blast about spring menu on April 1st"** → Claude suggests: "Add 'Spring Menu Email Blast' to BCA's content calendar for April 1st" → You hit yes → entry created in content calendar with AI-drafted content in BCA's voice
- **"Need to update their homepage hero image by Friday"** → Claude suggests: "Create task 'Update homepage hero image' for BCA, due Friday" → You approve → task created in client workspace
- **"Follow up with them about logo files next week"** → Claude suggests: "Add reminder to email client re: logo files on [date]" → Approved → calendar event or task created
- **"They want to start posting 3x/week on Instagram starting March"** → Claude suggests: "Generate March content calendar for client with 3 posts/week" → Approved → AI drafts full month of content in client voice
- **"Discussed switching to monthly retainer at $X/month"** → Claude suggests: "Add note to client workspace re: retainer discussion" → Logged

**How it works:**
1. Save/update a note tagged as `meeting_notes` (or any note — Claude scans all)
2. Claude parses content, identifies action items with dates, people, and intent
3. NoteAction records are created with `status: pending` and structured action data
4. UI surfaces pending actions as a card/toast: "3 actions detected from your BCA meeting notes"
5. Review each suggestion — accept (Claude executes), edit (modify then execute), or dismiss
6. Accepted actions create real records (tasks, content calendar entries, email plans, calendar events) and link back via `executed_ref_id`

**5. Project Manager Mode (AI Guides Work)**
- Activated per-project when `ai_managed` is enabled
- Claude becomes an active guide, not just an analyst
- **Planning:** Interviews user about scope → generates phased project plan
- **Teaching:** Provides step-by-step instructions for unfamiliar tasks, calibrated to skill level
- **Contextual awareness:** Knows the full project state — what phase you're in, what's been completed, measurements, materials purchased
- **Proactive:** When you open a project, Claude tells you what to focus on today, what to watch out for, and what you need before starting
- **Safety-first:** Flags when professional help is recommended (electrical, plumbing, structural, permits)
- **Adaptive:** If you ask a question mid-phase, Claude answers with full project context rather than generic advice
- **Applies to all project types:** Construction, development, business, creative, learning — each gets contextually appropriate guidance

### Background Job Schedule

| Job | Frequency | Description |
|---|---|---|
| Oura Sync | Every 6 hours | Pull latest sleep, readiness, activity |
| Suunto Sync | Daily | Pull new workouts |
| GA4 Sync | Daily | Pull yesterday's analytics for all properties |
| Meta Sync | Daily | Pull latest post metrics with timing data |
| GMB Review Sync | Daily | Pull new Google reviews for all connected locations |
| Sendy Sync | Daily | Pull campaign stats |
| QBO Sync (Personal) | Daily | Pull transactions, categorize spending |
| QBO Sync (Business) | Daily | Pull transactions, revenue, expenses |
| Google Calendar Sync | Every 15 minutes | Pull upcoming events and changes |
| Health Analysis | Weekly (Sunday) | Analyze week's health data, generate insights |
| Fitness Analysis | Weekly (Monday) | Workout trends, recovery assessment |
| Financial Analysis | Weekly (Friday) | Spending summary, budget tracking |
| Social Content Ideation | Weekly (Wednesday) | Generate content ideas per client |
| Cross-Domain Rollup | Weekly (Sunday) | Big picture analysis across all data |
| Goal Progress Update | Weekly (Sunday) | Update auto-linked goal values, AI assessment |
| Client Profitability Calc | Monthly (1st) | Compute monthly hours/revenue per client |
| GMB Sentiment Report | Monthly (1st) | Generate monthly review sentiment reports per client |
| Client Report Generation | Monthly (1st) | Auto-generate monthly reports for all active clients |
| GCE Scrape | Daily or configurable | Scrape configured event sources |
| Plant Watering Check | Daily (morning) | Generate alerts for plants needing water |
| Maintenance Schedule Check | Daily (morning) | Create tasks for due maintenance, flag overdue |
| Custom Tracker Check | Daily (morning) | Check for due/overdue trackers, send reminders |
| Automation Rules Engine | Every 15 minutes | Evaluate active condition-based rules |
| Data Export | Weekly/Monthly (configurable) | Scheduled data backup to storage |
| Net Worth Reminder | Monthly (1st) | Remind to update net worth snapshot |

---

## 9. Phasing Plan

### Phase 0: Foundation (Week 1-2)
**Goal:** Skeleton app, auth with 2FA, database, deployment pipeline.

- Next.js project setup with TypeScript, Tailwind, Shadcn/ui
- Supabase project setup (database + auth + storage)
- Prisma ORM connected to Supabase PostgreSQL
- Authentication with Supabase Auth (email/password + TOTP 2FA)
- **Login screen** — the military/top-secret design with 2FA flow
- **FBI redirect on failed login**
- Basic dashboard layout (sidebar nav, main content area, header)
- Deployment to Vercel
- Domain configuration (exitframe.org → Vercel)
- Upstash Redis + BullMQ setup for background jobs

**Deliverable:** You can log in at exitframe.org (with 2FA!), failed intruders visit the FBI, and you see an empty but beautiful dashboard.

---

### Phase 1: Project Tracker & Client Workspaces (Week 3-4)
**Goal:** Replace ClickUp immediately. Daily utility from day one.

- Client CRUD (create, edit, archive clients with contact info and service toggles)
- Product CRUD (create, edit, archive products with module config)
- Project management (create projects under any domain/client/product)
- Task management (kanban + list view, priorities, due dates)
- Notes system (markdown editor, per-client/product/personal, note types including meeting notes)
- **Meeting notes → action pipeline** (AI detects action items, suggests tasks/calendar entries)
- **ClickUp notes import** (one-time migration tool)
- **Passive time tracking** — auto-track time spent per module/client (hands-off, runs in background)
- **Client onboarding templates** — create reusable templates, one-click new client scaffolding
- **Activity feed** — foundational cross-domain activity logging (all creates/updates/completions log here)
- Dashboard widgets: tasks due today, overdue count, active projects

**Deliverable:** ClickUp is dead. You manage all projects and client notes here. New clients get onboarded in one click. Time is tracked without lifting a finger.

---

### Phase 2: Health & Fitness + Workout Builder (Week 5-7)
**Goal:** Core personal tracking with AI workout generation.

- Health metrics logging (manual entry + charts)
- Blood test logging with reference ranges and flags
- Illness tracking
- Family health history
- Oura API integration (OAuth flow + scheduled sync)
- Oura dashboard (sleep, readiness, activity, HRV trends)
- Workout logging (manual entry with exercises, sets, reps — lifting + swimming)
- Suunto API integration (OAuth + sync)
- Workout preferences storage
- **AI Workout Builder** — generate lifting and swimming workouts from parameters
- Fitness dashboard (workout history, volume trends, PRs)
- **Page-load AI** for Health and Fitness pages
- Dashboard widgets: Oura readiness, recent workouts

**Deliverable:** Full health and fitness tracking live. Oura and Suunto data flowing in. AI builds your workouts.

---

### Phase 3: Diet, Meal Planning & Calorie AI (Week 8-10)
**Goal:** Recipe database, meal planning, shopping lists, photo-based calorie estimation. Kill Mealime.

- Recipe CRUD with ingredients and macros
- **AI Recipe Builder** — generate recipes from parameters
- Meal logging (select recipe, set servings, add notes)
- Photo upload with Claude Vision integration for portion estimation
- Daily/weekly nutrition summaries
- **Meal Planner** — weekly meal plan creation (manual + AI-generated)
- **Shopping List Generator** — auto-generate from meal plan, organized by aisle
- Dashboard widget: today's meals, macro progress

**Deliverable:** Full meal management. Mealime subscription cancelled.

---

### Phase 4: AI Layer, Goals, Custom Trackers, Automations & Backup (Week 11-14)
**Goal:** The Claude-powered brain comes fully online. Goals, custom trackers, rules, and backups round out the system.

- AI chat interface (slide-out panel, available from any page)
- Dynamic context loading based on current module
- Cross-domain queries ("I'm feeling bad" flow)
- **Page-load AI insights** on all key pages
- Background insight generation (health trends, fitness trends)
- AIInsight storage and notification system
- Dashboard widget: recent AI insights
- Weekly rollup job
- Insight caching to manage API costs
- **Goal tracking** — create goals tied to real data (health, financial, project, fitness), auto-link to metrics, AI progress assessment
- **Goal dashboard widget** — active goals with progress bars
- **Custom Trackers** — create any recurring, value-log, checklist, or countdown tracker. Auto-calculated due dates, SMS/notification reminders, cost tracking, history. Dashboard widget for overdue/upcoming items.
- **Automations / rules engine** — if/then rules (schedule, event, condition triggers → task, SMS, notification, flag actions)
- **Rule builder UI** — no-code rule creation
- **Activity feed AI integration** — "What did I do for BCA this month?" queries
- **Data export & backup** — scheduled weekly/monthly exports to Supabase Storage, retention policy, on-demand export, failure alerting

**Deliverable:** You can talk to the dashboard and it knows everything. Pages greet you with insights. Goals are tracked with AI coaching. Contacts, oil changes, tax payments — all tracked and reminded. Rules run automatically. Data is backed up on schedule.

---

### Phase 5: WordPress Management & Client Comms (Week 15-16)
**Goal:** Agency operations management with automated maintenance scheduling.

- Custom WordPress client plugin (build and deploy to client sites)
- WordPress site registration in dashboard
- Site health view, plugin update triggers
- Maintenance logging
- **Recurring maintenance schedules** — set up weekly/monthly/quarterly maintenance per site or globally, auto-creates tasks when due, flags overdue
- AI email drafting from maintenance context (addresses client by name)
- Email send flow via Gmail API
- Email history per client
- **Twilio integration** — SMS to clients, personal reminders
- Client workspace integration (maintenance log + emails + SMS visible in workspace)

**Deliverable:** You manage WordPress updates, client emails, and client texts from the dashboard. Recurring maintenance never falls through the cracks.

---

### Phase 6: Analytics, Content, GMB, Client Reports & Sharing (Week 17-21)
**Goal:** GA4, social, Sendy, GMB reviews, content calendars, auto-generated client reports, and client sharing. Kill Trello.

- GA4 API integration (connect properties, daily sync)
- GA4 per-site dashboard (traffic, sources, top pages)
- Meta Graph API integration (connect client FB/IG accounts)
- Social post metrics per client **with posting time data**
- Sendy API integration (campaign stats)
- Per-client analytics widgets in client workspaces
- **Google Business Profile API** — sync reviews for connected clients
- **AI sentiment classification** — tag reviews with sentiment and themes
- **Monthly sentiment reports** — auto-generated narrative analysis, shareable with clients (Cristy's use case)
- **Client voice profiles** — define tone, vocabulary, examples per client for AI content generation
- **Content calendars** — calendar view + Trello-style board view per client
- **AI content ideation** — generate social and email content ideas in client voice, informed by performance data
- **Email content planning** — campaign planning with AI-drafted content in client voice
- **Client reports** — AI auto-generates monthly reports per client (maintenance, analytics, social, content, reviews, time spent)
- **Client profitability view** — hours vs revenue per client from passive time tracking data
- **Client sharing** — secure read-only links for content calendars, reports, sentiment reports
- **Page-load AI** for analytics and content calendar pages

**Deliverable:** Never open GA4 again. Trello is dead. Content calendars with AI-generated ideas in each client's voice. Monthly client reports generated in one click. Review sentiment tracked and reported. Clients access what they need via shared links.

---

### Phase 7: Financial + QBO (Week 22-23)
**Goal:** Full financial picture — net worth + spending analysis.

- QBO OAuth integration (personal + business accounts)
- QBO transaction sync and categorization
- **Spending analysis by category** — personal and business
- Month-over-month spending comparison
- Net worth snapshots (assets, liabilities, trend chart)
- Business P&L overview
- **Page-load AI** for financial insights
- Dashboard widgets: net worth, spending alerts

**Deliverable:** Complete financial visibility. AI analyzes your spending patterns.

---

### Phase 8: Grove City Events Pipeline (Week 24-26)
**Goal:** Full event pipeline — scrape, clean, publish (with images), newsletter, send.

- Scrape source configuration
- Event scraping engine (scheduled + manual)
- AI-powered event data cleanup
- Event staging/review interface
- **Featured image handling** — scrape, upload, or assign
- **Publish to The Events Calendar API including featured image**
- Newsletter builder (pull events, layout, reorder, preview)
- **Delete events from newsletter** or **manually add events**
- Newsletter HTML generation
- Push to Sendy (no Zapier)

**Deliverable:** Airtable and Zapier workflows eliminated. Full GCE pipeline in the dashboard.

---

### Phase 9: Calendar, Home & Plants (Week 27-28)
**Goal:** Round out personal tracking and add calendar integration.

- **Google Calendar integration** (OAuth, real-time sync)
- Calendar widget on dashboard
- Calendar-aware task management (AI sees your schedule)
- Plant care (catalog, watering schedule, log, alerts)
- Home projects (project tracking, lawn care schedule)
- **Twilio reminders** for plants and home maintenance tasks
- Dashboard widgets for all three

**Deliverable:** Every module is live. Google Calendar is integrated. The dashboard is complete.

---

### Phase 10: Polish & Product Integrations (Week 29+)
**Goal:** Integrate products, refine everything, add depth.

- GetShelfed admin (game scheduling from dashboard)
- ManlyMan integration (as product matures)
- MLC website integration (quest stats, AI sharing stats)
- Dashboard customization (drag/rearrange widgets)
- Dark/light mode toggle
- Command palette (Cmd+K)
- Performance optimization
- Mobile responsiveness pass

**Deliverable:** Everything is connected, polished, and production-grade.

---

### Future: Phase 11 — Android Companion App
- React Native app consuming the same API
- Focus on daily interactions: meal logging (photo), task management, AI chat, shopping list
- Push notifications for insights, plant watering, task reminders, Twilio inbound

---

### Future: Phase 12 — Demo Mode + Architecture Showcase
**Goal:** Showcase the platform to potential customers or collaborators without exposing any real data.

- **Demo mode toggle** — accessible from login screen or via a dedicated URL (e.g., exitframe.org/demo)
- **Synthetic data layer** — pre-generated realistic but fake data across all modules:
  - Fake client workspaces with dummy projects, maintenance logs, analytics
  - Sample health/fitness/diet data showing trends and AI insights
  - Mock financial data, meal plans, shopping lists
  - Example GCE pipeline with scraped events, newsletter preview
  - AI chat interactions demonstrating cross-domain analysis
- **No real data exposed** — demo mode connects to a separate seed dataset, never touches production data
- **Full architecture breakdown page** — accessible within demo mode:
  - Interactive system diagram showing all modules and how they connect
  - Tech stack overview with rationale for each choice
  - API integration map showing all external services
  - Data flow visualization (how data moves from APIs → database → AI → UI)
  - Background job architecture explanation
  - AI context loading strategy breakdown
  - Security model overview (auth, encryption, 2FA)
  - Performance and scaling approach
- **Guided tour option** — optional walkthrough that highlights key features module by module
- **"Built with" credits** — tech stack badges, integration logos
- **Demo mode watermark** — subtle indicator that this is demo data, not live

**Deliverable:** A polished, shareable demo that shows the full power of the platform without any privacy risk. Architecture page serves as both a sales tool and a technical portfolio piece.

---

## 10. Cost Analysis

### New Monthly Services

| Service | Tier | Estimated Cost | Notes |
|---|---|---|---|
| Supabase | Free → Pro ($25/mo) | $0 – $25/mo | Free tier: 500MB DB, 1GB storage. Pro when needed. |
| Vercel | Free → Pro ($20/mo) | $0 – $20/mo | Free tier: 100GB bandwidth, serverless functions. Likely sufficient for single user. |
| Upstash Redis | Free → Pay-as-you-go | $0 – $10/mo | Free tier: 10k commands/day. |
| Claude API | Pay per use | $20 – $50/mo | Varies with usage. Page-load insights cached to manage costs. |
| Twilio | Pay per use | ~$1/mo + $0.0079/SMS | Minimal. Phone number: $1/mo. |
| **Total New Spend** | | **$21 – $106/mo** | Realistically $50-60/mo to start |

### Existing Services (No Change)

| Service | Current Use |
|---|---|
| SiteGround | WordPress hosting for all client sites, GCE, MLC, etc. |
| AWS | S3 + Sendy (using credits) |
| Domain registrations | Already owned |

### SaaS Killed/Reduced

| Service | Savings |
|---|---|
| ClickUp | Subscription eliminated |
| Trello | Subscription eliminated |
| Airtable | Subscription eliminated |
| Mealime | Subscription eliminated |
| Zapier | Usage minimized (some workflows remain) |
| GA4 Interface | Sanity restored (priceless) |

---

## 11. SaaS Replacement Summary

| Tool | Replaced By | Phase |
|---|---|---|
| ClickUp | Project Tracker + Client Workspaces | Phase 1 |
| Trello | Content Calendars + Client Sharing | Phase 6 |
| Mealime | Meal Planner + Recipe Builder + Shopping Lists | Phase 3 |
| Airtable | GCE Newsletter Builder | Phase 8 |
| Zapier (minimized) | Direct API integrations | Phase 8 |
| GA4 Interface | GA4 Analytics Dashboard | Phase 6 |
| Notion LifeTracker | Health + Fitness + Dashboard | Phase 2 |

---

## 12. Migration Plan

### ClickUp Notes Export/Import
- **Export:** Use ClickUp's export feature to extract all notes/tasks (CSV or JSON)
- **Transform:** Build a one-time migration script that maps ClickUp data to the Note schema
  - Preserve: title, content, created dates
  - Tag with `imported_from: "clickup"` and `imported_at` timestamp
  - Map ClickUp spaces/folders to appropriate domains (client, product, personal)
- **Import:** Run script to bulk insert into the Notes table
- **Verify:** Side-by-side comparison before decommissioning ClickUp

### Notion LifeTracker
- Manual migration of any historical data worth preserving
- Most value is in the structure/templates, not historical records
- New system supersedes Notion's tracking approach

### Airtable (GCE)
- Export current newsletter event data
- One-time import of any template or recurring event data
- New pipeline replaces the workflow, not just the data

---

## 13. Open Questions & Future Considerations

### Open Questions
1. **Suunto API access:** Verify current API availability and OAuth flow — needs research
2. **Meta API approval:** Business verification process for Facebook/Instagram API access — start early
3. **QBO API setup:** Register app with Intuit, handle OAuth flow for both personal and business accounts
4. **Google Calendar scope:** Read-only sync, or do we want to create/modify events from the dashboard too?
5. **Twilio use cases:** Currently identified — client texts, personal reminders, urgent alerts. Any others?
6. **ClickUp export format:** Need to test export and map fields before building migration script
7. **Custom WP plugin distribution:** How to manage updates to the client-site plugin across all installs

### Resolved Questions
1. ~~Hosting decision~~ → Vercel (Next.js app) + SiteGround (WordPress) + Supabase (DB/auth/storage)
2. ~~Email provider~~ → Gmail API (sends from Trey's email)
3. ~~File storage~~ → Supabase Storage (primary) + AWS S3 (Sendy assets, using credits)
4. ~~Database~~ → Supabase (PostgreSQL) — already using for ManlyMan

### Future Feature Ideas
- Habit tracking system
- Reading/book tracking (separate from Shelf)
- Weather integration for lawn care recommendations
- Invoice/billing module for MLC clients
- Time tracking per client/project
- Integration with banking APIs for automated financial tracking (supplement/replace manual net worth)
- Voice input for quick logging (mobile app)
- Webhooks for real-time data from client sites
- Slack/Discord integration for notifications
- Client portal — let clients view their own project status (way future)

### Security Considerations
- **2FA required** on all logins (TOTP via authenticator app)
- **Failed login → FBI redirect** (security through confusion 😂)
- All API keys and tokens encrypted at rest (Supabase vault)
- Rate limiting on API endpoints
- CORS configuration for API-first architecture
- Regular dependency audits
- Session timeout and refresh token rotation
- Audit log for sensitive actions (updates pushed to client sites, emails sent)
- Supabase Row Level Security (RLS) policies
- Environment variable management via Vercel

---

## Appendix A: Integration Authentication Summary

| Integration | Auth Type | Tokens Needed | Storage |
|---|---|---|---|
| Supabase Auth | Built-in | N/A | Managed by Supabase |
| Oura | OAuth 2.0 | Access + refresh token | Encrypted in integrations table |
| Suunto | OAuth 2.0 | Access + refresh token | Encrypted in integrations table |
| Google Analytics 4 | Google OAuth | Access + refresh token | Encrypted in integrations table |
| Google Calendar | Google OAuth | Access + refresh token | Encrypted in integrations table (shared with GA4 Google OAuth) |
| Meta Graph API | OAuth per client | Access token (per account) | Encrypted in social_accounts table |
| QuickBooks Online | OAuth 2.0 | Access + refresh token (per company) | Encrypted in qbo_accounts table |
| Sendy | API key | API key | Encrypted in integrations config |
| Gmail API | Google OAuth | Access + refresh token | Encrypted in integrations table (shared Google OAuth) |
| Twilio | API key + auth token | Account SID + auth token | Encrypted in integrations config |
| Claude API | API key | API key | Environment variable (Vercel) |
| WordPress (client sites) | Custom token | Auth token per site | Encrypted in wordpress_sites table |
| The Events Calendar | WP app password | App password | Encrypted in integrations config |
| Google Business Profile | Google OAuth | Access + refresh token | Encrypted in integrations table (shared Google OAuth) |

---

## Changelog

### v4.1 — Custom Trackers + Context Assembler Verification
- **Module 32: Custom Trackers** — Flexible "odds and ends" system for anything that doesn't need its own module. Four tracker types (recurring, value_log, checklist, countdown). Auto-calculated due dates, SMS/notification reminders, cost tracking per entry, metadata fields, goal linking. Examples: contact lenses, oil changes, estimated tax payments, passport renewal, HVAC filters.
- Added CustomTracker and CustomTrackerEntry data models (2 new tables).
- Added Custom Tracker Check to background job schedule.
- Added Custom Trackers to Life org structure, Phase 4, dashboard homepage widgets.
- Verified Context Assembler Architecture already fully written (7 layers, provider interfaces, 3 worked examples, SQL examples, caching strategy, cost management, architecture diagram). CustomTrackerProvider already referenced throughout.
- Timeline adjusted to ~31 weeks.

### v4.0 — New Modules (Passive Time, GMB, Client Reports, Maintenance Schedules, Activity Feed, Goals, Backups, Onboarding, Automations)
- **Module 23: Passive Time Tracking & Client Profitability** — 100% hands-off time tracking by monitoring module/client activity. Client profitability calculations.
- **Module 24: Google My Business + Review Sentiment** — GMB API integration, AI sentiment classification, monthly sentiment reports (Cristy's use case), shareable with clients.
- **Module 25: Client Reports (Auto-Generated)** — One-click monthly reports per client pulling from all connected services (maintenance, analytics, social, content, reviews, time).
- **Module 26: Recurring Maintenance Schedules** — Automated WP maintenance workflows, auto-task creation, overdue flagging.
- **Module 27: Global Activity Feed** — Unified cross-domain activity log with filtering by domain, module, type. Searchable.
- **Module 28: Goal Tracking** — Goals tied to real data (health, financial, project, fitness), auto-linked metrics, AI progress coaching.
- **Module 29: Data Export & Backup** — Scheduled weekly/monthly full data exports, retention policy, failure alerting.
- **Module 30: Client Onboarding Templates** — Reusable templates for one-click new client setup.
- **Module 31: Automations / Rules Engine** — No-code if/then rules (schedule, event, condition triggers → task, SMS, notification, flag actions).
- Added Google Business Profile API to integrations.
- Added 8 new background jobs (GMB sync, sentiment reports, client reports, profitability calc, goal updates, maintenance checks, automation engine, data export).
- Updated phasing: Phase 1 expanded (onboarding, time tracking, activity feed), Phase 4 expanded (goals, automations, backups), Phase 5 expanded (maintenance schedules), Phase 6 expanded (GMB, client reports, profitability). Timeline adjusted to ~30 weeks.
- Updated org structure, context scoping, dashboard homepage widgets.
- 9 new data model sections (17 new tables).

### v3.3 — Meeting Notes → Action Pipeline
### v3.2 — Content Calendars + Client Sharing (kills Trello)
### v3.1 — Demo Mode & Architecture Showcase
### v3.0 — AI Project Manager
### v2.0 — Initial comprehensive specification

---

*This document is the living blueprint for the Mosaic Life Dashboard. Update it as decisions are made and features evolve.*
