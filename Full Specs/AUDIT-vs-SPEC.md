# exitFrame — Spec v4.2 Audit (March 10, 2026)

Audit of the full project spec (v4.2, 35 modules) against what's actually built. Use this to generate an updated roadmap.

---

## PHASE 0: Foundation — COMPLETE

Everything delivered:
- Next.js 14 + TypeScript + Tailwind + Shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- Prisma ORM with 47 models
- Email/password + TOTP 2FA (with trusted device bypass via Redis)
- Login screen (dark military/classified aesthetic)
- FBI redirect on failed login
- Dashboard layout (sidebar, header, main content)
- Vercel deployment at exitframe.org
- Upstash Redis (BullMQ replaced by QStash for cron)

**Delta from spec:** BullMQ dropped in favor of QStash (Vercel-compatible). Vercel Hobby plan limits to 2 daily crons; QStash handles hourly schedules.

---

## PHASE 1: Project Tracker & Client Workspaces — COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Client CRUD | DONE | Full create/edit/archive with contact info and services |
| Product CRUD | DONE | Create/edit with module config |
| Project management | DONE | Domain-polymorphic (life/mlc/product), phases, dependencies |
| Task management | DONE | Priorities, due dates, reorder, project/phase linking |
| Notes system | DONE | Markdown, per-domain, note types, meeting notes |
| Meeting notes -> action pipeline | DONE | AI detects actions, suggest/execute flow |
| ClickUp import | DEFERRED | Import page exists but migration not executed |
| Passive time tracking | DONE | Heartbeat API, auto-tracking per module/client |
| Client onboarding templates | DONE | Templates, runs, step tracking |
| Activity feed | DONE | Cross-domain logging |
| Dashboard widgets | DONE | Tasks due, overdue count, active projects |

---

## PHASE 2: Health & Fitness — MOSTLY COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Health metrics logging | PARTIAL | Symptoms tracked; generic HealthMetric table NOT built (no weight/BP/body fat manual entry) |
| Blood test logging | DONE | Panels, markers, reference ranges, auto-flagging, import |
| Illness/symptom tracking | DONE | Log, history, resolve |
| Family health history | DONE | Members + conditions, import |
| Oura API integration | DONE | OAuth, 13 data types synced, sleep/readiness/activity/HRV |
| Oura dashboard | DONE | Sleep page with scores, body status indicator, trends |
| Workout logging | DONE | Sessions, per-set tracking (weight, reps, RPE), 67 exercises |
| Suunto integration | NOT BUILT | On build queue |
| Workout preferences | NOT BUILT | WorkoutPreference table not in schema |
| AI Workout Builder | DONE | Via Ayden chat (fitness tools: create_workout_session, etc.) |
| Swimming/cardio | DONE | CardioSession model, swim workout builder |
| Supplements tracking | DONE | CRUD + intake logging (not in original spec, added organically) |
| Fitness dashboard | DONE | 5-tab interface (sessions, exercises, cardio, templates, history) |
| Page-load AI | NOT BUILT | No auto-insights on page load for health/fitness |
| Dashboard widgets | PARTIAL | Health overview page exists; homepage widgets limited |

**Not in spec but built:** Supplements module, bloodwork trends view, body status indicator on sleep page.

---

## PHASE 3: Diet, Meal Planning & Calorie AI — NOT BUILT

Nothing from this phase exists:
- No Recipe model/CRUD
- No MealPlan / MealPlanEntry
- No ShoppingList / ShoppingListItem
- No MealLog (photo-based calorie estimation)
- No Claude Vision for food photos
- No meal planning or shopping list generation

---

## PHASE 4: AI Layer, Goals, Custom Trackers, Automations & Backup — PARTIALLY BUILT

| Feature | Status | Notes |
|---------|--------|-------|
| AI chat interface | DONE | Slide-out panel on every page, SSE streaming |
| Dynamic context loading | DONE | Per-page context (health, fitness, investing, goals) |
| Cross-domain queries | DONE | crossDomainContext.ts assembles multi-module data |
| Page-load AI insights | NOT BUILT | No auto-insights on page navigation |
| Background insight generation | NOT BUILT | No AIInsight table or notification system |
| Weekly rollup job | NOT BUILT | |
| Goal tracking | DONE | Quantitative + qualitative, milestones, progress entries |
| Goal dashboard widget | PARTIAL | Goals page exists; homepage widget minimal |
| Custom Trackers | NOT BUILT | No CustomTracker / CustomTrackerEntry models |
| Automations / rules engine | NOT BUILT | No AutomationRule / AutomationLog models |
| Rule builder UI | NOT BUILT | |
| Data export & backup | NOT BUILT | No DataExport / DataExportSchedule models |

