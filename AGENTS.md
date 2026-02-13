# AGENTS.md

This file guides agentic coding assistants working in this repo.

## Repository Overview
- Monorepo with `frontend/` (React + Vite + Tailwind) and `backend/` (Express + SQLite).
- Frontend uses React 19, Vite 5, Tailwind CSS, Zustand, axios, @assistant-ui.
- Backend uses Express 4, sqlite3, JWT auth, nodemailer, provider SDKs.

## Rules From Other Tools
- `.cursor/rules/`: not present
- `.cursorrules`: not present
- `.github/copilot-instructions.md`: not present

## Quick Start
- Install all deps: `npm run install:all`
- Start backend: `npm run start:backend`
- Start frontend: `npm run start:frontend`
- Start frontend + backend with pnpm workspace: `pnpm dev`

## Build / Lint / Test Commands
### Root
- Install deps for both apps: `npm run install:all`
- Start backend (dev watch): `npm run start:backend`
- Start frontend (Vite dev server): `npm run start:frontend`
- Start backend + frontend in parallel (pnpm workspace): `pnpm dev`

### Frontend (`frontend/`)
- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`

### Backend (`backend/`)
- Dev server (tsx watch): `npm run dev`
- Build TypeScript: `npm run build`
- Start built app: `npm run start`

### Linting
- No lint scripts configured in `package.json`.
- If you add linting, update this file with exact commands.

### Tests
- No test runner configured in `package.json` (frontend or backend).
- Running a single test is not currently supported; add a test framework
  (e.g., Vitest/Jest for frontend, Jest for backend) before documenting
  a single-test command.

## Code Style Guidelines
Follow existing conventions in the touched files. This codebase is mixed JS/TS
with relaxed TypeScript settings (`strict: false`). Keep changes consistent.

### General
- Use 2-space indentation and semicolons.
- Prefer single quotes for strings (JS/TS/JSX), except where template literals
  are clearer.
- Keep functions small; favor early returns for error cases.
- Avoid introducing new libraries unless necessary; reuse existing utilities.

### Imports
- Frontend imports are ESM; backend uses CommonJS `require` in many files.
- Keep imports grouped and in file-local order (existing pattern):
  1) external packages, 2) internal modules, 3) relative files.
- Frontend supports `@/` alias to `frontend/src`.
- Preserve existing import style in each file (do not mix `require` and `import`
  in the same backend file unless already present).

### Naming Conventions
- React components: `PascalCase` filenames and exports (e.g., `ChatZone`).
- Hooks and handlers: `camelCase` (e.g., `handleSend`, `useUser`).
- Constants: `UPPER_SNAKE_CASE` only for true constants; otherwise `camelCase`.
- Backend route handlers exported via `exports.<name> = ...` (existing style).

### TypeScript / Types
- TS is non-strict; keep typings minimal and pragmatic.
- Use inline types where helpful (e.g., `type ChatMessage = ...`).
- Avoid adding heavy generics; prefer simple `Record<string, any>` or
  narrow unions when necessary.
- Frontend JSX uses `.tsx` files; backend uses `.ts` but often CommonJS.

### React / Frontend Patterns
- Function components with hooks; no class components.
- State in component via `useState`/`useMemo`/`useCallback`.
- Use `useEffect` cleanup patterns as already implemented.
- Prefer Tailwind classes in `className`; avoid inline styles unless needed.
- For UI reuse, check `frontend/src/components/ui` and `frontend/src/components/assistant-ui`.
- Keep UI text in French where existing strings are French (do not mix languages).

### Tailwind / Styling
- Tailwind is the primary styling system (no CSS-in-JS).
- Use existing color scales and dark-mode classes (`dark:`) when matching UI.
- Keep class ordering consistent with existing files (utility grouping).

### API / Data Handling (Frontend)
- Use `apiClient` (axios instance) for REST calls.
- For streaming chat, use `fetch` with `text/event-stream` as in `ChatZone`.
- Read auth token from `localStorage` (`token` key) as in existing code.
- Respect dev bypass mode (`VITE_DEV_BYPASS_AUTH`) in headers when required.

### Backend Patterns
- Express routes registered in `backend/app.ts`.
- Controllers in `backend/controllers/*` and routes in `backend/routes/*`.
- Database uses sqlite3 with callback-based API (`db.get`, `db.run`).
- Prefer parameterized SQL; do not string-interpolate user inputs.
- Return JSON errors with `res.status(...).json({ error: ... })`.

### Error Handling
- Frontend: set error state and render user-facing messages.
- Backend: validate input early; return proper HTTP status codes.
- Log errors with `console.error` or `console.warn` and keep sensitive data out
  of logs (see `logAuthEvent` patterns).

### Environment / Config
- Frontend uses Vite env (`import.meta.env`).
- Backend reads `.env` via `dotenv` at startup.
- Relevant envs (non-exhaustive): `APP_URL`, `SMTP_*`, `SECRET_KEY`,
  `DEV_BYPASS_AUTH`, `VITE_DEV_BYPASS_AUTH`.

## File/Folder Notes
- Frontend entry: `frontend/src/index.tsx`.
- App layout: `frontend/src/App.tsx`.
- Chat logic: `frontend/src/features/chat/ChatZone.tsx`.
- Auth flows: `frontend/src/features/auth/*`.
- Backend entry: `backend/app.ts`.
- Database schema: `backend/models/database.ts`.

## When Adding New Code
- Match the file's existing language (TS/JS) and module system.
- Keep code formatting consistent with nearby lines.
- Update `AGENTS.md` if you add lint/test tooling or new workflow commands.
