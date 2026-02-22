# Phase 0: Foundation — Build Briefing

## What Is This?

This is the Mosaic Life Dashboard — a single-user command center for Trey that replaces ClickUp, Trello, Airtable, Mealime, and Zapier. It manages personal life (health, fitness, diet, finances, goals) and business operations for Mosaic Life Creative, a WordPress/Divi agency.

This document covers **Phase 0 only** — the skeleton app, authentication, layout shell, and deployment pipeline. No features yet. The goal is: Trey can log in at exitframe.org with 2FA, failed intruders get redirected to fbi.gov, and he sees an empty but functional dashboard layout.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 14+** (App Router) | TypeScript, strict mode |
| Styling | **Tailwind CSS** + **Shadcn/ui** | Shadcn built on Radix primitives |
| State | **Zustand** or **Jotai** | Lightweight, for client state only |
| Database | **Supabase** (PostgreSQL) | Hosted, managed. Trey has an existing Supabase account. |
| ORM | **Prisma** | Connected to Supabase PostgreSQL via connection string |
| Auth | **Supabase Auth** | Email/password + TOTP 2FA |
| File Storage | **Supabase Storage** | For future uploads (photos, documents, images) |
| Cache / Jobs | **Upstash Redis** + **BullMQ** | Serverless Redis for job queues and caching |
| Charts | **Recharts** | For future data visualization |
| Hosting | **Vercel** | Deployed from GitHub repo `exitFrame` |
| Domain | **exitframe.org** | Registered on GoDaddy, DNS pointed to Vercel |

---

## Project Structure

```
exitFrame/
├── .env.local                    # Local env vars (never committed)
├── .env.example                  # Template for env vars
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── prisma/
│   └── schema.prisma             # Database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Redirect to /login or /dashboard
│   │   ├── login/
│   │   │   └── page.tsx          # Login screen (the military design)
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── route.ts      # Supabase auth callback
│   │   │   └── verify-totp/
│   │   │       └── page.tsx      # 2FA TOTP entry screen
│   │   └── dashboard/
│   │       ├── layout.tsx        # Authenticated layout (sidebar + header + main)
│   │       └── page.tsx          # Dashboard home (empty shell for now)
│   ├── components/
│   │   ├── ui/                   # Shadcn/ui components (installed via CLI)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # Left sidebar navigation
│   │   │   ├── Header.tsx        # Top header bar
│   │   │   └── MainContent.tsx   # Main content area wrapper
│   │   └── auth/
│   │       ├── LoginForm.tsx     # Email/password form with military styling
│   │       └── TOTPForm.tsx      # 2FA code entry form
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client
│   │   │   ├── server.ts         # Server-side Supabase client
│   │   │   └── middleware.ts     # Auth middleware for protected routes
│   │   ├── prisma.ts             # Prisma client singleton
│   │   └── redis.ts              # Upstash Redis client
│   ├── middleware.ts              # Next.js middleware (auth protection + FBI redirect logic)
│   └── styles/
│       └── globals.css           # Tailwind base + custom styles
├── public/
│   └── (static assets)
└── package.json
```

---

## Authentication Flow

This is a **single-user application**. Only Trey logs in. But the auth system should be robust because the dashboard will contain sensitive personal, financial, and business data.

### Login Flow

```
1. User visits exitframe.org
   → If not authenticated: show login screen
   → If authenticated: redirect to /dashboard

2. Login screen: enter email + password
   → On submit: Supabase signInWithPassword()
   → On failure: redirect to https://www.fbi.gov (no error message, clean redirect)
   → On success: proceed to 2FA

3. 2FA screen: enter TOTP code from authenticator app
   → On submit: Supabase verifyTOTP() (or equivalent MFA verification)
   → On failure: redirect to https://www.fbi.gov
   → On success: brief "ACCESS GRANTED" animation (1-2 seconds), then redirect to /dashboard

4. All /dashboard/* routes are protected by middleware
   → No valid session = redirect to /login
   → Valid session = proceed
```