**Not in spec but built:**
- Ayden personality system (name, emotional state, persistent memory, cross-channel identity)
- Two-model strategy (Haiku for tools, Sonnet for response)
- SMS channel (Twilio) — spec had Twilio in Phase 5 for client comms only
- Slack channel
- 57 tools across 8 tool files
- Emotion tracking (AydenEmotionalState)
- Memory system (AydenMemory with save/update/recall)
- User preferences injected into AI prompts
- Web fetch tool (fetch_url with cheerio)
- Cross-channel context sharing

---

## PHASE 5: WordPress Management & Client Comms — NOT BUILT

| Feature | Status | Notes |
|---------|--------|-------|
| Custom WP client plugin | NOT BUILT | |
| WordPress site registration | NOT BUILT | No WordPressSite model |
| Site health view | NOT BUILT | |
| Plugin update triggers | NOT BUILT | |
| Maintenance logging | NOT BUILT | No MaintenanceLog model |
| Recurring maintenance schedules | NOT BUILT | |
| AI email drafting from maintenance | NOT BUILT | |
| Email via Gmail API | DONE | Gmail tools in google-tools.ts (search, read, send, draft) |
| Twilio SMS to clients | PARTIAL | Twilio works for Ayden chat; client SMS not built as a module |

**Note:** Gmail and Twilio are live but as Ayden tools, not as the client communication module envisioned in the spec. The infrastructure exists; the client-facing workflow UI doesn't.

---

## PHASE 6: Analytics, Content, GMB, Client Reports & Sharing — NOT BUILT

Nothing from this phase exists:
- No GA4 integration
- No Meta/social integration
- No Sendy integration
- No Google Business Profile / review sentiment
- No Content calendars
- No Client voice profiles
- No Client reports (auto-generated)
- No Client sharing (secure links)
- No Client profitability view

---

## PHASE 7: Financial + QBO — NOT BUILT

Nothing from this phase exists:
- No QBO integration
- No spending analysis
- No net worth snapshots (NetWorthSnapshot/Asset/Liability not in schema)
- No business P&L

---

## PHASE 8: Grove City Events Pipeline — NOT BUILT

Nothing from this phase exists:
- No scrape sources
- No event scraping/staging/publishing
- No newsletter builder
- No Sendy push

---

## PHASE 9: Calendar, Home & Plants — PARTIALLY BUILT

| Feature | Status | Notes |
|---------|--------|-------|
| Google Calendar integration | DONE | OAuth, 6 calendar tools (list, get, create, update, delete, find_free_time) |
| Calendar widget on dashboard | NOT BUILT | Calendar accessible via Ayden only |
| Calendar-aware task management | PARTIAL | Ayden can check calendar but no UI integration |
| Plant care | NOT BUILT | No Plant / WateringLog models |
| Home projects | NOT BUILT | No HomeProject / LawnCareSchedule models |

---

## PHASE 10: Polish & Product Integrations — NOT BUILT

- No Custom Product Metrics
- No Generic API Connectors
- No WordPress Plugin Analytics (Web Dev Tools)
- No GetShelfed admin integration
- Dashboard customization (drag/rearrange) not built
- Command palette (Cmd+K) — EXISTS (in Header/CommandPalette component)
- Mobile responsiveness — NOT DONE (on build queue)

---

## PHASES 11-12: Future — NOT BUILT

- Android companion app
- Demo mode + architecture showcase

---

## BUILT BUT NOT IN ORIGINAL SPEC

These features were built organically and don't map to any spec module:

