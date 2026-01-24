# Projet de Chatbot AI

Chatbot multi-fournisseurs (OpenAI, Gemini, Claude, Mistral) avec front React + Vite, back Express/SQLite et chiffrement des clés API côté base.

## Structure
- **Backend** (`backend/`) : `app.js` (serveur Express), `models/database.js` (SQLite `database/ChatData.db` auto-créée), routes `auth.js` (inscription/connexion), `users-api.js` (profil + clés API), `chatApi.js` (requêtes IA), middlewares.
- **Frontend** (`frontend/`) : `src/` contenant les routes `login.jsx`, `register.jsx`, `resetPassword*.jsx`, composants (`Aside`, `ChatZone`, `Profil`, etc.), contexte utilisateur `UserContext.jsx`.

## Prérequis
- Node.js 18+
- npm
- SQLite (embarqué via `sqlite3`)

## Installation
Depuis la racine du projet :
```bash
npm run install:all
```

## Variables d'environnement

### Backend
Créer un fichier `.env` dans le dossier `backend/` :
```
SECRET_KEY=...           # JWT
ENCRYPTION_KEY=...       # Chiffre les clés API en base
ACCOUNT_USER=...         # Compte d'envoi d'email (reset MDP)
PASSWORD=...             # Mot de passe ou app password
PORT=3000                # (optionnel) Port du back
```

### Frontend
Créer un fichier `.env` ou `.env.local` dans le dossier `frontend/` :
```
VITE_API_URL=http://localhost:3000   # Base d'URL API consommée par le front
```

## Lancement
Depuis la racine, dans deux terminaux séparés :

```bash
# Backend (port 3000 par défaut)
npm run start:backend

# Frontend (Vite)
npm run start:frontend
```
Ouvrir l’URL affichée par Vite (ex. http://localhost:5173). Le front appelle le back via `VITE_API_URL` (par défaut `http://localhost:3000`).

## Base de données
- Fichier : `database/ChatData.db` (situé à la racine, créé au démarrage si absent).
- Tables : `users`, `api_keys` (clés chiffrées AES), `chat_history`, `password_resets`.
- Lecture rapide : `sqlite3 database/ChatData.db` puis `.tables`, `.schema users`, `SELECT * FROM users LIMIT 5;`.

## Fonctionnalités backend
- Authentification : `/register`, `/login`, reset mot de passe.
- Profil : update username/password, stockage chiffré des clés API par provider (`openai`, `gemini`, `claude`, `mistral`).
- Chat : `/api/chat/message` routé vers le provider selon `provider` dans le payload.

## Débogage courant
- Erreur `MODULE_NOT_FOUND @google/generative-ai` ou similaires : vérifier que `npm install` a bien été exécuté dans le dossier `backend`.
- Port utilisé : ajuster `PORT` et `VITE_API_URL` si 3000 est pris.

## Licence
MIT.