### 2FA Setup

Since this is single-user, Trey will set up TOTP during initial account creation. Use Supabase Auth's built-in MFA/TOTP support:
- Enroll TOTP factor (generates QR code for authenticator app)
- Verify factor on each login
- Store the factor in Supabase Auth (managed automatically)

If Supabase Auth's TOTP flow requires a specific enrollment step, include a one-time `/auth/setup-totp` page that Trey visits once to scan the QR code.

### FBI Redirect

This is not a joke — it's a real feature. On ANY authentication failure (wrong password, wrong TOTP code, expired session on a protected route with no valid refresh):
- **Do not show an error message**
- **Do not show "try again"**
- **`window.location.href = 'https://www.fbi.gov'`**
- Clean, instant redirect. The intruder lands on the FBI website with no context.

Implement this in the Next.js middleware and in the login/TOTP form error handlers.

### Session Management

- Use Supabase Auth session tokens (JWT)
- Refresh tokens rotate automatically
- Session timeout: follow Supabase defaults (configurable later)
- All API routes validate the session via middleware before processing

---

## Login Screen Design

**Aesthetic: Top-secret / military / classified terminal**

This is the first thing anyone sees at exitframe.org. It should look like a secure government terminal, not a SaaS login page. No indication of what the site does.

### Visual Specifications

