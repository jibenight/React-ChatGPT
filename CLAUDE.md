# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Full-stack multi-provider AI chatbot (OpenAI, Gemini, Claude, Mistral, Groq) with a SaaS billing system (Stripe).
Monorepo: `frontend-svelte/` (Svelte 5 / SvelteKit — **primary frontend**), `frontend/` (React 19 — **legacy**, billing/auth pages not yet ported), and `backend/` (Express 4 + SQLite/PostgreSQL).
Desktop version: Tauri 2 (macOS, Windows, Linux) with biometric lock and local GGUF inference.

> **All new frontend work should go in `frontend-svelte/`**. The React frontend is kept for reference only.

## Quick start

```bash
npm run install:all      # install deps for both apps
npm run start:backend    # backend dev server (tsx watch)
npm run start:frontend   # frontend Vite dev server
```

## Build, lint, test commands

### Frontend Svelte (`frontend-svelte/`) — PRIMARY
```bash
npm run dev          # SvelteKit dev server
npm run build        # production build (adapter-static)
npm run preview      # preview production build
npm run lint         # eslint
npm run check        # svelte-check (TS + Svelte diagnostics)
```

### Frontend React (`frontend/`) — LEGACY
```bash
npm run build        # vite build
npm run lint         # eslint src
npm run lint:fix     # eslint src --fix
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
npm run format       # prettier --write src
```

### Backend (`backend/`)
```bash
npm run build        # tsc -p tsconfig.json
npm run lint         # eslint .
npm run lint:fix     # eslint . --fix
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
npm run format       # prettier --write .
```

Run a single test file: `npx vitest run path/to/file.test.ts` (from `frontend/` or `backend/`).

## Code style

- 2-space indentation, semicolons, single quotes.
- Svelte frontend: `.svelte` files, `$lib` alias to `frontend-svelte/src/lib`. Svelte 5 runes (`$state`, `$derived`, `$effect`). Do NOT use Svelte 4 `writable()`/`readable()`.
- React frontend (legacy): ESM imports, `.tsx` files, `@/` alias to `frontend/src`.
- Backend: CommonJS (`require`) in controllers/models, TS in routes; match existing style per file. Do not mix `require` and `import` in the same file unless already present.
- Svelte: components use `$props()`, `{#if}`, `{#each}`, `{@render}`. Tailwind classes (no CSS-in-JS).
- React (legacy): function components + hooks only, Tailwind classes.
- UI text is in French — use `t('ns:key')` from i18next, never hardcode French strings in templates/JSX.
- TypeScript is non-strict (`strict: false`); keep typings minimal.

## Naming conventions

- Svelte components: `PascalCase` filenames (e.g., `ChatZone.svelte`).
- Svelte stores: `camelCase` with `.svelte.ts` suffix (e.g., `app.svelte.ts`). Export object with getters/setters.
- React components (legacy): `PascalCase` filenames and exports.
- Hooks/handlers: `camelCase` (e.g., `useUser`, `handleSend`).
- Constants: `UPPER_SNAKE_CASE` for true constants.
- Backend route handlers: `exports.<name> = ...`.

## Architecture

### Frontend — Svelte 5 (primary: `frontend-svelte/`)
- Framework: SvelteKit with `adapter-static`, `ssr = false` (SPA mode, Tauri-compatible).
- Routing: **SvelteKit layout groups** for auth separation:
  - `routes/+layout.svelte` — root layout: initializes `authStore`, renders Toaster + UpgradeModal.
  - `routes/(public)/+layout.svelte` — public pages (no sidebar). Redirects logged-in users → `/chat`.
  - `routes/(app)/+layout.svelte` — protected pages (Sidebar + TopBar + overlays). Redirects anonymous users → `/login`.
- Public pages (`(public)/`): `/` (landing), `/login`, `/register`, `/reset-password`, `/verify-email`, `/pricing`, `/guide`.
- Protected pages (`(app)/`): `/chat`, `/projects`, `/billing/success`.
- Components in `lib/components/`: `billing/` (UpgradeModal, SubscriptionStatus, BillingPortal), `chat/` (ChatZone, ChatMessage, ChatComposer, AiOption, MarkdownRenderer), `common/` (MatrixBackground), `layout/` (Sidebar, TopBar, SidebarProjectList, SidebarThreadList), `overlays/` (ProfileOverlay, SettingsOverlay), `ui/` (Button, Modal, Dropdown, Skeleton, Toaster).
- State: Svelte 5 runes in `lib/stores/`:
  - `auth.svelte.ts` — centralized auth: `isAuthenticated`, `isLoading`, `isTauri`, `init()`, `onLogin()`, `onLogout()`.
  - `app.svelte.ts` — selectedOption, projectMode, persisted to localStorage.
  - `plan.svelte.ts` — subscription data, plan limits, upgrade modal, `fetchPlan()`, `checkAndPrompt()`.
  - `user.svelte.ts` — authenticated user session (web + Tauri dual).
  - `theme.svelte.ts` — dark/light theme.
