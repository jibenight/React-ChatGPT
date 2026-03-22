# ChatBot AI — Multi-Provider AI Chatbot

Full-stack multi-provider AI chatbot with a SaaS monetization system. Supports OpenAI, Gemini, Claude, Mistral, and Groq. Available as a web app and as a native desktop app (Tauri 2).

> **Frontend migration in progress**: the active frontend is **Svelte 5 (SvelteKit)** in `frontend-svelte/`. The legacy React 19 frontend in `frontend/` is kept for reference and contains the billing/auth pages not yet ported to Svelte.

## Table of contents

- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Useful scripts](#useful-scripts)
- [Database schema](#database-schema)
- [Monetization system](#monetization-system)
- [Frontend pages](#frontend-pages)
- [API routes](#api-routes)
- [Deployment](#deployment)
- [Quick debugging](#quick-debugging)
- [AI Context](#ai-context)
- [License](#license)

---

## Architecture

```
Browser / Desktop
       |
       v
Frontend (Svelte 5 / SvelteKit — primary)
  - SPA mode (adapter-static, ssr = false)
  - Web:     public routes (/) + protected routes (/chat, /projects)
  - Desktop: Tauri 2 (macOS, Windows, Linux) — biometric lock, local GGUF models
       |
       |  Legacy: frontend/ (React 19 + Vite 5) — billing/auth pages, kept for reference
       |
       v (HTTP / SSE)
Backend (Express 4 + TypeScript)
  |
  |-- SQLite or PostgreSQL (users, projects, threads, messages, billing)
  |-- Stripe API          (checkout sessions, webhooks, portal)
  |-- AI Providers        (OpenAI, Gemini, Claude, Mistral, Groq)
```

---

## Project structure

```
.
├── frontend-svelte/    Svelte 5 + SvelteKit + Tailwind 4 (PRIMARY frontend)
│   └── src/
│       ├── routes/
│       │   ├── +layout.svelte         Root layout (auth init, Toaster, UpgradeModal)
│       │   ├── (public)/              Public pages — no sidebar, no auth required
│       │   │   ├── +layout.svelte     Redirects logged-in users → /chat
│       │   │   ├── +page.svelte       Landing page (/)
│       │   │   ├── login/             /login
│       │   │   ├── register/          /register
│       │   │   ├── reset-password/    /reset-password
│       │   │   ├── verify-email/      /verify-email?token=xxx
│       │   │   ├── pricing/           /pricing
│       │   │   └── guide/             /guide
│       │   └── (app)/                 Protected pages — sidebar, auth required
│       │       ├── +layout.svelte     Auth guard + Sidebar + TopBar + overlays
│       │       ├── chat/              /chat (main app)
│       │       ├── projects/          /projects
│       │       └── billing/success/   /billing/success
│       ├── lib/
│       │   ├── components/
│       │   │   ├── billing/     UpgradeModal, SubscriptionStatus, BillingPortal
│       │   │   ├── chat/        ChatZone, ChatMessage, ChatComposer, AiOption, MarkdownRenderer
│       │   │   ├── common/      MatrixBackground
│       │   │   ├── layout/      Sidebar, TopBar, SidebarProjectList, SidebarThreadList
│       │   │   ├── overlays/    ProfileOverlay, SettingsOverlay (full-screen)
│       │   │   └── ui/          Button, Modal, Dropdown, Skeleton, Toaster
│       │   ├── stores/          Svelte 5 runes ($state, $derived, $effect)
│       │   │   ├── auth.svelte.ts    isAuthenticated, isLoading, isTauri — auth guard
│       │   │   ├── app.svelte.ts     selectedOption, projectMode (localStorage)
│       │   │   ├── plan.svelte.ts    subscription, plan limits, upgrade modal
│       │   │   ├── user.svelte.ts    authenticated user session
│       │   │   └── theme.svelte.ts   dark/light theme
│       │   ├── i18n/            i18next (FR, EN, ES, DE, PT, JA, KO)
│       │   ├── api.ts           Web fetch helper (credentials: include)
│       │   ├── tauri.ts         Tauri IPC client (framework-agnostic)
│       │   └── stream-chat.ts   SSE streaming logic (framework-agnostic)
│       └── app.css              Tailwind 4 entry
│
├── frontend/           React 19 + Vite 5 + Tailwind 4 (LEGACY — kept for reference)
│   └── src/             All features duplicated in frontend-svelte/
│
├── backend/            Express 4 + TypeScript
│   ├── app.ts              Middleware stack, route registration
│   ├── routes/             Express routers (auth, users, projects, threads, chat, billing)
│   ├── controllers/        Business logic (CommonJS exports)
│   │   └── billingController.ts  Stripe checkout, portal, webhook, license activation
│   ├── middlewares/
│   │   ├── isAuthenticated.ts    JWT cookie verification
│   │   ├── planLimits.ts         Feature gates: message, project, thread, provider, collaboration
│   │   └── validate.ts           Zod request validation
│   └── models/
│       └── database.ts     DB adapter (SQLite + PostgreSQL unified interface)
│
├── src-tauri/          Tauri 2 (Rust) — native desktop, GGUF inference, biometry
├── database/           SQLite file (DB_CLIENT=sqlite)
└── docs/               User guide, deployment docs
```

---

## Features

- Full authentication: registration, email verification, login, logout, password reset.
- Secure session via HttpOnly JWT cookie.
- Multi-provider chat with conversation history, threads, and projects.
- API keys encrypted at rest (AES-256 via `ENCRYPTION_KEY`).
- Internationalization: French, English, Spanish, German, Portuguese, Japanese, Korean.
- Backend health check: `GET /healthz`.
- **SaaS monetization**: Free / Pro / Team plans + Desktop Lifetime license via Stripe.
- **Plan enforcement**: backend middleware (`planLimits.ts`) gates messages, projects, threads, providers, and collaboration. Frontend `planStore.ts` shows upgrade modal on 403 responses.
- **Desktop (Tauri)**: native app with local SQLite, AES-256-GCM key encryption derived from machine hostname, full-text search (FTS5) on messages.
- **Local GGUF models**: import `.gguf` files via native dialog, local inference via llama-cpp-2 (Metal GPU on macOS Apple Silicon), per-token streaming.
- **Biometric lock** (desktop only): Touch ID / Windows Hello lock screen, manual lock button in sidebar.

---

## Prerequisites

### Web mode
- Node.js 18+
- npm
- SQLite (bundled via `sqlite3`) or PostgreSQL (external server)

### Desktop (Tauri)
- Node.js 18+ and npm
- Rust toolchain (`rustup` — https://rustup.rs)
- `cmake` (required to compile llama-cpp-2)
- Xcode Command Line Tools (macOS)

---

## Installation

```bash
npm run install:all
```

Or manually:
```bash
cd frontend && npm install
cd ../backend && npm install
```

---

## Environment variables

Create `.env` files in `backend/` and `frontend/`.

### backend/.env

```bash
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
TRUST_PROXY=1

# Database: sqlite | postgres
DB_CLIENT=sqlite

# SQLite
SQLITE_DB_PATH=./database/ChatData.db

# PostgreSQL
# DATABASE_URL=postgresql://user:password@localhost:5432/chatgpt
# PGSSL=false

# Security
SECRET_KEY=change-me
ENCRYPTION_KEY=change-me

# Frontend origin / CORS
APP_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173

# SMTP
SMTP_HOST=...
SMTP_PORT=465
SMTP_SECURE=true
EMAIL_USER=...
SMTP_PASSWORD=...
EMAIL_FROM="ChatBot <noreply@example.com>"
REPLY_TO=noreply@example.com
SMTP_DEBUG=false

# Stripe (optional — omit to disable billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_TEAM_MONTHLY_PRICE_ID=price_...
STRIPE_TEAM_YEARLY_PRICE_ID=price_...

# Optional cookie overrides
# AUTH_COOKIE_NAME=auth_token
# AUTH_COOKIE_SECURE=true
# AUTH_COOKIE_SAMESITE=lax
# AUTH_COOKIE_DOMAIN=.example.com
# AUTH_COOKIE_MAX_AGE_DAYS=7
```

### frontend/.env

```bash
VITE_API_URL=http://localhost:3000
VITE_DEV_BYPASS_AUTH=false
```

---

## Running locally

### Dev mode (bypass auth — local only, never in production)

```bash
# backend/.env
DEV_BYPASS_AUTH=true

# frontend/.env
VITE_DEV_BYPASS_AUTH=true
```

### Start both servers (two terminals)

```bash
# Terminal 1
npm run start:backend

# Terminal 2
npm run start:frontend
```

The frontend opens via Vite (e.g. `http://localhost:5173`) and calls the API via `VITE_API_URL`.

---

## Useful scripts

### Root

```bash
npm run install:all      # install deps for frontend + backend
npm run start:backend    # backend dev server (tsx watch)
npm run start:frontend   # frontend Vite dev server
```

### Backend

```bash
cd backend
npm run dev              # tsx watch (alias for start:backend)
npm run build            # tsc -p tsconfig.json
npm run start            # node dist/app.js
npm run start:cpanel     # production start for cPanel
npm run lint
npm run lint:fix
npm run test             # vitest run
npm run format
```

### Frontend (Svelte — primary)

```bash
cd frontend-svelte
npm run dev              # SvelteKit dev server
npm run build            # production build (adapter-static)
npm run preview          # preview production build
npm run lint
npm run check            # svelte-check (TypeScript + Svelte diagnostics)
```

### Frontend (React — legacy)

```bash
cd frontend
npm run dev              # Vite dev server
npm run build            # production build
npm run lint
npm run test             # vitest run
npm run format
```

### Desktop (Tauri)

```bash
# Run from the project root (where src-tauri/ lives)
cargo tauri dev          # dev mode (starts Vite + Tauri)
cargo tauri build        # production native bundle
```

### Stripe CLI (local webhook testing)

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

---

## Database schema

### Web mode
- `DB_CLIENT=sqlite`: local file `database/ChatData.db`.
- `DB_CLIENT=postgres`: schema and indexes created automatically on startup.

### Desktop (Tauri)
Local SQLite at `~/Library/Application Support/React ChatGPT/ChatData.db` (macOS).
Includes `local_models` table and FTS5 virtual table `messages_fts` with auto-sync triggers.

### Entity-relationship diagram

```
users (id, username, email, password, email_verified)
  |
  +--< api_keys (user_id, provider, api_key[AES])
  |
  +--< subscriptions (user_id, plan_id, stripe_customer_id,
  |                   stripe_subscription_id, status,
  |                   current_period_start, current_period_end,
  |                   cancel_at_period_end)
  |        |
  |        +-->  plans (id, name, max_projects, max_threads_per_project,
  |                     max_messages_per_day, max_providers,
  |                     collaboration_enabled, local_model_limit,
  |                     stripe_price_id_monthly, stripe_price_id_yearly)
  |
  +--< projects (user_id, name, description, instructions, context_data)
  |       |
  |       +--< project_members (project_id, user_id, role)   [Team plan]
  |       |
  |       +--< threads (id[TEXT], user_id, project_id, title,
  |                     last_message_at)
  |               |
  |               +--< messages (thread_id, role, content,
  |                              attachments[JSON], provider, model)
  |
  +--< usage_daily (user_id, date, message_count)  [rate limiting]

desktop_licenses (license_key, user_id, email, plan_id,
                  activated_at, expires_at, stripe_payment_id)

password_resets      (email, token, expires_at)
email_verifications  (email, token, expires_at)
```

---

## Monetization system

### Plans

| Feature | Free | Pro | Team |
|---|---|---|---|
| Price | $0 | $8/month ($6.40/year) | $6/user/month ($4.80/year) |
| Messages/day | 50 | Unlimited | Unlimited |
| Projects | 3 | Unlimited | Unlimited |
| Threads/project | 5 | Unlimited | Unlimited |
| Providers | Groq only | All 5 | All 5 |
| Collaboration | No | No | Yes |

In addition: **Desktop Lifetime license** at $49 (one-time) — activates a `pro` plan for the Tauri desktop app without a recurring subscription.

### Stripe flow

```
User clicks "Upgrade"
       |
       v
POST /api/billing/create-checkout-session
  -> getOrCreateStripeCustomer (upserts subscriptions row)
  -> stripe.checkout.sessions.create
  -> returns { url }
       |
       v
Browser redirects to Stripe Checkout
       |
       v (on success)
/billing/success?session_id=...
       |
       v (async, via Stripe webhook)
POST /api/billing/webhook
  -> stripe.webhooks.constructEvent (signature check)
  -> checkout.session.completed  -> syncSubscription()
  -> invoice.paid                -> syncSubscription()
  -> invoice.payment_failed      -> status = 'past_due'
  -> customer.subscription.updated  -> syncSubscription()
  -> customer.subscription.deleted  -> plan_id = 'free'
```

`syncSubscription()` upserts the `subscriptions` table with `plan_id`, `status`, `stripe_subscription_id`, and period dates.

### Feature gates

**Backend** — `middlewares/planLimits.ts` exports `enforcePlanLimits(feature)`. Applied per-route:

| Feature key | What is checked |
|---|---|
| `message` | `usage_daily.message_count` vs `plans.max_messages_per_day` |
| `project` | `COUNT(projects)` vs `plans.max_projects` |
| `thread` | `COUNT(threads)` per project vs `plans.max_threads_per_project` |
| `provider` | `COUNT(DISTINCT provider)` in `api_keys` vs `plans.max_providers` |
| `collaboration` | `plans.collaboration_enabled` flag |

On limit exceeded, returns HTTP 403:
```json
{
  "error": "plan_limit_exceeded",
  "limit": 3,
  "current": 3,
  "allowed": 3,
  "plan": "free",
  "upgrade_url": "/pricing"
}
```

**Frontend (Svelte)** — `stores/plan.svelte.ts` (Svelte 5 runes):
- `planStore.fetchPlan()` calls `GET /api/billing/subscription` on app mount (web only; Tauri defaults to `pro`).
- `planStore.openUpgrade(reason)` / `planStore.closeUpgrade()` control the `UpgradeModal`.
- `planStore.checkAndPrompt(feature)` checks limits and opens the upgrade modal if exceeded.
- Integrated in `ChatZone.svelte` (message limit) and `projects/+page.svelte` (project limit).

### Desktop license activation

```
POST /api/billing/activate-license  { license_key }
  -> validates license in desktop_licenses table
  -> sets user_id, activated_at
  -> upserts subscriptions row with license.plan_id
```

---

## Frontend pages

### Route architecture — `frontend-svelte/`

```
(public) layout group — no sidebar, no auth required
  /                    Landing page (hero, features, pricing, FAQ)
  /login               Login form → redirects to /chat on success
  /register            Registration form → "check your email" on success
  /reset-password      Request reset (email) or confirm reset (?token=xxx)
  /verify-email        Email verification (?token=xxx) — 3 states: loading/success/error
  /pricing             Plan comparison (Free/Pro/Team) with Stripe checkout
  /guide               User guide / documentation

(app) layout group — sidebar + TopBar + overlays, auth required
  /chat                Main chat interface (default after login)
  /projects            Project management
  /billing/success     Post-checkout confirmation → auto-redirect to /chat
```

### Auth guards

| Situation | Behavior |
|---|---|
| Anonymous user → `/chat` or `/projects` | Redirect → `/login` |
| Anonymous user → `/` | Sees landing page |
| Logged-in user → `/` or `/login` or `/register` | Redirect → `/chat` |
| Logged-in user → `/pricing` or `/guide` | Stays (public, no redirect) |
| Tauri desktop → any public page | Redirect → `/chat` (always authenticated) |
| `VITE_DEV_BYPASS_AUTH=true` | Always authenticated, skips guards |

### User flow

```
New visitor → / (landing)
  → "Get started" → /register
  → Fills form → POST /register → "Check your email"
  → Clicks email link → /verify-email?token=xxx → "Email verified!"
  → "Go to login" → /login → POST /login → /chat
  → Chat with sidebar, projects, AI providers
```

---

## API routes

### Auth (no prefix)
```
POST   /register
POST   /login
POST   /logout
POST   /reset-password-request
POST   /reset-password
GET    /verify-email
GET    /healthz
```

### User
```
GET    /api/users
POST   /api/update-user-data
POST   /api/update-api-key
GET    /api/api-keys
DELETE /api/api-keys/:provider
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
GET    /api/projects/:projectId/threads
POST   /api/projects/:projectId/threads
```

### Threads
```
GET    /api/threads
POST   /api/threads
GET    /api/threads/:threadId/messages
PATCH  /api/threads/:threadId
DELETE /api/threads/:threadId
```

### Chat
```
POST   /api/chat/message        SSE streaming response
```

### Billing
```
POST   /api/billing/webhook                  Raw body, no auth — Stripe events
POST   /api/billing/create-checkout-session  Auth required
POST   /api/billing/create-portal-session    Auth required
GET    /api/billing/subscription             Auth required
POST   /api/billing/activate-license         Auth required
```

---

## Deployment

For o2switch / cPanel (Node.js app + SSH), see:
`docs/deploiement-o2switch-cpanel.md`

For Stripe production setup:
1. Create products and prices in the Stripe dashboard.
2. Copy the Price IDs into `backend/.env` (`STRIPE_PRO_MONTHLY_PRICE_ID`, etc.).
3. Register the webhook endpoint `https://yourdomain.com/api/billing/webhook` in the Stripe dashboard.
4. Select events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## Quick debugging

```bash
# Check API health
curl -i http://localhost:3000/healthz

# Test Stripe webhook locally
stripe listen --forward-to localhost:3000/api/billing/webhook
stripe trigger checkout.session.completed
```

- If a provider dependency is missing, re-run `npm install` in `backend/`.
- If CORS blocks requests, check `APP_URL` and `CORS_ALLOWED_ORIGINS`.
- If email delivery fails, check `SMTP_*` credentials.
- If `cargo tauri dev` fails to compile llama-cpp-2, verify `cmake` is installed (`brew install cmake` on macOS).
- If biometrics do not trigger, verify Touch ID is configured on the machine (the app auto-unlocks if biometrics are unavailable).
- Imported GGUF models are copied to `~/Library/Application Support/React ChatGPT/models/` on macOS. A model with the same filename cannot be imported twice.
- If billing routes return 500, verify `STRIPE_SECRET_KEY` is set and valid.

---

## AI Context

This section provides structured context for AI models (Claude, Codex, Copilot, Cursor, etc.) reading this repository.

### Project summary

This is a production-ready, full-stack AI chatbot monorepo. The backend is Express 4 with TypeScript, targeting SQLite (default) or PostgreSQL via a unified adapter. The **primary frontend is Svelte 5 (SvelteKit)** in `frontend-svelte/`, using SPA mode (`adapter-static`, `ssr = false`), Svelte 5 runes (`$state`, `$derived`, `$effect`), bits-ui, lucide-svelte, and svelte-sonner. A legacy React 19 frontend in `frontend/` is kept for reference only. There is also a Tauri 2 desktop shell.

The project uses **SvelteKit layout groups** for routing: `(public)` for unauthenticated pages (landing, login, register, pricing, guide) and `(app)` for authenticated pages (chat, projects, billing). Auth guards in the layout files handle redirects automatically. A centralized `authStore` manages authentication state across the app.

The project includes a complete SaaS billing system built on Stripe: Free / Pro ($8/month) / Team ($6/user/month) plans, plus a one-time Desktop Lifetime license ($49). Plan limits are enforced at the backend middleware level (`planLimits.ts`) and surfaced to the user via `planStore` + `UpgradeModal` in the Svelte frontend.

### Codebase map

```
frontend-svelte/src/                 ← PRIMARY FRONTEND (Svelte 5 / SvelteKit)
  routes/
    +layout.svelte                   — root layout: auth init, Toaster, UpgradeModal
    (public)/                        — public pages (no sidebar, no auth)
      +layout.svelte                 — redirects logged-in users → /chat
      +page.svelte                   — landing page (/)
      login/                         — /login
      register/                      — /register
      reset-password/                — /reset-password
      verify-email/                  — /verify-email?token=xxx
      pricing/                       — /pricing
      guide/                         — /guide
    (app)/                           — protected pages (sidebar + auth guard)
      +layout.svelte                 — auth guard + Sidebar + TopBar + overlays
      chat/                          — /chat (main app)
      projects/                      — /projects
      billing/success/               — /billing/success
  lib/
    stores/
      auth.svelte.ts                 — isAuthenticated, isLoading, isTauri — centralized auth
      app.svelte.ts                  — selectedOption, projectMode (localStorage)
      plan.svelte.ts                 — subscription, plan limits, upgrade modal, feature checks
      user.svelte.ts                 — authenticated user session (web + Tauri dual)
      theme.svelte.ts                — dark/light theme
    components/
      billing/                       — UpgradeModal, SubscriptionStatus, BillingPortal
      chat/                          — ChatZone, ChatMessage, ChatComposer, AiOption, MarkdownRenderer
      common/                        — MatrixBackground
      layout/                        — Sidebar, TopBar, SidebarProjectList, SidebarThreadList
      overlays/                      — ProfileOverlay, SettingsOverlay (full-screen)
      ui/                            — Button, Modal, Dropdown, Skeleton, Toaster
    api.ts                           — web fetch helper (credentials: include)
    tauri.ts                         — Tauri IPC client (framework-agnostic)
    stream-chat.ts                   — SSE streaming (framework-agnostic)
    i18n/                            — i18next (FR, EN, ES, DE, PT, JA, KO)

frontend/src/                        ← LEGACY (React 19 — kept for reference only)

backend/                             ← SHARED BACKEND (Express 4 + TypeScript)
  app.ts                             — Express setup, middleware order, route mounting
  routes/                            — thin routers (auth, users, projects, threads, chat, billing)
  controllers/                       — business logic, CommonJS exports.name pattern
  middlewares/
    isAuthenticated                  — reads JWT from HttpOnly cookie, attaches req.user + plan
    planLimits                       — enforcePlanLimits('message'|'project'|'thread'|'provider'|'collaboration')
    validate                         — Zod schema middleware
  models/database.ts                 — DB adapter: run/get/all/serialize, ? -> $N for postgres
```

### Key patterns and conventions

**Backend:**
- Controllers use CommonJS (`exports.name = ...`). Routes use ESM `import`. Do not mix in the same file.
- All SQL uses `?` placeholders — the DB adapter auto-converts to `$1, $2...` for PostgreSQL. Never interpolate user inputs into SQL strings.
- API errors always return `res.status(N).json({ error: '...' })`.
- Plan limit errors return HTTP 403 with `{ error: 'plan_limit_exceeded', limit, current, allowed, plan, upgrade_url }`.

**Svelte frontend (primary):**
- Svelte 5 runes: `$state`, `$derived`, `$effect` in `.svelte.ts` store files. Do NOT use Svelte 4 `writable()`/`readable()`.
- Stores export objects with getters/setters: `appStore.profil`, `appStore.setProfil(v)`.
- Components in `$lib/components/`, stores in `$lib/stores/`, `$lib` alias for `frontend-svelte/src/lib`.
- UI: bits-ui (replaces Radix), lucide-svelte (replaces lucide-react), svelte-sonner (replaces sonner).
- Routing: SvelteKit layout groups — `(public)` for unauthenticated, `(app)` for authenticated.
- Auth: `authStore` in root layout `init()`, `(public)` layout redirects logged-in users, `(app)` layout redirects anonymous users.
- `tauri.ts` and `stream-chat.ts` are framework-agnostic TypeScript files.
- `api.ts` provides `apiGet()`/`apiPost()` for web fetch with `credentials: 'include'`.

**Shared conventions:**
- Chat streaming uses `fetch` + manual SSE line parsing + `AbortController`. Do not replace with `EventSource` (custom headers are required).
- UI text is in French. i18n keys via `t('ns:key')`. Never hardcode French strings in templates/JSX.
- TypeScript is non-strict (`strict: false`). Keep typings minimal.
- Tailwind 4 only — no CSS-in-JS.
- Components: `PascalCase`. Handlers: `camelCase`. Backend handlers: `exports.camelCase`.

### Data flow

**Auth (web)**
```
New visitor → / (landing page, public)
  → clicks "Get started" → /register
  → POST /register → "Check your email"
  → clicks email link → /verify-email?token=xxx → GET /verify-email → "Verified!"
  → /login → POST /login → backend sets HttpOnly JWT cookie
  → authStore.onLogin(userData) → localStorage + userStore
  → goto('/chat') → (app) layout loads sidebar, planStore.fetchPlan()

Returning user → / → authStore.isAuthenticated=true → redirect /chat
Anonymous on /chat → authStore.isAuthenticated=false → redirect /login
Tauri desktop → authStore.isTauri=true → always authenticated → /chat directly
```

**Chat message**
```
User types + sends
  -> fetch POST /api/chat/message (SSE)
  -> isAuthenticated + planLimits('message') + rateLimit(30/min)
  -> controller decrypts API key for selected provider
  -> loads last 50 messages + project context
  -> streams response: delta events -> done event
  -> usage_daily.message_count incremented
  -> messages row inserted for user + assistant
```

**Billing / subscription**
```
User clicks "Upgrade to Pro"
  -> PricingPage.handleSubscribe()
  -> POST /api/billing/create-checkout-session { plan, interval }
  -> backend: getOrCreateStripeCustomer -> stripe.checkout.sessions.create
  -> frontend redirects to Stripe-hosted checkout URL
  -> on payment: Stripe sends webhook to POST /api/billing/webhook
  -> backend verifies signature, calls syncSubscription()
  -> subscriptions row upserted with plan_id, status, period dates
  -> user lands on /billing/success
  -> planStore.fetchPlan() refetches subscription state
```

### Common pitfalls

- **New features go in `frontend-svelte/`**, not `frontend/`. The React frontend is legacy.
- Do not mix `require` and `import` in the same backend file unless the file already does so.
- Never string-interpolate variables into SQL — always use parameterized queries with `?`.
- The `threads.id` column is `TEXT` (UUID-style), not `INTEGER`. Do not assume numeric IDs for threads.
- Svelte stores use runes (`$state`, `$derived`), not writable/readable stores from Svelte 4. Do not use `writable()`.
- `tauri.ts` and `stream-chat.ts` are framework-agnostic — changes affect both frontends.
- Routing uses SvelteKit layout groups: new public pages go in `(public)/`, new protected pages go in `(app)/`. The auth guard is in the layout, not in individual pages.
- The root layout only initializes `authStore` — sidebar and TopBar live in `(app)/+layout.svelte`.
- Tauri desktop sets `authStore.isTauri = true` → always authenticated, skips all public pages.
- Chat drafts are keyed in localStorage as `chat_draft:{userId}:{threadId}:{projectId}` — do not change this key format.
- The Stripe webhook route (`/api/billing/webhook`) requires the raw request body for signature verification. Ensure `express.raw()` is applied before `express.json()` for this route only.
- `ENCRYPTION_KEY` must remain constant after first API key is stored. Changing it corrupts stored keys.

### Testing

```bash
# Frontend tests (from frontend/)
npm run test          # vitest run
npm run test:watch    # vitest watch

# Backend tests (from backend/)
npm run test
npm run test:watch

# Single file
npx vitest run path/to/file.test.ts
```

Unit tests cover utility functions and controllers. SSE streaming and Stripe webhooks are not covered by automated tests — test them manually with `stripe trigger`.

### Environment setup

```bash
# 1. Install dependencies
npm run install:all

# 2. Create backend/.env (copy variables from the Environment variables section above)
# At minimum: SECRET_KEY, ENCRYPTION_KEY, APP_URL, CORS_ALLOWED_ORIGINS

# 3. Create frontend/.env
# VITE_API_URL=http://localhost:3000

# 4. Start dev servers
npm run start:backend   # http://localhost:3000
npm run start:frontend  # http://localhost:5173

# 5. (Optional) Enable dev auth bypass for faster local iteration
# backend/.env:  DEV_BYPASS_AUTH=true
# frontend/.env: VITE_DEV_BYPASS_AUTH=true

# 6. (Optional) Test Stripe billing locally
stripe listen --forward-to localhost:3000/api/billing/webhook
```

---

## License

MIT