- **Background:** Near-black or very dark charcoal (#0a0a0a to #121212 range)
- **Animated background element** — choose ONE (tasteful, not cheesy):
  - Subtle scan lines (horizontal, slow drift, very low opacity)
  - Grid pulse (faint grid that pulses slowly)
  - Particle field (sparse, slow-moving dots)
  - Do NOT do matrix-style text rain — too cliché
- **Font:** Monospace for ALL text on the login screen (JetBrains Mono, Fira Code, or IBM Plex Mono)
- **Color accent:** Muted green (#00ff41 at low opacity) or amber (#ffb000) — think terminal/military
- **Input fields:** Dark background, thin border, monospace text, subtle glow on focus
- **Submit button:** Understated, no rounded corners, slight glow effect
- **Branding:** Minimal — small text or logo mark. Nothing that says "Mosaic Life Creative" or hints at what this is
- **No "Sign up" link** — this is single-user, there is no registration
- **No "Forgot password" link** — Trey knows his password
- **No social login buttons** — email/password + 2FA only

### Login → 2FA Transition

After successful password entry, transition to the TOTP screen. Options:
- Same page, form morphs to show the TOTP input (preferred — feels like one continuous flow)
- Brief "AUTHENTICATING..." text with a loading animation before revealing the TOTP input

### ACCESS GRANTED Animation

After successful 2FA:
- Screen briefly shows "ACCESS GRANTED" in monospace, centered
- Perhaps a brief green flash or pulse
- 1-2 seconds, then redirect to /dashboard
- This should feel satisfying, like you've unlocked something

### Responsive

The login screen should look good on mobile too, but it's primarily a desktop experience.

---

## Dashboard Layout Shell

After login, the dashboard is a clean, modern layout. This is a stark contrast to the dark military login — the dashboard itself is sleek and functional.

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│  Header (top bar)                               │
│  ┌──────┬──────────────────────────────────────┐ │
│  │      │                                      │ │
│  │ Side │          Main Content                │ │
│  │ bar  │                                      │ │
│  │      │                                      │ │
│  │      │                                      │ │
│  │      │                                      │ │
│  │      │                                      │ │
│  └──────┴──────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Header
- Dashboard title / current page name (left)
- Command palette trigger — Cmd+K / Ctrl+K (right) — stubbed for now, just the keyboard shortcut and a placeholder modal
- User avatar/menu (right) — just a logout button for Phase 0
- Future: notification bell, AI chat toggle

### Sidebar
- **Width:** ~240px, collapsible to icon-only (~60px)
- **Organized by domain:**

```
LIFE
  ├── Dashboard (home)
  ├── Health
  ├── Fitness
  ├── Diet
  ├── Financial
  ├── Goals
  ├── Trackers
  ├── Plants
  ├── Home
  └── Calendar

MLC
  ├── Clients
  ├── WordPress
  ├── Content
  ├── Analytics
  ├── Email Campaigns
  ├── Communications
  └── Automations

PRODUCTS
  ├── GetShelfed
  ├── ManlyMan
  ├── MLC Website
  └── Grove City Events
```

- Each nav item shows an icon + label (icon-only when collapsed)
- Active page highlighted
- Sections are collapsible
- **For Phase 0:** All nav items exist but clicking them shows a "Coming in Phase X" placeholder page. Only the Dashboard home page has any real content (which is also mostly a placeholder in Phase 0).

### Main Content Area
- Clean white (light mode) or dark gray (dark mode) background
- Max-width container with comfortable padding
- This is where all module content will render

### Dark/Light Mode
- Toggle in the header
- **Default: dark mode** (matches the login vibe)
- Persist preference in localStorage
- Tailwind's `dark:` classes handle styling

### For Phase 0 Dashboard Home Content
- A welcome message: "Welcome back, Trey." (or just "Mosaic Life Dashboard")
- Placeholder widget grid showing where future widgets will go (empty cards with labels like "Oura Readiness", "Tasks Due Today", "Active Goals", etc.)
- This communicates the vision without requiring any data

---

## Database Setup (Phase 0)

### Prisma Schema — Foundation Tables Only

Phase 0 creates only the tables needed for the foundation. Feature tables (health, fitness, projects, etc.) are added in their respective phases.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // Supabase requires direct connection for migrations
}

// User profile (extends Supabase Auth user)
// Supabase Auth manages the actual auth — this stores app-level user preferences
model UserProfile {
  id            String   @id @default(uuid()) @db.Uuid
  authUserId    String   @unique @map("auth_user_id")  // Maps to Supabase Auth user ID
  displayName   String   @map("display_name")
  timezone      String   @default("America/New_York")
  theme         String   @default("dark")  // "dark" or "light"
  preferences   Json?    @default("{}")     // Flexible user preferences
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("user_profiles")
}

// Integration registry — tracks all external service connections
model Integration {
  id              String    @id @default(uuid()) @db.Uuid
  serviceName     String    @map("service_name")  // "oura", "suunto", "ga4", "meta", "qbo", "gmail", "twilio", etc.
  status          String    @default("inactive")  // "active", "inactive", "error"
  config          Json?     @default("{}")         // Service-specific configuration
  credentials     Json?     @default("{}")         // Encrypted tokens/keys (use Supabase vault in production)
  lastSyncAt      DateTime? @map("last_sync_at")
  lastError       String?   @map("last_error")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("integrations")
}

// Audit log — tracks sensitive actions across the system
model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  action      String   // "login", "login_failed", "update_pushed", "email_sent", etc.
  module      String?  // "auth", "wordpress", "communication", etc.
  entityType  String?  @map("entity_type")   // "client", "site", "email", etc.
  entityId    String?  @map("entity_id") @db.Uuid
  details     Json?    @default("{}")
  ipAddress   String?  @map("ip_address")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("audit_logs")
}
```

### Notes on Supabase + Prisma

- **Connection strings:** Supabase provides two URLs — a pooled connection (`DATABASE_URL` for the app) and a direct connection (`DIRECT_URL` for Prisma migrations). Both go in `.env.local`.
- **Supabase Auth** handles user creation, login, and TOTP — we do NOT create a users table in Prisma. The `UserProfile` table extends the auth user with app preferences.
- **RLS (Row Level Security):** Since this is single-user, RLS policies are simple — just verify the authenticated user matches. Set up basic RLS policies on all tables.
- **Prisma migrations:** Run `npx prisma migrate dev` locally, which generates SQL migration files. These are committed to the repo.

---

## Redis / BullMQ Setup

### Upstash Redis Connection

```typescript
// src/lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### BullMQ — Basic Queue Setup

