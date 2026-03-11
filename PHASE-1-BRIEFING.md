# Phase 1: Project Tracker & Client Workspaces — Build Briefing

## What This Phase Does

Phase 1 replaces ClickUp. After this phase, Trey manages all projects, tasks, notes, and client work from the Mosaic Life Dashboard. New clients are onboarded with one click. Time spent per client is tracked automatically. Every action across the system is logged to a unified activity feed.

This is the phase that makes the dashboard a daily-use tool.

---

## What Phase 1 Includes

1. **Client CRUD** — create, edit, archive clients with contact info and service toggles
2. **Product CRUD** — create, edit, archive products with module config
3. **Project management** — create projects under any domain (Life, MLC client, product)
4. **Task management** — kanban + list view, priorities, due dates, dependencies
5. **Notes system** — markdown editor, per-client/product/personal, note types
6. **Meeting notes → action pipeline** — AI detects action items, suggests tasks (requires Claude API)
7. **ClickUp import** — one-time migration tool for existing notes
8. **Passive time tracking** — auto-track time per module/client, idle detection
9. **Client onboarding templates** — reusable blueprints, one-click new client setup
10. **Activity feed** — foundational cross-domain activity logging
11. **Dashboard widgets** — replace Phase 0 placeholders with live data (tasks due today, overdue count, active projects)

## What Phase 1 Does NOT Include

- AI Project Manager (project planning, phase generation, materials estimation, contextual Q&A) — that's Phase 4
- Construction project enhancements (measurements, materials calculator, contractors) — Phase 4
- Client profitability calculations (requires QBO integration) — Phase 6
- External API integrations (Oura, GA4, Meta, etc.) — later phases
- Content calendars, WordPress management, analytics — later phases
- Calendar integration — later phases

The Claude API IS used in Phase 1, but only for meeting notes action detection. The full AI chat interface and page-load insights come in Phase 4.

---

## Page Structure & Navigation

Phase 1 activates these sidebar sections. All other nav items remain as "Coming in Phase X" placeholders.

### MLC Section

```
MLC
├── Clients                    → /dashboard/clients
│   ├── Client List            → /dashboard/clients (default view)
│   ├── New Client             → /dashboard/clients/new
│   ├── Client Detail          → /dashboard/clients/[id]
│   │   ├── Overview tab       (contact info, services, quick stats)
│   │   ├── Projects tab       (projects scoped to this client)
│   │   ├── Tasks tab          (tasks across all client projects)
│   │   ├── Notes tab          (notes scoped to this client)
│   │   ├── Time tab           (time entries for this client)
│   │   └── Settings tab       (service toggles, onboarding status)
│   └── Client Edit            → /dashboard/clients/[id]/edit
├── Automations                → remains placeholder (Phase 4)
├── WordPress                  → remains placeholder
├── Content                    → remains placeholder
├── Analytics                  → remains placeholder
├── Email Campaigns            → remains placeholder
└── Communications             → remains placeholder
```

### Products Section

```
PRODUCTS
├── GetShelfed                 → /dashboard/products/[id]
├── ManlyMan                   → /dashboard/products/[id]
├── MLC Website                → /dashboard/products/[id]
└── Grove City Events          → /dashboard/products/[id]

Product Detail Page:
├── Overview tab
├── Projects tab
├── Tasks tab
├── Notes tab
└── Settings tab (module toggles)
```

### Life Section (new pages)

```
LIFE
├── Dashboard                  → /dashboard (already built)
└── (all others remain placeholder)
```

### Global Pages (accessible from header or sidebar)

```
Activity Feed                  → /dashboard/activity
Projects (all)                 → /dashboard/projects
Tasks (all)                    → /dashboard/tasks
Notes (all)                    → /dashboard/notes
Time Tracking                  → /dashboard/time
Onboarding Templates           → /dashboard/onboarding
```

**Note:** The sidebar needs a small update — add a "Projects" and "Activity" entry somewhere logical. Suggestion: add a top-level section above LIFE:

```
COMMAND CENTER
├── Activity Feed
├── All Projects
├── All Tasks
└── Time Report

LIFE
├── Dashboard
├── Health (placeholder)
...
```

This keeps the global/cross-domain views separate from domain-specific navigation.

---

## Data Models (Prisma Schema Additions)

Add all of these to `prisma/schema.prisma`. These are the new tables for Phase 1.

```prisma
// ============================================
// CLIENTS & PRODUCTS
// ============================================

model Client {
  id                String    @id @default(uuid()) @db.Uuid
  name              String    // business name
  contactFirstName  String?   @map("contact_first_name")
  contactLastName   String?   @map("contact_last_name")
  contactEmail      String?   @map("contact_email")
  contactPhone      String?   @map("contact_phone")
  domain            String?   // client's website domain
  address           String?   @db.Text
  notes             String?   @db.Text
  isActive          Boolean   @default(true) @map("is_active")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  services          ClientService[]
  projects          Project[]      @relation("ClientProjects")
  noteEntries       Note[]         @relation("ClientNotes")
  timeEntries       TimeEntry[]    @relation("ClientTimeEntries")
  onboardingRuns    OnboardingRun[]

  @@map("clients")
}

model ClientService {
  id          String   @id @default(uuid()) @db.Uuid
  clientId    String   @map("client_id") @db.Uuid
  serviceType String   @map("service_type")  // wordpress, ga4, social_meta, sendy, notes, projects, twilio_sms, gmb, content_calendar
  config      Json?    @default("{}")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@map("client_services")
}

model Product {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  domain      String?  // product's website domain
  description String?  @db.Text
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  modules     ProductModule[]
  projects    Project[]       @relation("ProductProjects")
  noteEntries Note[]          @relation("ProductNotes")

  @@map("products")
}

model ProductModule {
  id          String   @id @default(uuid()) @db.Uuid
  productId   String   @map("product_id") @db.Uuid
  moduleType  String   @map("module_type")  // admin_panel, analytics, content_mgmt, game_scheduling, event_pipeline, etc.
  config      Json?    @default("{}")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_modules")
}


// ============================================
// PROJECTS & TASKS
// ============================================

model Project {
  id              String    @id @default(uuid()) @db.Uuid
  name            String
  description     String?   @db.Text
  domain          String    // "life", "mlc", "product"
  domainRefId     String?   @map("domain_ref_id") @db.Uuid  // client_id, product_id, or null for personal
  projectType     String    @map("project_type") @default("general")  // general, construction, development, business, creative, learning
  status          String    @default("active")  // active, on_hold, completed, archived
  priority        String    @default("medium")  // low, medium, high, urgent
  dueDate         DateTime? @map("due_date")
  estimatedBudget Decimal?  @map("estimated_budget") @db.Decimal(10, 2)
  actualSpent     Decimal?  @map("actual_spent") @db.Decimal(10, 2)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // AI Project Manager fields — included in schema but NOT used until Phase 4
  aiManaged       Boolean   @default(false) @map("ai_managed")
  aiProjectPlan   Json?     @map("ai_project_plan")
  currentPhaseId  String?   @map("current_phase_id") @db.Uuid

  tasks           Task[]
  phases          ProjectPhase[]

  // Polymorphic relations via domainRefId
  client          Client?   @relation("ClientProjects", fields: [domainRefId], references: [id])
  product         Product?  @relation("ProductProjects", fields: [domainRefId], references: [id])

  @@map("projects")
}

model ProjectPhase {
  id                    String    @id @default(uuid()) @db.Uuid
  projectId             String    @map("project_id") @db.Uuid
  name                  String
  description           String?   @db.Text
  status                String    @default("not_started")  // not_started, in_progress, completed, blocked
  sortOrder             Int       @map("sort_order")
  dependsOnPhaseId      String?   @map("depends_on_phase_id") @db.Uuid
  estimatedDurationDays Int?      @map("estimated_duration_days")
  startedAt             DateTime? @map("started_at")
  completedAt           DateTime? @map("completed_at")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  // AI fields — NOT used until Phase 4
  aiGuidance            String?   @map("ai_guidance") @db.Text
  aiTips                String?   @map("ai_tips") @db.Text

  project               Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks                 Task[]
  dependsOn             ProjectPhase? @relation("PhaseDependency", fields: [dependsOnPhaseId], references: [id])
  dependedOnBy          ProjectPhase[] @relation("PhaseDependency")

  @@map("project_phases")
}

model Task {
  id              String    @id @default(uuid()) @db.Uuid
  projectId       String?   @map("project_id") @db.Uuid
  phaseId         String?   @map("phase_id") @db.Uuid
  title           String
  description     String?   @db.Text
  status          String    @default("todo")  // todo, in_progress, done
  priority        String    @default("medium")  // low, medium, high, urgent
  dueDate         DateTime? @map("due_date")
  sortOrder       Int       @default(0) @map("sort_order")
  dependsOnTaskId String?   @map("depends_on_task_id") @db.Uuid
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  project         Project?  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  phase           ProjectPhase? @relation(fields: [phaseId], references: [id])
  dependsOn       Task?     @relation("TaskDependency", fields: [dependsOnTaskId], references: [id])
  dependedOnBy    Task[]    @relation("TaskDependency")

  @@map("tasks")
}


// ============================================
// NOTES
// ============================================

model Note {
  id                String    @id @default(uuid()) @db.Uuid
  domain            String    // "life", "mlc", "product"
  domainRefId       String?   @map("domain_ref_id") @db.Uuid  // client_id, product_id, or null
  noteType          String    @map("note_type") @default("general")  // general, meeting_notes, reference, checklist
  title             String
  content           String    @db.Text  // markdown content
  isPinned          Boolean   @default(false) @map("is_pinned")
  hasPendingActions Boolean   @default(false) @map("has_pending_actions")
  importedFrom      String?   @map("imported_from")  // "clickup" for migrated notes
  importedAt        DateTime? @map("imported_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  actions           NoteAction[]

  // Polymorphic relations via domainRefId
  client            Client?   @relation("ClientNotes", fields: [domainRefId], references: [id])
  product           Product?  @relation("ProductNotes", fields: [domainRefId], references: [id])

  @@map("notes")
}

model NoteAction {
  id                  String   @id @default(uuid()) @db.Uuid
  noteId              String   @map("note_id") @db.Uuid
  clientId            String?  @map("client_id") @db.Uuid
  detectedText        String   @map("detected_text") @db.Text
  suggestedActionType String   @map("suggested_action_type")  // create_task, add_to_content_calendar, schedule_email, schedule_sms, create_project, add_calendar_event, create_reminder, other
  suggestedActionData Json?    @map("suggested_action_data")
  status              String   @default("pending")  // pending, accepted, dismissed, completed
  executedRefType     String?  @map("executed_ref_type")  // "task", "content_calendar_entry", etc.
  executedRefId       String?  @map("executed_ref_id") @db.Uuid
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  note                Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@map("note_actions")
}


// ============================================
// PASSIVE TIME TRACKING
// ============================================

model TimeEntry {
  id                  String    @id @default(uuid()) @db.Uuid
  clientId            String?   @map("client_id") @db.Uuid
  projectId           String?   @map("project_id") @db.Uuid
  domain              String    // "life", "mlc", "product"
  module              String    // "wordpress", "notes", "content_calendar", "projects", "communication", "analytics", etc.
  activityDescription String    @map("activity_description")  // auto-generated: "Editing BCA content calendar"
  startedAt           DateTime  @map("started_at")
  endedAt             DateTime? @map("ended_at")
  durationMinutes     Int?      @map("duration_minutes")  // computed from started_at and ended_at
  source              String    @default("auto")  // "auto" (inferred from page activity)
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  client              Client?   @relation("ClientTimeEntries", fields: [clientId], references: [id])

  @@map("time_entries")
}


// ============================================
// CLIENT ONBOARDING
// ============================================

model OnboardingTemplate {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   // "New WordPress Client", "Social Media Only", "Full Service"
  description String?  @db.Text
  steps       Json     // ordered list of onboarding actions (see spec for structure)
  isDefault   Boolean  @default(false) @map("is_default")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  runs        OnboardingRun[]

  @@map("onboarding_templates")
}

model OnboardingRun {
  id              String    @id @default(uuid()) @db.Uuid
  templateId      String    @map("template_id") @db.Uuid
  clientId        String    @map("client_id") @db.Uuid
  status          String    @default("in_progress")  // in_progress, completed, failed
  stepsCompleted  Json?     @map("steps_completed") @default("[]")  // tracks which steps succeeded/failed
  startedAt       DateTime  @map("started_at") @default(now())
  completedAt     DateTime? @map("completed_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  template        OnboardingTemplate @relation(fields: [templateId], references: [id])
  client          Client    @relation(fields: [clientId], references: [id])

  @@map("onboarding_runs")
}


// ============================================
// ACTIVITY FEED
// ============================================

model ActivityEntry {
  id            String   @id @default(uuid()) @db.Uuid
  domain        String   // "life", "mlc", "product"
  domainRefId   String?  @map("domain_ref_id") @db.Uuid  // client_id, product_id
  module        String   // "projects", "tasks", "notes", "time_tracking", "onboarding", etc.
  activityType  String   @map("activity_type")  // created, updated, completed, sent, published, synced, logged, generated, approved, dismissed
  title         String   // short: "Created project 'BCA Website Redesign'"
  description   String?  @db.Text
  refType       String?  @map("ref_type")  // "task", "project", "note", "client", "time_entry", etc.
  refId         String?  @map("ref_id") @db.Uuid
  createdAt     DateTime @default(now()) @map("created_at")
  // No updatedAt — activity entries are immutable

  @@map("activity_entries")
}
```

