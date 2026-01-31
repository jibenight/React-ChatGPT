# Context

This document summarizes the React-ChatGPT project for fast onboarding.

## Project overview
- Full-stack multi-provider AI chat app.
- Monorepo with `frontend/` (React + Vite) and `backend/` (Express + SQLite).
- Supports OpenAI, Gemini, Claude, Mistral.
- Auth: registration + email verification + login + reset password.
- Persistent chat history, projects, threads, attachments (Gemini images).

## Tech stack
### Frontend
- React 19 + Vite 5.
- Tailwind CSS.
- @assistant-ui/react for chat UI.
- Zustand + axios.
- Router: react-router-dom.

### Backend
- Node.js + Express 4.
- SQLite3 DB.
- JWT auth.
- Nodemailer for email.
- SDKs: openai, @google/genai, @anthropic-ai/sdk, @mistralai/mistralai.

## Key routes
### Frontend routes
- `/` Home.
- `/login`, `/register`, `/reset-password-request`, `/reset-password`, `/verify-email`.
- `/guide` user-facing guide.
- `/chat` main app.
- `/projects` shows inside main layout (sidebar + right pane).

### Backend API
- Auth:
  - `POST /register`, `POST /login`
  - `POST /reset-password-request`, `POST /reset-password`
  - `GET /verify-email`, `POST /verify-email-request`
- User:
  - `POST /api/update-user-data`, `POST /api/update-api-key`
  - `GET /api/api-keys`, `DELETE /api/api-keys/:provider`
- Projects:
  - `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:projectId`
- Threads:
  - `GET/POST /api/threads`, `GET/POST /api/projects/:projectId/threads`
  - `PATCH/DELETE /api/threads/:threadId`
- Chat:
  - `POST /api/chat/message`

## Database
SQLite file: `database/ChatData.db`.

Tables:
- `users` (email_verified added).
- `api_keys` (encrypted keys).
- `projects` (instructions, context_data).
- `threads` (project_id, last_message_at).
- `messages` (attachments).
- `password_resets`.
- `email_verifications`.

## Email system
- SMTP configurable via env.
- Reset email + verification email are HTML and French.
- Verification link auto-logs user in.

Relevant env:
- `APP_URL` (used for reset/verify links; fallback to request Origin).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL_USER`, `PASSWORD`.
- Optional: `EMAIL_FROM`, `REPLY_TO`, `SMTP_DEBUG`.

## Auth flow
- Register creates user with `email_verified=0`.
- Email verification required before login.
- `/verify-email` returns JWT + user data for auto-login.
- Resend verification supported with cooldown in UI.
- Rate limiting on auth routes (express-rate-limit).
- Anti-enumeration responses for reset and resend.

## Dev bypass mode (no login)
- Frontend env: `VITE_DEV_BYPASS_AUTH=true`.
- Backend env: `DEV_BYPASS_AUTH=true`.
- Front `PrivateRoute` generates dev user and sets headers `X-Dev-User-*`.
- Backend middleware creates dev user in DB if missing.
- Badge "DEV MODE" shown in chat/profile/projects.

## Chat UX upgrades
- Retry last message on error.
- Draft autosave per thread (localStorage).
- Search with highlighting, navigation, keyboard shortcuts.
- Mobile search panel with slide/summary.
- Messages virtualized using `@tanstack/react-virtual`.

## Layout notes
- Sidebar fixed with main pane scroll (`App.jsx` uses `overflow-hidden` + `min-h-0`).
- Profile and Projects are right-pane views with `h-screen` and internal scroll.
- Projects shows inside main layout, with top-right "Fermer".

## User guide (non-technical)
- `docs/guide-utilisateur.md`
- Online page: `/guide`.

## Recent notable changes
- Dark mode coverage across auth/chat/projects/profile.
- Custom favicon in `frontend/public/favicon.svg`.
- Email deliverability improvements + optional DKIM support.

## Commands
From repo root:
- Install: `npm run install:all`.
- Start backend: `npm run start:backend`.
- Start frontend: `npm run start:frontend`.

## Files of interest
- `frontend/src/App.jsx` layout.
- `frontend/src/features/chat/ChatZone.jsx` chat logic/search/retry.
- `frontend/src/components/assistant-ui/thread.jsx` virtualized messages + draft.
- `backend/controllers/authController.js` auth + email.
- `backend/middlewares/isAuthenticated.js` JWT and dev bypass.
- `backend/models/database.js` schema + migrations.