Phase 0 doesn't need any actual jobs, but the queue infrastructure should be in place:

```typescript
// src/lib/queue.ts
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// BullMQ needs a standard Redis connection (not Upstash REST)
// Upstash provides an ioredis-compatible endpoint
const connection = new IORedis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Create a test queue to verify the connection works
export const testQueue = new Queue('test', { connection });

// Worker processes jobs from the queue
export const testWorker = new Worker(
  'test',
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.data.message}`);
  },
  { connection }
);
```

**Note on BullMQ + Upstash:** Upstash's Redis is serverless and has some limitations with persistent connections. BullMQ may need the Upstash `ioredis` compatibility mode. If issues arise, an alternative is to use Upstash QStash (their HTTP-based queue service) instead of BullMQ. Either works — the key is having a job scheduling system ready for Phase 1+.

---

## Environment Variables

```env
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[password]@[host]:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
UPSTASH_REDIS_URL=rediss://default:your-token@your-redis.upstash.io:6379

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Deployment

### Vercel Setup
1. Connect the `exitFrame` GitHub repo to Vercel
2. Set framework preset to Next.js (auto-detected)
3. Add all environment variables from `.env.example` to Vercel project settings
4. Deploy on push to `main` branch

### Domain Configuration
1. In Vercel: Add `exitframe.org` as a custom domain
2. In GoDaddy: Update DNS records per Vercel's instructions (typically a CNAME to `cname.vercel-dns.com`)
3. Vercel auto-provisions SSL certificate
4. Verify HTTPS works

---

## Definition of Done — Phase 0

When Phase 0 is complete, the following should all be true:

- [ ] `exitframe.org` loads the login screen (dark military aesthetic with animated background)
- [ ] Login form accepts email/password (monospace fonts, dark styling)
- [ ] Wrong credentials redirect to fbi.gov (no error message)
- [ ] Correct credentials proceed to TOTP 2FA entry
- [ ] Wrong TOTP code redirects to fbi.gov
- [ ] Correct TOTP code shows "ACCESS GRANTED" animation, then loads dashboard
- [ ] Dashboard has sidebar navigation with all section labels (clicking shows placeholder)
- [ ] Dashboard has header with dark/light mode toggle and logout
- [ ] Dashboard home shows placeholder widget grid
- [ ] Cmd+K opens an empty command palette modal (placeholder)
- [ ] Sidebar collapses to icon-only mode
- [ ] Dark mode is default, light mode works when toggled
- [ ] Database connection works (Prisma → Supabase PostgreSQL)
- [ ] Foundation tables created (UserProfile, Integration, AuditLog)
- [ ] Redis connection works (Upstash)
- [ ] BullMQ queue processes a test job
- [ ] Login attempts are logged to AuditLog
- [ ] `.env.example` documents all required environment variables
- [ ] Deployment pipeline works: push to GitHub → auto-deploy on Vercel
- [ ] Mobile responsive (login + dashboard layout)

---

## What Phase 0 Does NOT Include

- No feature modules (health, fitness, projects, etc.)
- No AI integration
- No external API connections (Oura, GA4, etc.)
- No real dashboard widgets with data
- No client or product management
- No file uploads
- No email or SMS sending

These all come in Phases 1-10. Phase 0 is the foundation they build on.

---

## Context: What's Coming Next

After Phase 0, the immediate next phase is:

**Phase 1 (Week 3-4): Project Tracker & Client Workspaces** — This replaces ClickUp. It adds Client/Product CRUD, project management, task management (kanban + list), notes, passive time tracking, client onboarding templates, and the activity feed. This is when the dashboard starts being useful daily.

The full project spec (v4.1, 3,160 lines, 32 modules across 12 phases) is available separately. Phase-specific briefings will be provided for each phase.