### Important Prisma Notes

- **Polymorphic relations:** `Project.domainRefId` and `Note.domainRefId` can point to either a Client or a Product. Prisma doesn't natively support polymorphic relations perfectly. The `domain` field ("life", "mlc", "product") disambiguates which relation to follow. You may need to make one of the two relations optional or handle this at the application level rather than with Prisma's relation directives. If the dual `@relation` causes Prisma errors, remove the explicit relation decorators and handle lookups manually in the API layer.
- **AI fields on Project/ProjectPhase** are included in the schema now but NOT used in Phase 1 UI. This avoids a schema migration later.
- Run `npx prisma migrate dev --name phase1-project-tracker` after adding these models.

---

## API Routes

All routes under `src/app/api/`. All require authentication (handled by middleware). All return `{ data: T }` on success, `{ error: string }` on failure. Validate input with Zod.

### Clients API

```
GET    /api/clients              — List all clients (with optional ?active=true filter)
POST   /api/clients              — Create client
GET    /api/clients/[id]         — Get client detail (include services)
PUT    /api/clients/[id]         — Update client
DELETE /api/clients/[id]         — Archive client (soft delete: set is_active=false)

GET    /api/clients/[id]/services    — List services for client
POST   /api/clients/[id]/services    — Toggle/add service
PUT    /api/clients/[id]/services/[serviceId]  — Update service config
```

