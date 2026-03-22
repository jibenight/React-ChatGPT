# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Full-stack multi-provider AI chatbot (OpenAI, Gemini, Claude, Mistral, Groq) with a SaaS billing system (Stripe).
Monorepo: `frontend/` (React 19 + Vite 5 + Tailwind 4) and `backend/` (Express 4 + SQLite/PostgreSQL).
Also configurable as pnpm workspace (`pnpm dev` runs both apps in parallel).
Desktop version: Tauri 2 (macOS, Windows, Linux) with biometric lock and local GGUF inference.

## Quick start

```bash
npm run install:all      # install deps for both apps
npm run start:backend    # backend dev server (tsx watch)
npm run start:frontend   # frontend Vite dev server
```

## Build, lint, test commands

### Frontend (`frontend/`)
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
- Frontend: ESM imports, `.tsx` files, `@/` alias to `frontend/src`.
- Backend: CommonJS (`require`) in controllers/models, TS in routes; match existing style per file. Do not mix `require` and `import` in the same file unless already present.
- React: function components + hooks only, Tailwind classes (no CSS-in-JS).
- UI text is in French — use `t('ns:key')` from react-i18next, never hardcode French strings in JSX.
- TypeScript is non-strict (`strict: false`); keep typings minimal.

## Naming conventions

- React components: `PascalCase` filenames and exports.
- Hooks/handlers: `camelCase` (e.g., `useUser`, `handleSend`).
- Constants: `UPPER_SNAKE_CASE` for true constants.
- Backend route handlers: `exports.<name> = ...`.

## Architecture

### Frontend
- Entry: `frontend/src/index.tsx` — `AppGate` handles web vs Tauri routing, biometric lock, and plan fetch on mount.
- Layout: `frontend/src/App.tsx` — main chat UI (sidebar + chat panel).
- Features organized by domain:
  - `features/auth/` — LoginPage, RegisterPage, ResetPasswordPage, PrivateRoute.
  - `features/billing/` — PricingPage, BillingSuccess, UpgradeModal, SubscriptionStatus, BillingPortal.
  - `features/chat/` — chat interface, SSE message streaming.
  - `features/landing/` — LandingPage (web only, public route).
  - `features/projects/` — project CRUD.
  - `features/profile/` — user settings.
  - `features/info/` — UserGuide.
- UI components: `components/ui/` (Radix primitives), `components/assistant-ui/` (AI thread/message), `components/common/` (Modal, Dropdown, ErrorBoundary, LockScreen).
- State:
  - Zustand `stores/appStore.ts` persists `selectedOption` and `projectMode` to localStorage.
  - Zustand `stores/planStore.ts` holds subscription data, plan limits, and upgrade modal state. Calls `GET /api/billing/subscription` on mount (web only; Tauri defaults to `pro`).
  - User session via React Context (`UserContext.tsx`).
- HTTP: `apiClient.ts` (axios with `withCredentials: true` for cookie auth). Streaming chat uses `fetch` with manual SSE parsing (not EventSource, to support custom headers).
- Auth guard: `PrivateRoute.tsx` checks `userData.id` (Context) or `localStorage('user').id`; redirects to `/login` if unauthenticated. Dev bypass: `VITE_DEV_BYPASS_AUTH=true`.

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

### Frontend routes

Web:
```
/                  LandingPage        public
/login             LoginPage          public
/register          RegisterPage       public
/reset-password    ResetPasswordPage  public
/pricing           PricingPage        public
/guide             UserGuide          public
/chat              App                PrivateRoute
/projects          App                PrivateRoute
/billing/success   BillingSuccess     PrivateRoute
```

Tauri (desktop — behind biometric lock, no auth pages):
```
/ or /chat         App
/projects          App
/guide             UserGuide
/pricing           PricingPage  (Stripe disabled in Tauri context)
```

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