- UI libs: bits-ui (replaces Radix), lucide-svelte, svelte-sonner.
- HTTP: `lib/api.ts` (web fetch with `credentials: 'include'`). `lib/tauri.ts` (Tauri IPC, framework-agnostic). `lib/stream-chat.ts` (SSE streaming, framework-agnostic).
- i18n: `lib/i18n/` — i18next with 7 languages, flat keys (`i18n.t('keyName')`).

### Frontend — React 19 (legacy: `frontend/`)
- Kept for reference only. All features have been ported to Svelte.

### Backend
- Entry: `backend/app.ts` — middleware stack, route registration, hourly token cleanup.
- Routes: `backend/routes/*`, controllers: `backend/controllers/*`.
- DB: `backend/models/database.ts` — adapter pattern wrapping SQLite callbacks and PostgreSQL async into a unified `{ run, get, all, serialize, close }` interface. SQL uses `?` placeholders; the adapter auto-converts to `$1, $2...` for PostgreSQL.
- Auth: JWT via HttpOnly cookie (`isAuthenticated` middleware). API keys encrypted with AES-256 (`ENCRYPTION_KEY` env via crypto-js).
- Validation: Zod schemas in `middlewares/validate.ts`, applied per-route.
- Plan enforcement: `middlewares/planLimits.ts` exports `enforcePlanLimits(feature)`. Applied to routes that create messages, projects, threads, or provider keys.

### Chat message flow
1. `POST /api/chat/message` → auth middleware → Zod validation → rate limit (30/min) → `enforcePlanLimits('message')`.
2. Controller decrypts user's API key for the selected provider.
3. Loads project context (instructions + context_data) and last 50 thread messages.
4. Routes to provider SDK: OpenAI (custom axios streaming), Gemini (file upload + generateContent), Claude (messages.create), Mistral (client.chat), Groq (fetch streaming).
5. Streams response via SSE events: `delta` (token), `done` (final), `error`.
6. Stores both user and assistant messages in `messages` table. Increments `usage_daily.message_count`.

### Billing / Stripe flow
1. `POST /api/billing/create-checkout-session` → auth → Zod validation `{ plan: 'pro'|'team', interval: 'monthly'|'yearly' }`.
2. `getOrCreateStripeCustomer()` upserts a row in `subscriptions` with `stripe_customer_id`.
3. `stripe.checkout.sessions.create()` returns a hosted checkout URL; frontend redirects to it.
4. On payment success, Stripe sends a webhook to `POST /api/billing/webhook` (raw body, no auth, no CSRF).
5. `handleWebhook` verifies the Stripe signature, then dispatches by event type:
   - `checkout.session.completed`, `invoice.paid` → `syncSubscription()` upserts `subscriptions`.
   - `invoice.payment_failed` → sets `status = 'past_due'`.
   - `customer.subscription.updated` → `syncSubscription()`.
   - `customer.subscription.deleted` → resets to `plan_id = 'free'`.
6. `GET /api/billing/subscription` returns plan, limits, and today's usage for the frontend.

### Plan feature gates
`enforcePlanLimits(feature)` middleware reads the user's plan from the `plans` table and checks:

| feature key | check |
|---|---|
| `message` | `usage_daily.message_count` vs `plans.max_messages_per_day` |
| `project` | `COUNT(projects)` vs `plans.max_projects` |
| `thread` | `COUNT(threads per project)` vs `plans.max_threads_per_project` |
| `provider` | `COUNT(DISTINCT provider in api_keys)` vs `plans.max_providers` |
| `collaboration` | `plans.collaboration_enabled` flag |

On limit exceeded, returns HTTP 403 `{ error: 'plan_limit_exceeded', limit, current, allowed, plan, upgrade_url }`.
Frontend calls `handlePlanLimitError(data)` (from `planStore.ts`) to open `UpgradeModal`.

