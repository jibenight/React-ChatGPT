# Projet ChatBot AI

Chatbot multi-fournisseurs (OpenAI, Gemini, Claude, Mistral) avec :
- Frontend React + Vite + Tailwind.
- Backend Express avec authentification par cookie HttpOnly.
- Base de données sélectionnable : SQLite ou PostgreSQL.

## Structure
- `frontend/` : application React (routes auth/chat/profil/projets/guide).
- `backend/` : API Express, contrôleurs, middlewares, adaptateur DB (`sqlite` ou `postgres`).
- `database/` : base SQLite locale (si `DB_CLIENT=sqlite`).
- `docs/` : documentation utilisateur et déploiement.

## Documentation
- Guide utilisateur : `docs/guide-utilisateur.md`
- Déploiement o2switch/cPanel : `docs/deploiement-o2switch-cpanel.md`

## Fonctionnalités principales
- Authentification complète : inscription, vérification email, login, logout, reset password.
- Session sécurisée par cookie HttpOnly (plus de token JWT exposé côté frontend).
- Chat multi-providers avec stockage des conversations et gestion des threads/projets.
- Clés API chiffrées en base (AES via `ENCRYPTION_KEY`).
- Endpoint de santé backend : `GET /healthz`.

## Mode dev (bypass auth local)
Usage strictement local, jamais en production.

### Frontend
```bash
VITE_DEV_BYPASS_AUTH=true
```

### Backend
```bash
DEV_BYPASS_AUTH=true
```

## Prérequis
- Node.js 18+
- npm
- SQLite (embarqué via `sqlite3`) si mode SQLite
- PostgreSQL (serveur externe) si mode Postgres

## Installation
```bash
npm run install:all
```

Ou manuellement :
```bash
cd frontend && npm install
cd ../backend && npm install
```

## Variables d'environnement
Créer un `.env` dans `backend/` et `frontend/`.

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
# ou PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE
# PGSSL=false
# PGSSL_REJECT_UNAUTHORIZED=false

# Security
SECRET_KEY=change-me
ENCRYPTION_KEY=change-me

# Front origin / CORS
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

## Lancement local
Dans deux terminaux :
```bash
# backend
npm run start:backend

# frontend
npm run start:frontend
```

Le frontend s’ouvre via Vite (ex: `http://localhost:5173`) et appelle l’API via `VITE_API_URL`.

## Scripts utiles
### Racine
```bash
npm run install:all
npm run start:backend
npm run start:frontend
```

### Backend
```bash
cd backend
npm run dev
npm run build
npm run start
npm run start:cpanel
```

### Frontend
```bash
cd frontend
npm run dev
npm run build
npm run preview
```

## Base de données
- `DB_CLIENT=sqlite` : fichier local `database/ChatData.db`.
- `DB_CLIENT=postgres` : schéma et index créés automatiquement au démarrage.
- Tables principales : `users`, `api_keys`, `chat_history`, `password_resets`, `email_verifications`, `projects`, `threads`, `messages`.

## Déploiement
Pour o2switch/cPanel (Node.js app + SSH), suivre :
`docs/deploiement-o2switch-cpanel.md`

## Débogage rapide
- Vérifier la santé de l’API :
```bash
curl -i http://localhost:3000/healthz
```
- Si dépendance provider manquante, relancer `npm install` dans `backend/`.
- Si CORS bloque, vérifier `APP_URL` et `CORS_ALLOWED_ORIGINS`.
- Si mail KO, vérifier `SMTP_*` et credentials.

## Licence
MIT
