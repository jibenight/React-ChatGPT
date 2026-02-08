# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Project overview

Full-stack multi-provider AI chatbot (OpenAI, Gemini, Claude, Mistral).
Monorepo: `frontend/` (React 19 + Vite 5 + Tailwind 4) and `backend/` (Express 4 + SQLite/PostgreSQL).

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
- Backend: mixed CommonJS (`require`) and TS; match existing style per file.
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
- Chat: `frontend/src/features/chat/ChatZone.tsx`.
- Auth: `frontend/src/features/auth/*`.
- UI components: `frontend/src/components/ui/` and `frontend/src/components/assistant-ui/`.
- State: Zustand stores. HTTP: axios (`apiClient`). Streaming: `fetch` with SSE.

### Backend
- Entry: `backend/app.ts`.
- Routes: `backend/routes/*`, controllers: `backend/controllers/*`.
- DB schema: `backend/models/database.ts`.
- DB adapter supports SQLite (`DB_CLIENT=sqlite`) and PostgreSQL (`DB_CLIENT=postgres`).
- Auth: JWT via HttpOnly cookie. API keys encrypted with AES (`ENCRYPTION_KEY`).

### Key API routes
- Auth: `POST /register`, `POST /login`, `POST /reset-password-request`, `POST /reset-password`, `GET /verify-email`.
- User: `POST /api/update-user-data`, `POST /api/update-api-key`, `GET /api/api-keys`.
- Projects: `GET|POST /api/projects`, `GET|PATCH|DELETE /api/projects/:projectId`.
- Threads: `GET|POST /api/threads`, `PATCH|DELETE /api/threads/:threadId`.
- Chat: `POST /api/chat/message`.
- Health: `GET /healthz`.

## Important patterns

- Use parameterized SQL — never string-interpolate user inputs.
- Return JSON errors: `res.status(...).json({ error: ... })`.
- Frontend error handling: set error state, render user-facing messages.
- Dev bypass mode: set `VITE_DEV_BYPASS_AUTH=true` (frontend) and `DEV_BYPASS_AUTH=true` (backend) for local dev without login.

## Environment

- Frontend env: `frontend/.env` — uses `import.meta.env` (Vite).
- Backend env: `backend/.env` — uses `dotenv`.
- Key vars: `APP_URL`, `SECRET_KEY`, `ENCRYPTION_KEY`, `SMTP_*`, `DB_CLIENT`.
- Never commit `.env` files.
