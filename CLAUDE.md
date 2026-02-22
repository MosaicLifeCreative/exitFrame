# CLAUDE.md — Mosaic Life Dashboard

## Project Overview

Single-user command center for Trey (Mosaic Life Creative). Manages personal life (health, fitness, diet, finances, goals, custom trackers) and MLC business operations (WordPress agency, client management, analytics, content calendars, event pipeline). Replaces ClickUp, Trello, Airtable, Mealime, and Zapier.

**Only one user ever logs in.** There is no multi-tenancy, no user management, no sign-up flow. Auth is email/password + TOTP 2FA. Failed auth redirects to fbi.gov. Trusted device support allows skipping TOTP on recognized browsers (cookie + Redis hash, 90-day TTL).

## Tech Stack

- **Framework:** Next.js 14+ (App Router), TypeScript (strict)
- **Styling:** Tailwind CSS + Shadcn/ui (Radix primitives)
- **Database:** Supabase (PostgreSQL) via Prisma ORM
- **Auth:** Supabase Auth (email/password + TOTP 2FA)
- **Storage:** Supabase Storage (images, documents, exports)
- **Cache / Jobs:** Upstash Redis + BullMQ
- **AI:** Claude API (Anthropic) — chat, vision, analysis, content generation
- **Hosting:** Vercel (auto-deploy from GitHub)
- **Charts:** Recharts

## Code Conventions

### TypeScript
- Strict mode, no `any` types unless absolutely unavoidable (and add a comment explaining why)
- Use interfaces over types for object shapes
- Named exports, not default exports (except for Next.js pages/layouts which require default)

### File Naming
- Components: PascalCase (`LoginForm.tsx`, `Sidebar.tsx`)
- Utilities/libs: camelCase (`redis.ts`, `prisma.ts`)
- API routes: kebab-case folders following Next.js App Router conventions
- Prisma models: PascalCase in schema, snake_case for table/column names via `@@map` and `@map`

### Components
- Functional components only, no class components
- Use Shadcn/ui components as the base — don't reinvent buttons, inputs, dialogs, etc.
- Keep components focused — if a component exceeds ~150 lines, consider splitting
- Colocate component-specific types in the same file

### Styling
- Tailwind utility classes for all styling
- No CSS modules, no styled-components, no inline style objects
- Use Tailwind's `dark:` variants for dark mode support
- Use `cn()` utility (from Shadcn) for conditional class merging

### API Routes
- All API routes under `src/app/api/`
- Every route is authenticated — check session in middleware, not per-route
- Return consistent JSON shape: `{ data: T }` on success, `{ error: string }` on failure
- Use appropriate HTTP status codes
- Validate input with Zod schemas

### Database
- Prisma for all database access — no raw SQL unless Prisma can't express the query
- All table names snake_case via `@@map("table_name")`
- All column names snake_case via `@map("column_name")`
- UUIDs for all primary keys
- Always include `createdAt` and `updatedAt` (mapped to `created_at` and `updated_at`)
- Use Prisma migrations — never modify the database directly

### Error Handling
- Try/catch in API routes, return structured error responses
- Log errors server-side with context (what was being attempted, relevant IDs)
- Never expose internal error details to the client
- Use toast notifications (Shadcn's Sonner) for user-facing errors

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # REST API endpoints
│   ├── login/        # Login page
│   ├── auth/         # Auth flows (callback, TOTP)
│   └── dashboard/    # All authenticated pages
├── components/       # React components
│   ├── ui/           # Shadcn/ui primitives (installed via CLI)
│   ├── layout/       # Sidebar, Header, MainContent
│   └── [module]/     # Module-specific components (auth/, health/, projects/, etc.)
├── lib/              # Shared utilities
│   ├── supabase/     # Supabase client configs
│   ├── prisma.ts     # Prisma client singleton
│   ├── redis.ts      # Upstash Redis client
│   ├── trustedDevice.ts # Trusted device constants + SHA-256 hash utility
│   └── utils.ts      # General utilities (cn, formatters, etc.)
├── middleware.ts      # Next.js middleware (auth gating)
└── styles/
    └── globals.css   # Tailwind base
```

## Architecture Rules

- **API-first:** All data access goes through API routes. Components fetch from `/api/*`, never import Prisma directly in client components. This ensures the future Android app can use the same endpoints.
- **Server components by default:** Use Next.js server components where possible. Only use `"use client"` when the component needs interactivity (forms, state, event handlers).
- **No secrets on the client:** `NEXT_PUBLIC_` prefix only for Supabase URL and anon key. Everything else stays server-side.
- **Middleware protects routes:** The Next.js middleware checks auth for all `/dashboard/*` routes. Individual API routes don't need to re-check. Middleware also checks trusted device cookies (via Redis) to allow AAL1 sessions through without TOTP.
- **Trusted device flow:** After TOTP verification, user can check "Trust this browser". A random token is set as an httpOnly cookie, its SHA-256 hash stored in Redis with 90-day TTL. Middleware accepts valid trusted device cookies as equivalent to AAL2. `/api/auth/check-trust` is exempt from MFA checks so the login page can detect trust before showing TOTP.

## Design Principles

- **Login screen:** Dark military/classified terminal aesthetic. Monospace fonts, near-black background, muted green or amber accents. No branding. Failed auth → fbi.gov redirect.
- **Dashboard:** Clean, modern, sleek. Stark contrast to the login. Dark mode default, light mode available. Left sidebar navigation, header with user menu and Cmd+K palette.
- **No clutter.** White space is a feature. Progressive disclosure — summaries first, drill down on click.
- **Desktop-primary** but responsive. Mobile companion app comes later (Phase 11).

## Development Environment

- Trey uses **Git Bash (MINGW64) on Windows** — use forward slashes in paths, `source` for activate commands
- **VS Code** with Claude Code
- **Node.js v24.13.1**
- Local dev: `npm run dev` on `localhost:3000`
- **Env files:** Both `.env` and `.env.local` are needed locally. Prisma reads from `.env` (for `DATABASE_URL`, `DIRECT_URL`). Next.js reads from `.env.local` (for all vars including `NEXT_PUBLIC_*`). Neither is committed.

## Phased Build

This project is built in 12 phases. Each phase has its own briefing document. **Only build what the current phase briefing specifies.** Do not add tables, endpoints, or features from future phases unless the current briefing explicitly includes them.

The full project specification (v4.1, 32 modules) exists as reference but is NOT the build instruction. Phase briefings are the build instructions.

## Git Workflow

- `main` branch is production (auto-deploys to Vercel)
- Commit frequently with descriptive messages
- Don't commit `.env.local` or any secrets
- `.env.example` should always reflect the current required variables
