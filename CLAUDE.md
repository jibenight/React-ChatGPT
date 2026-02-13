# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Full-stack multi-provider AI chatbot (OpenAI, Gemini, Claude, Mistral, Groq).
Monorepo: `frontend/` (React 19 + Vite 5 + Tailwind 4) and `backend/` (Express 4 + SQLite/PostgreSQL).
Also configurable as pnpm workspace (`pnpm dev` runs both apps in parallel).

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
- UI text is in French — do not mix languages.
- TypeScript is non-strict (`strict: false`); keep typings minimal.

## Naming conventions

- React components: `PascalCase` filenames and exports.
- Hooks/handlers: `camelCase` (e.g., `useUser`, `handleSend`).
- Constants: `UPPER_SNAKE_CASE` for true constants.
- Backend route handlers: `exports.<name> = ...`.

## Architecture

### Frontend
- Entry: `frontend/src/index.tsx`, layout: `frontend/src/App.tsx`.
- Features organized by domain: `features/chat/`, `features/auth/`, `features/profile/`, `features/projects/`.
- UI components: `components/ui/` (Radix primitives), `components/assistant-ui/` (AI thread/message), `components/common/` (Modal, Dropdown).
- State: Zustand store (`stores/appStore.ts`) persists `selectedOption` and `projectMode` to localStorage. User session via React Context (`UserContext.tsx`).
- HTTP: `apiClient.ts` (axios with `withCredentials: true` for cookie auth). Streaming chat uses `fetch` with manual SSE parsing (not EventSource, to support custom headers).
- Auth guard: `PrivateRoute.tsx` checks `localStorage('user')`, supports dev bypass.

### Backend
- Entry: `backend/app.ts` — middleware stack, route registration, hourly token cleanup.
- Routes: `backend/routes/*`, controllers: `backend/controllers/*`.
- DB: `backend/models/database.ts` — adapter pattern wrapping SQLite callbacks and PostgreSQL async into a unified `{ run, get, all, serialize, close }` interface. SQL uses `?` placeholders; the adapter auto-converts to `$1, $2...` for PostgreSQL.
- Auth: JWT via HttpOnly cookie (`isAuthenticated` middleware). API keys encrypted with AES-256 (`ENCRYPTION_KEY` env via crypto-js).
- Validation: Zod schemas in `middlewares/validate.ts`, applied per-route.

### Chat message flow
1. `POST /api/chat/message` → auth middleware → Zod validation → rate limit (30/min).
2. Controller decrypts user's API key for the selected provider.
3. Loads project context (instructions + context_data) and last 50 thread messages.
4. Routes to provider SDK: OpenAI (custom axios streaming), Gemini (file upload + generateContent), Claude (messages.create), Mistral (client.chat), Groq (fetch streaming).
5. Streams response via SSE events: `delta` (token), `done` (final), `error`.
6. Stores both user and assistant messages in `messages` table.

### Data model
- `users` → `api_keys` (one per provider, AES-encrypted).
- `users` → `projects` (instructions, context_data) → `threads` → `messages` (role, content, provider, model, attachments JSON).
- `password_resets` and `email_verifications` with expiry tokens.

### Key API routes
- Auth: `POST /register`, `POST /login`, `POST /logout`, `POST /reset-password-request`, `POST /reset-password`, `GET /verify-email`.
- User: `GET /api/users`, `POST /api/update-user-data`, `POST /api/update-api-key`, `GET /api/api-keys`, `DELETE /api/api-keys/:provider`.
- Projects: `GET|POST /api/projects`, `GET|PATCH|DELETE /api/projects/:projectId`, `GET|POST /api/projects/:projectId/threads`.
- Threads: `GET|POST /api/threads`, `GET /api/threads/:threadId/messages`, `PATCH|DELETE /api/threads/:threadId`.
- Chat: `POST /api/chat/message`.
- Health: `GET /healthz`.

## Important patterns

- Use parameterized SQL — never string-interpolate user inputs.
- Return JSON errors: `res.status(...).json({ error: ... })`.
- Frontend error handling: set error state, render user-facing messages in French.
- Dev bypass mode: set `VITE_DEV_BYPASS_AUTH=true` (frontend) and `DEV_BYPASS_AUTH=true` (backend) for local dev without login.
- Chat streaming uses `fetch` + manual SSE line parsing with `AbortController` for cancellation; do not replace with `EventSource`.
- Chat drafts persist to localStorage keyed by `chat_draft:{userId}:{threadId}:{projectId}`.

## Environment

- Frontend env: `frontend/.env` — uses `import.meta.env` (Vite). Key vars: `VITE_API_URL`, `VITE_DEV_BYPASS_AUTH`.
- Backend env: `backend/.env` — uses `dotenv`. Key vars: `APP_URL`, `SECRET_KEY`, `ENCRYPTION_KEY`, `SMTP_*`, `DB_CLIENT`, `CORS_ALLOWED_ORIGINS`.
- Never commit `.env` files.