### Products API

```
GET    /api/products             — List all products
POST   /api/products             — Create product
GET    /api/products/[id]        — Get product detail (include modules)
PUT    /api/products/[id]        — Update product
DELETE /api/products/[id]        — Archive product (soft delete)

GET    /api/products/[id]/modules    — List modules for product
POST   /api/products/[id]/modules    — Add module
PUT    /api/products/[id]/modules/[moduleId]  — Update module config
```

### Projects API

```
GET    /api/projects             — List projects (filters: ?domain=mlc&client_id=x&status=active)
POST   /api/projects             — Create project
GET    /api/projects/[id]        — Get project detail (include phases, task counts)
PUT    /api/projects/[id]        — Update project
DELETE /api/projects/[id]        — Archive project (set status=archived)

GET    /api/projects/[id]/phases     — List phases for project
POST   /api/projects/[id]/phases     — Create phase (manual — AI phase generation is Phase 4)
PUT    /api/projects/[id]/phases/[phaseId]  — Update phase
```

### Tasks API

```
GET    /api/tasks                — List tasks (filters: ?project_id=x&status=todo&due_before=date&priority=high)
POST   /api/tasks                — Create task
GET    /api/tasks/[id]           — Get task detail
PUT    /api/tasks/[id]           — Update task (status, priority, description, due date, sort order)
DELETE /api/tasks/[id]           — Delete task
PUT    /api/tasks/reorder        — Batch update sort orders (for drag-and-drop in kanban)
```