### Desktop license activation
`POST /api/billing/activate-license { license_key }` → validates row in `desktop_licenses`, sets `user_id` and `activated_at`, upserts `subscriptions` with `license.plan_id`.

### Data model
- `users` → `api_keys` (one per provider, AES-encrypted).
- `users` → `subscriptions` → `plans` (feature limits, Stripe price IDs).
- `users` → `projects` (instructions, context_data) → `threads` → `messages` (role, content, provider, model, attachments JSON).
- `projects` → `project_members` (Team plan collaboration, role: viewer/editor/admin).
- `users` → `usage_daily` (message_count per day, used by `enforcePlanLimits('message')`).
- `desktop_licenses` (license_key, user_id, plan_id, activated_at, expires_at).
- `password_resets` and `email_verifications` with expiry tokens.

### Key API routes

Auth:
```
POST  /register
POST  /login
POST  /logout
POST  /reset-password-request
POST  /reset-password
GET   /verify-email
GET   /healthz
```

User:
```
GET    /api/users
POST   /api/update-user-data
POST   /api/update-api-key
GET    /api/api-keys
DELETE /api/api-keys/:provider
```

Projects:
```
GET|POST        /api/projects
GET|PATCH|DELETE /api/projects/:projectId
GET|POST        /api/projects/:projectId/threads
```

Threads:
```
GET|POST        /api/threads
GET             /api/threads/:threadId/messages
PATCH|DELETE    /api/threads/:threadId
```

Chat:
```
POST  /api/chat/message    (SSE streaming)
```

Billing:
```
POST  /api/billing/webhook                   raw body, no auth
POST  /api/billing/create-checkout-session   auth required
POST  /api/billing/create-portal-session     auth required
GET   /api/billing/subscription              auth required
POST  /api/billing/activate-license          auth required
```

### Frontend routes (Svelte)

Public — `(public)` layout group, no sidebar:
```
/                  Landing page            redirects to /chat if logged in
/login             Login form              redirects to /chat if logged in
/register          Registration form       redirects to /chat if logged in
/reset-password    Reset password          request or confirm (?token=)
/verify-email      Email verification      ?token= from email link
/pricing           Plan comparison         accessible to all
/guide             User guide              accessible to all
```

Protected — `(app)` layout group, sidebar + auth guard:
```
/chat              Chat zone               redirects to /login if not auth
/projects          Project management      redirects to /login if not auth
/billing/success   Post-checkout confirm   redirects to /login if not auth
```

Tauri — always authenticated, skips public pages → /chat directly.

## Important patterns

- Use parameterized SQL — never string-interpolate user inputs.
- Return JSON errors: `res.status(...).json({ error: ... })`.
- Frontend error handling: set error state, render user-facing messages in French.
- Dev bypass mode: set `VITE_DEV_BYPASS_AUTH=true` (frontend) and `DEV_BYPASS_AUTH=true` (backend) for local dev without login.
- Chat streaming uses `fetch` + manual SSE line parsing with `AbortController` for cancellation; do not replace with `EventSource`.
- Chat drafts persist to localStorage keyed by `chat_draft:{userId}:{threadId}:{projectId}`.
- The Stripe webhook route requires the raw request body (`express.raw()`) for signature verification. Do not apply `express.json()` to this route.
- `threads.id` is `TEXT` (UUID-style), not `INTEGER`. Do not assume numeric thread IDs.
- `ENCRYPTION_KEY` must remain constant after first API key is stored. Changing it corrupts stored keys.
- `isTauri` flag (`'__TAURI_INTERNALS__' in window`) gates Tauri-specific behavior throughout the frontend. When `isTauri` is true, billing API calls are skipped and `planStore` defaults to `pro`.

## Environment

- Frontend env: `frontend/.env` — uses `import.meta.env` (Vite). Key vars: `VITE_API_URL`, `VITE_DEV_BYPASS_AUTH`.
- Backend env: `backend/.env` — uses `dotenv`. Key vars: `APP_URL`, `SECRET_KEY`, `ENCRYPTION_KEY`, `SMTP_*`, `DB_CLIENT`, `CORS_ALLOWED_ORIGINS`.
- Stripe vars (backend): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, `STRIPE_TEAM_MONTHLY_PRICE_ID`, `STRIPE_TEAM_YEARLY_PRICE_ID`.
- Never commit `.env` files.
