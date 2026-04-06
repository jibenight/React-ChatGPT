# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Full-stack multi-provider AI chatbot (OpenAI, Gemini, Claude, Mistral, Groq) with a SaaS billing system (Stripe).
Monorepo: `frontend-svelte/` (Svelte 5 / SvelteKit — **primary frontend**), `frontend/` (React 19 — **legacy**, kept for reference only), and `backend-rust/` (Axum 0.8 + SQLx — **primary backend**).
Desktop version: Tauri 2 (macOS, Windows, Linux) with biometric lock and local GGUF inference.

> **All new frontend work should go in `frontend-svelte/`**. The React frontend is kept for reference only.
> **All backend work goes in `backend-rust/`**. The old `backend/` (Express/Node) is deprecated.

## Quick start

```bash
# Frontend
cd frontend-svelte && npm install && npm run dev

# Backend (Rust)
cd backend-rust && cargo run
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
npm run test         # vitest run
```

### Backend Rust (`backend-rust/`) — PRIMARY
```bash
cargo run            # dev server (default port 3001)
cargo build          # debug build
cargo build --release # release build
cargo test           # run tests
cargo clippy         # linter
cargo fmt            # format code
```

## Code style

- **Svelte frontend**: 2-space indentation, semicolons, single quotes. `.svelte` files, `$lib` alias to `frontend-svelte/src/lib`. Svelte 5 runes (`$state`, `$derived`, `$effect`). Do NOT use Svelte 4 `writable()`/`readable()`.
- **React frontend (legacy)**: ESM imports, `.tsx` files, `@/` alias to `frontend/src`.
- **Rust backend**: standard Rust conventions (`rustfmt`). Modules organized by domain (handlers, routes, models, middleware, services, providers). Use `thiserror` for error types, `anyhow` for context propagation.
- Svelte: components use `$props()`, `{#if}`, `{#each}`, `{@render}`. Tailwind classes (no CSS-in-JS).
- UI text is in French — use `t('ns:key')` from i18next, never hardcode French strings in templates/JSX.
- TypeScript (frontend) is non-strict (`strict: false`); keep typings minimal.

## Naming conventions

- Svelte components: `PascalCase` filenames (e.g., `ChatZone.svelte`).
- Svelte stores: `camelCase` with `.svelte.ts` suffix (e.g., `app.svelte.ts`). Export object with getters/setters.
- Rust modules: `snake_case` filenames. Structs: `PascalCase`. Functions/methods: `snake_case`.
- Rust handlers: `async fn handler_name(...)` in `handlers/*.rs`, registered in `routes/*.rs`.
- Constants: `UPPER_SNAKE_CASE` for true constants (both Rust and frontend).

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

### Backend — Rust / Axum (primary: `backend-rust/`)
- **Framework**: Axum 0.8 on Tokio async runtime.
- **Entry**: `src/main.rs` — env loading, tracing init, DB connection, background tasks, graceful shutdown.
- **Router assembly**: `src/app.rs` — merges domain routers, applies middleware layers.
- **Config**: `src/config.rs` — `AppConfig` struct parsed from env vars via `dotenvy`.
- **State**: `src/state.rs` — `AppState` (DbPool, AppConfig, ApiKeyCache, Mailer, reqwest::Client).
- **Errors**: `src/error.rs` — `AppError` enum implementing `IntoResponse` (JSON error responses).