### Notes API

```
GET    /api/notes                — List notes (filters: ?domain=mlc&domain_ref_id=x&note_type=meeting_notes&pinned=true)
POST   /api/notes                — Create note
GET    /api/notes/[id]           — Get note detail (include actions)
PUT    /api/notes/[id]           — Update note
DELETE /api/notes/[id]           — Delete note
POST   /api/notes/[id]/detect-actions  — Run AI action detection on note content (Claude API)

GET    /api/notes/actions        — List pending note actions (across all notes)
PUT    /api/notes/actions/[id]   — Accept or dismiss an action
POST   /api/notes/actions/[id]/execute — Execute an accepted action (creates the task/event/etc.)
```

### Time Tracking API

```
POST   /api/time/heartbeat       — Frontend sends heartbeat every 60 seconds with current module/client context
GET    /api/time                  — List time entries (filters: ?client_id=x&date_from=x&date_to=x)
GET    /api/time/summary          — Aggregated time per client/module for a date range
```

### Onboarding API

```
GET    /api/onboarding/templates          — List templates
POST   /api/onboarding/templates          — Create template
PUT    /api/onboarding/templates/[id]     — Update template
DELETE /api/onboarding/templates/[id]     — Delete template

POST   /api/onboarding/run                — Execute template for a client (body: { templateId, clientId })
GET    /api/onboarding/runs               — List past runs
GET    /api/onboarding/runs/[id]          — Get run detail with step status
```

### Activity Feed API

```
GET    /api/activity              — List activity entries (filters: ?domain=mlc&domain_ref_id=x&module=projects&activity_type=completed&date_from=x&date_to=x&search=keyword)
```

Activity entries are created server-side whenever anything happens (task created, project updated, note saved, etc.). They're never created directly by the frontend.

### ClickUp Import API

```
POST   /api/import/clickup        — Upload ClickUp export file (CSV/JSON), transform and import as Notes
GET    /api/import/clickup/status  — Check import status
```

### Dashboard Widgets API

```
GET    /api/dashboard/widgets     — Returns all widget data in one call:
                                    - tasks due today (count + list)
                                    - overdue tasks (count)
                                    - active projects (count + list)
                                    - recent activity (last 5 entries)
                                    - time tracked today (total minutes)
```

---

## Feature Specifications

### 1. Client Management

**Client List Page** (`/dashboard/clients`)
- Table view with columns: Name, Contact, Domain, Services (badges), Status, Created
- Search/filter bar (search by name, filter by active/archived)
- "New Client" button → create form
- Click row → client detail page

**Client Detail Page** (`/dashboard/clients/[id]`)
- Tabbed layout: Overview | Projects | Tasks | Notes | Time | Settings
- **Overview tab:** Contact info card, active services as badges, quick stats (open tasks, active projects, hours this month)
- **Projects tab:** List of projects scoped to this client, "New Project" button
- **Tasks tab:** All tasks across all client projects, filterable by status/priority
- **Notes tab:** Notes scoped to this client, "New Note" button, note type filter
- **Time tab:** Time entries for this client, daily/weekly/monthly totals, simple bar chart
- **Settings tab:** Service toggle switches (wordpress, ga4, social, etc.), onboarding history

**Client Create/Edit Form**
- Fields: business name, contact first/last name, email, phone, domain, address, notes
- Service selection checkboxes on create (optional — can be configured later)
- Save → creates client → redirects to detail page
- Activity entry logged: "Created client 'BCA Mechanical'"

### 2. Product Management

**Product pages mirror Client pages** but simpler — no services, instead they have "modules" (admin panel, analytics, content management, game scheduling, event pipeline, etc.).

