# Projet de Chatbot AI

Chatbot multi-fournisseurs (OpenAI, Gemini, Claude, Mistral) avec front React + Vite, back Express/SQLite et chiffrement des clés API côté base.

## Structure
- **Back-end** (`backend/`) : serveur Express (`app.ts`), DB SQLite (`models/database.ts`), routes (`routes/`), contrôleurs (`controllers/`), middlewares.
- **Front-end** (`frontend/`) : app React + Vite, pages d’auth, composants UI, contexte utilisateur.
- **Base de données** (`database/ChatData.db`) : créée automatiquement au démarrage du back.

## Documentation utilisateur
- Guide utilisateur : `docs/guide-utilisateur.md`
- Déploiement o2switch/cPanel : `docs/deploiement-o2switch-cpanel.md`

## Mode dev (sans connexion)

Ce mode est reserve au developpement local. Il permet d'acceder aux routes protegees sans authentification.

### Frontend
```
VITE_DEV_BYPASS_AUTH=true
```

### Backend
```
DEV_BYPASS_AUTH=true
```

Fonctionnement :
- un utilisateur de dev est genere automatiquement
- les routes protegees acceptent les requetes sans JWT
- un badge "DEV MODE" apparait dans l'interface

## Prérequis
- Node.js 18+
- npm
- SQLite (embarqué via `sqlite3`)

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
Créer un fichier `.env` pour chaque partie :

`backend/.env` :
```
DB_CLIENT=sqlite         # sqlite | postgres

# SQLite (si DB_CLIENT=sqlite)
SQLITE_DB_PATH=./database/ChatData.db

# PostgreSQL (si DB_CLIENT=postgres)
# DATABASE_URL=postgresql://user:password@localhost:5432/chatgpt
# ou variables PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE
# PGSSL=false
# PGSSL_REJECT_UNAUTHORIZED=false

SECRET_KEY=...           # JWT
ENCRYPTION_KEY=...       # Chiffre les clés API en base
PORT=3000                # (optionnel) Port du back
APP_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
TRUST_PROXY=1

# SMTP (délivrabilité)
SMTP_HOST=...            # Ex: jean-nguyen.dev
SMTP_PORT=465
SMTP_SECURE=true
EMAIL_USER=...           # Compte d'envoi d'email
SMTP_PASSWORD=...        # Mot de passe ou app password
EMAIL_FROM="ChatBot <noreply@jean-nguyen.dev>"
REPLY_TO=noreply@jean-nguyen.dev
SMTP_DEBUG=false

# DKIM (optionnel)
DKIM_DOMAIN=jean-nguyen.dev
DKIM_SELECTOR=default
DKIM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

`frontend/.env` :
```
VITE_API_URL=http://localhost:3000   # Base d'URL API consommée par le front
```

## Lancement
Dans deux terminaux :
```bash
# Back (port 3000 par défaut)
npm run start:backend

# Front (Vite) — lit VITE_API_URL
npm run start:frontend
```
Ouvrir l’URL affichée par Vite (ex. http://localhost:5173). Le front appelle le back via `VITE_API_URL` (par défaut `http://localhost:3000`).

## Base de données
- Driver sélectionnable via `DB_CLIENT` : `sqlite` (défaut) ou `postgres`.
- SQLite : fichier `database/ChatData.db` (créé au démarrage si absent).
- PostgreSQL : schéma et index créés automatiquement au démarrage.
- Tables : `users`, `api_keys` (clés chiffrées AES), `chat_history`, `password_resets`.
- Lecture rapide : `sqlite3 database/ChatData.db` puis `.tables`, `.schema users`, `SELECT * FROM users LIMIT 5;`.

## Fonctionnalités backend
- Authentification : `/register`, `/login`, reset mot de passe.
- Profil : update username/password, stockage chiffré des clés API par provider (`openai`, `gemini`, `claude`, `mistral`).
- Chat : `/api/chat/message` routé vers le provider selon `provider` dans le payload.

## Débogage courant
- Erreur `MODULE_NOT_FOUND @google/generative-ai` ou similaires : exécuter `npm install` (dépendances ajoutées : `@google/generative-ai`, `@anthropic-ai/sdk`, `@mistralai/mistralai`).
- Port utilisé : ajuster `PORT` et `VITE_API_URL` si 3000 est pris.
- L’URL de reset/vérification est basée sur `APP_URL` (obligatoire).

## Licence
MIT.