#### Source layout
```
backend-rust/src/
├── main.rs              # Entry point
├── app.rs               # Router + middleware stack
├── config.rs            # AppConfig from env
├── state.rs             # AppState shared state
├── error.rs             # AppError enum
├── db/                  # Database layer
│   ├── adapter.rs       # DbPool enum (SQLite | Postgres) unified interface
│   ├── schema.rs        # Table creation on startup
│   └── search.rs        # Full-text search utilities
├── dto/                 # Request/response DTOs (Serde + validator)
│   ├── auth.rs, users.rs, projects.rs, threads.rs, chat.rs, billing.rs, search.rs
├── extractors/          # Axum extractors
│   ├── auth_user.rs     # AuthUser from request extensions
│   ├── validated_json.rs, validated_path.rs, validated_query.rs
├── handlers/            # Business logic (async fn)
│   ├── auth.rs, users.rs, projects.rs, threads.rs, chat.rs, billing.rs, search.rs
├── middleware/           # Tower/Axum middleware layers
│   ├── auth.rs          # JWT verification + dev bypass
│   ├── cors.rs, csrf.rs, rate_limit.rs, plan_limits.rs
│   ├── request_id.rs, security_headers.rs
├── models/              # SQLx FromRow structs
│   ├── user.rs, api_key.rs, message.rs, thread.rs, project.rs
│   ├── plan.rs, subscription.rs, usage.rs, desktop_license.rs
│   ├── password_reset.rs, email_verification.rs
├── providers/           # AI provider integrations (SSE streaming)
│   ├── mod.rs           # route_to_provider() dispatcher
│   ├── openai.rs, gemini.rs, claude.rs, mistral.rs, groq.rs
├── routes/              # Axum Router builders per domain
│   ├── auth.rs, users.rs, projects.rs, threads.rs, chat.rs, billing.rs, search.rs
├── services/            # Utility services
│   ├── encryption.rs    # AES-256-GCM + scrypt KDF
│   ├── auth_cookies.rs  # HttpOnly cookie management
│   ├── api_key_cache.rs # DashMap in-memory cache with TTL
│   ├── rate_limit_store.rs # DB-backed rate limiting
│   ├── mailer.rs        # SMTP with optional DKIM
│   ├── cleanup.rs       # Background cleanup tasks
│   └── usage.rs         # Daily message usage tracking
└── tests/               # Unit + integration tests
```

#### Key dependencies
| Crate | Purpose |
|-------|---------|
| `axum` 0.8 | HTTP framework |
| `tokio` 1 | Async runtime |
| `sqlx` 0.8 | Async DB (SQLite + PostgreSQL) |
| `tower` / `tower-http` | Middleware (CORS, tracing, body limits) |
| `jsonwebtoken` 9 | JWT signing/verification |
| `bcrypt` | Password hashing |
| `aes-gcm` + `scrypt` | AES-256-GCM encryption for API keys |
| `reqwest` + `reqwest-eventsource` | HTTP client + SSE parsing for providers |
| `async-stripe` | Stripe API client |
| `lettre` | SMTP email (with DKIM) |
| `serde` / `validator` | Serialization + DTO validation |
| `dashmap` | Concurrent in-memory cache |
| `tracing` | Structured logging |

#### DB: SQLx adapter pattern
- `DbPool` enum wraps `SqlitePool` or `PgPool` with a unified query interface.
- `DB_CLIENT` env var selects backend (`sqlite` default, or `postgres`).
- SQLite uses `?` placeholders; adapter auto-converts to `$1, $2...` for PostgreSQL.
- Schema initialized on startup (`db/schema.rs`).

#### Auth: JWT via HttpOnly cookie
- Token signed with `SECRET_KEY` (HS256), claims: `{ id, exp }`.
- Stored in HttpOnly cookie (name configurable, default `token`).
- `middleware/auth.rs` extracts + verifies JWT, injects `AuthUser` into request extensions.
- Dev bypass: `DEV_BYPASS_AUTH=true` + localhost → auto-creates `dev@local` user.

#### Middleware stack (outermost → innermost)
1. `set_request_id` — UUID `X-Request-ID` header.
2. `add_security_headers` — CSP, X-Frame-Options, X-Content-Type-Options.
3. `cors_layer` — origins from `CORS_ALLOWED_ORIGINS`.
4. `RequestBodyLimitLayer` — 15 MB max.
5. `csrf_protection` — double-submit cookie (exempt: auth routes, healthz, webhook).
6. `require_auth` — per-route JWT verification.
7. `enforce_plan_limits` — per-route feature gate.
8. `check_rate_limit` — per-handler DB-backed rate limiting.

### Chat message flow
1. `POST /api/chat/message` → auth → validation → rate limit (30/min) → `enforce_plan_limits("message")`.
2. Handler decrypts user's API key for the selected provider (AES-256-GCM).
3. Loads project context (instructions + context_data) and last 50 thread messages.
4. Routes to provider via `providers::route_to_provider()` with MPSC channel.
5. Provider streams tokens via SSE events: `delta` (token), `done` (final), `error`.
6. Stores both user and assistant messages in `messages` table. Increments `usage_daily.message_count`.
7. Returns `Sse<ReceiverStream<...>>` Axum response.