Products are pre-seeded on first run:
- GetShelfed (getshelfed.com)
- ManlyMan (manlyman.men)
- MLC Website (mosaiclifecreative.com)
- Grove City Events (no domain yet)
- Web Dev Tools (webdevtools.dev or null)

### 3. Project Management

**All Projects Page** (`/dashboard/projects`)
- Card or table view showing all projects across all domains
- Filters: domain, status, priority, client/product
- Sort by: due date, priority, last updated
- "New Project" button

**Project Detail Page** (`/dashboard/projects/[id]`)
- Project header: name, status badge, priority badge, domain/client/product breadcrumb, due date
- **Phase list** (if project has phases): collapsible sections showing phase status, tasks per phase
- **Task board:** Two views toggled by button:
  - **Kanban:** Three columns (To Do | In Progress | Done), drag-and-drop cards
  - **List view:** Sortable table with status, priority, due date
- **Add Task** quick-add at top (just title + enter, expands for details)
- Progress bar showing completed tasks / total tasks

**Project Create Form**
- Fields: name, description, domain (dropdown: Life/MLC/Product), associated client or product (conditional dropdown), project type, priority, due date, estimated budget
- On save → creates project → redirects to project detail
- Activity logged

### 4. Task Management

**Task Card (Kanban)**
- Title, priority badge (color-coded), due date (red if overdue), project name
- Click to expand inline or open detail modal
- Drag between columns to change status

**Task Detail (Modal or Inline Expand)**
- Title (editable inline)
- Description (markdown, editable)
- Status dropdown
- Priority dropdown
- Due date picker
- Project assignment (change or make standalone)
- Phase assignment (if project has phases)
- Dependency (select another task this depends on)
- Created date, last updated date
- Delete button (with confirmation)

**All Tasks Page** (`/dashboard/tasks`)
- Unified view of ALL tasks across all projects
- Filters: status, priority, due date range, project, client
- Sort by: due date, priority, status, created date
- Bulk actions: mark done, change priority (stretch goal — nice to have, not required)

**Standalone Tasks**
- Tasks can exist without a project — quick to-dos
- Created from the All Tasks page or dashboard

### 5. Notes System

**All Notes Page** (`/dashboard/notes`)
- List view with title, note type badge, domain/client, created/updated dates, pinned status
- Filter by: domain, note type, client/product, pinned
- Search notes (title + content)
- "New Note" button

**Note Editor Page** (`/dashboard/notes/[id]`)
- Title input
- Note type selector (general, meeting notes, reference, checklist)
- Domain/client/product selector
- **Markdown editor** — use a library like `@uiw/react-md-editor` or similar. Must support:
  - Live preview (split or toggle)
  - Basic formatting toolbar (bold, italic, headers, lists, code blocks, links)
  - Reasonable default styling
- Pin/unpin toggle
- Save button (Ctrl+S shortcut too)
- **For meeting notes:** After saving, show a "Detect Actions" button that sends content to the AI

**Meeting Notes → Action Pipeline**
- When user clicks "Detect Actions" on a meeting note:
  1. Send note content to Claude API via `/api/notes/[id]/detect-actions`
  2. Claude analyzes the text and identifies action items
  3. Returns structured actions: tasks to create, content to schedule, emails to draft, reminders to set
  4. Actions are saved as `NoteAction` records with status "pending"
  5. UI shows a panel/section below the note listing detected actions
  6. Each action shows: detected text excerpt, suggested action type, suggested details
  7. User can **Accept** (creates the task/etc.) or **Dismiss** each action
  8. Accepted actions link back to the note via `executedRefType` and `executedRefId`
  9. Note's `hasPendingActions` badge shows on the notes list until all actions are handled

**Claude API Prompt for Action Detection:**