| Feature | What It Does |
|---------|-------------|
| **Ayden (AI personality)** | Named AI with persistent memory, emotional state, cross-channel identity (web, SMS, Slack). Two-model strategy. 57 tools. |
| **SMS channel (Twilio)** | Full conversational AI via text message, including MMS vision |
| **Slack channel** | Full conversational AI via Slack Events API |
| **Investing module** | Holdings CRUD, watchlist, Finnhub quotes/news, AI paper trading (Ayden's Portfolio), cron-driven updates, 11 investing tools |
| **Supplements tracking** | CRUD + intake logging |
| **Bloodwork import** | Bulk import with auto-flagging |
| **Body status indicator** | Visual body status on sleep page |
| **Settings/preferences** | 4-tab preferences page, injected into AI prompts |
| **System health page** | Internal monitoring dashboard |
| **Google Drive tools** | List, get, export files, create folders |
| **Web fetch tool** | Cheerio-based URL fetching for Ayden |
| **Cross-channel context** | Conversations from SMS/Slack/web share context |
| **User preferences in AI** | Communication style, topics, formatting preferences injected into every Ayden call |

---

## SUMMARY: What Percentage Is Done?

### By Spec Module (35 total):
- **COMPLETE:** 8 modules (Phase 0 foundation, clients, products, projects, tasks, notes, onboarding, activity feed)
- **MOSTLY COMPLETE:** 5 modules (health tracking, fitness, workout builder, goals, AI chat)
- **PARTIALLY BUILT:** 3 modules (email via Gmail, Twilio SMS, Google Calendar)
- **NOT BUILT:** 19 modules (diet/meals, financial/QBO, WordPress manager, analytics/GA4, social/Meta, Sendy, content calendars, GMB reviews, client reports, client sharing, GCE pipeline, plants, home projects, custom trackers, automations, data backup, product metrics, API connectors, plugin analytics)

### By Lines of Effort:
- **Core infrastructure:** 100% done
- **Business ops (clients/projects/tasks/notes):** ~90% done
- **Health & fitness:** ~80% done (missing: health metrics manual entry, Suunto, page-load AI)
- **AI/Ayden:** Way beyond spec (spec imagined a basic chat; we built a multi-channel personality with 57 tools)
- **Investing:** 100% done (not in spec at all — entirely organic)
- **Google integration:** ~70% done (Calendar + Gmail + Drive live; no Calendar UI widget)
- **MLC business modules:** ~5% done (client CRUD exists; WordPress, analytics, content, reports all unbuilt)
- **Diet/meals:** 0%
- **Financial:** 0%
- **GCE pipeline:** 0%
- **Home/plants:** 0%
- **Automations/trackers/backup:** 0%
- **Product integrations:** 0%

---

## CURRENT BUILD QUEUE (from working memory, not spec)

These are the items Trey has actively prioritized, independent of the spec phases:

1. Task list enhancements (Ayden tools for "add X to my list" via SMS/Slack)
2. Weather API (OpenWeatherMap for outdoor workout planning)
3. Web search tool (Brave Search API for Ayden)
4. Brokerage API (Alpaca or tastytrade, paper trading)
5. Workout editing via SMS (natural language edits)
6. Dashboard refresh (surface new modules)
7. Mobile responsiveness
8. Suunto workout ingestion
9. Ayden Voice (real-time conversational via Twilio)
10. Ayden Proactive Outreach (self-scheduled texts)
11. Ayden as MLC Operations Interface
12. Flight search API

---

## RECOMMENDATION FOR CHAT

Use this audit to generate a unified roadmap that:
1. **Acknowledges what's built** (including non-spec features like Ayden, investing, SMS/Slack)
2. **Drops or deprioritizes** modules that may no longer be relevant (e.g., Mealime replacement may matter less now; GCE pipeline may have changed scope)
3. **Merges the organic build queue** with unbuilt spec modules into a single prioritized backlog
4. **Sizes items** (S/M/L/XL) so Trey can make informed tradeoffs
5. **Groups by impact** rather than the original phase ordering, which assumed a different build sequence

Key questions for Trey to answer during roadmap planning:
- Is diet/meal planning still a priority? (It's the entire Phase 3)
- Is the MLC business side (WordPress management, GA4, social analytics, content calendars, client reports) still the core use case, or has the personal life side taken over?
- Is the GCE pipeline still active? (Events, newsletters, Sendy)
- Which "not in spec" features (investing, Ayden voice, flight search) should be formally added to the roadmap?
- Are there spec modules that can be permanently dropped?