### Billing / Stripe flow
1. `POST /api/billing/create-checkout-session` → auth → validation `{ plan: 'pro'|'team', interval: 'monthly'|'yearly' }`.
2. `get_or_create_stripe_customer()` upserts a row in `subscriptions` with `stripe_customer_id`.
3. `async-stripe` creates a checkout session; frontend redirects to hosted checkout URL.
4. On payment success, Stripe sends webhook to `POST /api/billing/webhook` (raw body, no auth, no CSRF).
5. Handler verifies Stripe signature, then dispatches by event type:
   - `checkout.session.completed`, `invoice.paid` → `sync_subscription()` upserts `subscriptions`.
   - `invoice.payment_failed` → sets `status = 'past_due'`.
   - `customer.subscription.updated` → `sync_subscription()`.
   - `customer.subscription.deleted` → resets to `plan_id = 'free'`.
6. `GET /api/billing/subscription` returns plan, limits, and today's usage for the frontend.

### Plan feature gates
`enforce_plan_limits(feature)` middleware reads the user's plan from the `plans` table and checks:

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
- `users` → `api_keys` (one per provider, AES-256-GCM encrypted).
- `users` → `subscriptions` → `plans` (feature limits, Stripe price IDs).
- `users` → `projects` (instructions, context_data) → `threads` → `messages` (role, content, provider, model, attachments JSON).
- `projects` → `project_members` (Team plan collaboration, role: viewer/editor/admin).
- `users` → `usage_daily` (message_count per day, used by `enforce_plan_limits("message")`).
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
POST  /verify-email-request
GET   /healthz
```

User:
```
GET    /api/users
POST   /api/update-user-data
POST   /api/update-api-key
GET    /api/api-keys
DELETE /api/api-keys/:provider
DELETE /api/users/me
```

Projects:
```
GET|POST        /api/projects
GET|PATCH|DELETE /api/projects/:projectId
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
POST  /api/billing/webhook                   raw body, no auth, no CSRF
POST  /api/billing/create-checkout-session   auth required
POST  /api/billing/create-portal-session     auth required
GET   /api/billing/subscription              auth required
POST  /api/billing/activate-license          auth required
```

Search:
```
GET   /api/search/projects    auth required
GET   /api/search/threads     auth required
GET   /api/search/messages    auth required
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

- Use parameterized SQL (`sqlx::query` with bind params) — never string-interpolate user inputs.
- Rust errors use `AppError` enum → JSON `{ error: ... }` responses with proper HTTP status codes.
- Frontend error handling: set error state, render user-facing messages in French via i18n.
- Dev bypass mode: set `VITE_DEV_BYPASS_AUTH=true` (frontend) and `DEV_BYPASS_AUTH=true` (backend) for local dev without login.
- Chat streaming uses `fetch` + manual SSE line parsing with `AbortController` for cancellation; do not replace with `EventSource`.
- Chat drafts persist to localStorage keyed by `chat_draft:{userId}:{threadId}:{projectId}`.
- The Stripe webhook route requires raw request body for signature verification. Do not apply JSON parsing middleware to this route.
- `threads.id` is `TEXT` (UUID-style), not `INTEGER`. Do not assume numeric thread IDs.
- `ENCRYPTION_KEY` must remain constant after first API key is stored. Changing it corrupts stored keys. Backend uses AES-256-GCM with scrypt KDF (not crypto-js).
- `isTauri` flag (`'__TAURI_INTERNALS__' in window`) gates Tauri-specific behavior throughout the frontend. When `isTauri` is true, billing API calls are skipped and `planStore` defaults to `pro`.
- CSRF protection uses double-submit cookie pattern. Frontend must send `X-CSRF-Token` header matching `__csrf` cookie on mutating requests.

## Environment

- Frontend env: `frontend-svelte/.env` — uses `import.meta.env` (Vite). Key vars: `VITE_API_URL`, `VITE_DEV_BYPASS_AUTH`.
- Backend env: `backend-rust/.env` — uses `dotenvy`. Key vars: `SECRET_KEY`, `ENCRYPTION_KEY`, `PORT` (default 3001), `HOST` (default 0.0.0.0), `DB_CLIENT` (sqlite|postgres), `APP_URL`, `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`.
- SMTP vars (backend): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `EMAIL_REPLY_TO`. Optional DKIM: `DKIM_DOMAIN`, `DKIM_KEY_SELECTOR`, `DKIM_PRIVATE_KEY`.
- Stripe vars (backend): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, `STRIPE_TEAM_MONTHLY_PRICE_ID`, `STRIPE_TEAM_YEARLY_PRICE_ID`.
- Auth cookie config: `AUTH_COOKIE_NAME` (default `token`), `AUTH_COOKIE_MAX_AGE_DAYS` (default 7), `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_DOMAIN`.
- Never commit `.env` files.