```
You are analyzing meeting notes for a small WordPress agency called Mosaic Life Creative. 
The owner (Trey) takes notes during client meetings and internal planning sessions.

Analyze the following meeting notes and identify any actionable items. For each action item, return:
- detected_text: the exact excerpt from the notes that indicates an action
- suggested_action_type: one of "create_task", "add_to_content_calendar", "schedule_email", "create_reminder", "other"
- suggested_action_data: structured JSON with details (title, due date if mentioned, priority, assigned client if applicable)

Only identify clear, concrete action items. Do not flag general discussion points.

Return JSON array of actions. If no actions found, return empty array.

Meeting Notes:
---
{note_content}
---
```

### 6. ClickUp Import

**Import Page** (`/dashboard/import/clickup`)
- File upload area (accepts CSV or JSON export from ClickUp)
- After upload: preview of detected notes with mapping
- User confirms import → notes created with `importedFrom: "clickup"` and `importedAt` timestamp
- One-time tool — this page can be simple/functional, doesn't need to be polished

### 7. Passive Time Tracking

**How It Works:**
- The authenticated dashboard layout (`/dashboard/layout.tsx`) includes a time tracking provider/context
- Every 60 seconds, the frontend sends a heartbeat to `/api/time/heartbeat` with:
  - Current page/route
  - Inferred module (parsed from the route: `/dashboard/clients/[id]/notes` → module: "notes", client_id: [id])
  - Timestamp
- The backend creates or extends a `TimeEntry`:
  - If there's an active entry for the same module/client within the last 2 minutes → extend it (update `endedAt`)
  - If there's a gap > 2 minutes → close the old entry and start a new one
  - Idle detection: if no heartbeat for 5+ minutes, the previous entry is closed
- `durationMinutes` is computed from `startedAt` and `endedAt` on read

**Frontend Implementation:**
```typescript
// TimeTrackingProvider wraps the dashboard layout
// Uses usePathname() to detect current route
// Sends POST /api/time/heartbeat every 60 seconds
// Detects idle: if document.hidden or no mouse/keyboard for 5 min, stop sending heartbeats
// On route change, send immediate heartbeat with new context
```

**Time Report Page** (`/dashboard/time`)
- Date range picker (default: this week)
- Breakdown by client: bar chart + table showing hours per client
- Breakdown by module: how time is distributed across activities
- Daily totals
- Click into a client → see individual time entries

### 8. Client Onboarding Templates

**Templates Page** (`/dashboard/onboarding`)
- List of templates with name, description, step count, default badge
- "New Template" button
- Click → edit template

**Template Editor**
- Name, description
- **Step builder** — ordered list of steps. Each step has:
  - Action type dropdown: create_workspace, enable_service, create_project, create_tasks, send_welcome_email, other
  - Configuration fields that change based on action type
  - Drag to reorder
  - Delete step
- "Set as Default" toggle
- Save

**Executing Onboarding**
- From a client's detail page (Settings tab) or from the onboarding page
- Select client + template → "Run Onboarding" button
- Backend executes each step in order:
  - `enable_service` → creates ClientService records
  - `create_project` → creates a Project under the client
  - `create_tasks` → creates Tasks under the project
  - Other steps → logged as manual to-dos
- Progress shown in real-time (or after completion)
- Results page shows what was created and any steps that need manual action

**For Phase 1:** The onboarding system can scaffold client services, projects, and tasks. Steps that depend on features from later phases (install WP plugin, connect GA4, create content calendar) should be logged as manual to-do tasks rather than automated. They'll become automated when those phases are built.

### 9. Activity Feed

**Activity Page** (`/dashboard/activity`)
- Chronological feed (newest first)
- Each entry: icon (based on activity type), title, timestamp, domain/client badge
- Click → navigate to the source record
- Filters: domain, module, activity type, date range
- Search
- Infinite scroll or pagination

**Server-Side Logging:**
Create a utility function that all API routes use to log activity:

```typescript
// src/lib/activity.ts
export async function logActivity(params: {
  domain: string;
  domainRefId?: string;
  module: string;
  activityType: string;
  title: string;
  description?: string;
  refType?: string;
  refId?: string;
}) {
  await prisma.activityEntry.create({ data: params });
}
```

Call this in every create/update/delete/complete API handler. Examples:
- Task created: `logActivity({ domain: "mlc", domainRefId: clientId, module: "tasks", activityType: "created", title: "Created task 'Update homepage hero'", refType: "task", refId: taskId })`
- Project completed: `logActivity({ ... activityType: "completed", title: "Completed project 'BCA Website Redesign'" })`
- Note saved: `logActivity({ ... activityType: "updated", title: "Updated meeting notes 'BCA Q1 Planning'" })`

### 10. Dashboard Widget Updates

Replace the Phase 0 placeholder cards with live data widgets. The dashboard home page should show:

**Row 1: Quick Stats**
- Tasks Due Today (count, click to see list)
- Overdue Tasks (count, red if > 0, click to see list)
- Active Projects (count, click to see list)
- Hours Tracked Today (from time entries)

**Row 2: Tasks Due Today**
- List of tasks due today with project name, priority badge, checkbox to complete
- "View All Tasks" link

**Row 3: Recent Activity**
- Last 10 activity entries with icon, title, time ago
- "View All Activity" link

**Remaining placeholder widgets** stay for future phases (Oura, Sleep, Meals, Health, etc.)

---

## Environment Variables (New)

Add to `.env.local` and Vercel:

```env
# Claude API (for meeting notes action detection)
ANTHROPIC_API_KEY=sk-ant-...
```

This is the only new env var for Phase 1.

---

## Definition of Done — Phase 1

- [ ] Client CRUD works (create, edit, archive, list, detail page with tabs)
- [ ] Product CRUD works (create, edit, archive, list, detail page)
- [ ] Five products pre-seeded (GetShelfed, ManlyMan, MLC Website, Grove City Events, Web Dev Tools)
- [ ] Project CRUD works with domain/client/product assignment
- [ ] Tasks work: create, edit, delete, status changes, priorities, due dates
- [ ] Kanban view works with drag-and-drop between columns
- [ ] List view works with sorting and filtering
- [ ] Standalone tasks (no project) can be created
- [ ] Notes CRUD works with markdown editor and live preview
- [ ] Note types (general, meeting, reference, checklist) can be selected
- [ ] Meeting notes → "Detect Actions" button calls Claude API and returns structured actions
- [ ] Detected actions appear below the note with accept/dismiss buttons
- [ ] Accepting a "create_task" action creates a real task
- [ ] ClickUp import page accepts CSV/JSON and creates notes with import metadata
- [ ] Passive time tracking runs in background (heartbeat every 60s)
- [ ] Time entries are created/extended automatically based on navigation
- [ ] Idle detection stops tracking after 5 min inactivity
- [ ] Time report page shows breakdown by client and module
- [ ] Onboarding templates can be created with ordered steps
- [ ] Running an onboarding template scaffolds services, projects, and tasks for a client
- [ ] Activity feed logs all creates/updates/completions across the system
- [ ] Activity page shows filterable, searchable chronological feed
- [ ] Dashboard homepage shows live widgets: tasks due, overdue count, active projects, recent activity
- [ ] Sidebar updated with new nav structure (Command Center section)
- [ ] All new pages are responsive
- [ ] All activity is logged to the activity feed
- [ ] All changes pushed and deployed to Vercel

---

## Build Order Recommendation

Don't build everything at once. Suggested order:

1. **Database first** — Add all Prisma models, run migration
2. **Client CRUD** — API routes + list/detail pages (foundation for everything else)
3. **Product CRUD** — Similar pattern, quick win
4. **Project CRUD** — Create, list, detail pages
5. **Task management** — CRUD + kanban + list views (this is the daily workhorse)
6. **Notes system** — CRUD + markdown editor
7. **Meeting notes AI** — Claude API integration for action detection
8. **Activity feed** — Add logging utility, retrofit into all existing API handlers, build feed page
9. **Passive time tracking** — Heartbeat provider + API + time report page
10. **Onboarding templates** — Template builder + execution engine
11. **ClickUp import** — Simple upload + transform tool
12. **Dashboard widgets** — Replace placeholders with live data
13. **Sidebar update** — Add Command Center section

Each step builds on the previous one. Test as you go.
