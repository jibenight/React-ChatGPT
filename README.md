# Projet de Chatbot AI

Chatbot multi-fournisseurs (OpenAI, Gemini, Claude, Mistral) avec front React + Vite, back Express/SQLite et chiffrement des clés API côté base.

## Structure
- **Back-end** (`Back-end/`) : `app.js` (serveur Express), `models/database.js` (SQLite `database/ChatData.db` auto-créée), routes `auth.js` (inscription/connexion), `users-api.js` (profil + clés API), `chatApi.js` (requêtes IA), middlewares.
- **Front-end** (`src/`) : routes `login.jsx`, `register.jsx`, `resetPassword*.jsx`, composants (`Aside`, `ChatZone`, `Profil`, etc.), contexte utilisateur `UserContext.jsx`.
- **Tests API** : collection Bruno dans `REact chat /` (`bruno.json`, `reggister.bru`).

## Prérequis
- Node.js 18+
- npm
- SQLite (embarqué via `sqlite3`)

## Installation
```bash
npm install
```

## Variables d'environnement
Créer un fichier `.env` à la racine (ou `.env.local` pour Vite) :
```
SECRET_KEY=...           # JWT
ENCRYPTION_KEY=...       # Chiffre les clés API en base
ACCOUNT_USER=...         # Compte d'envoi d'email (reset MDP)
PASSWORD=...             # Mot de passe ou app password
VITE_API_URL=http://localhost:3000   # Base d'URL API consommée par le front
PORT=3000                # (optionnel) Port du back
```

## Lancement
Dans deux terminaux :
```bash
# Back (port 3000 par défaut)
npm run serve

# Front (Vite) — lit VITE_API_URL
npm run dev
```
Ouvrir l’URL affichée par Vite (ex. http://localhost:5173). Le front appelle le back via `VITE_API_URL` (par défaut `http://localhost:3000`).

## Base de données
- Fichier : `database/ChatData.db` (créé au démarrage si absent).
- Tables : `users`, `api_keys` (clés chiffrées AES), `chat_history`, `password_resets`.
- Lecture rapide : `sqlite3 database/ChatData.db` puis `.tables`, `.schema users`, `SELECT * FROM users LIMIT 5;`.

## Fonctionnalités backend
- Authentification : `/register`, `/login`, reset mot de passe.
- Profil : update username/password, stockage chiffré des clés API par provider (`openai`, `gemini`, `claude`, `mistral`).
- Chat : `/api/chat/message` routé vers le provider selon `provider` dans le payload.

## Débogage courant
- Erreur `MODULE_NOT_FOUND @google/generative-ai` ou similaires : exécuter `npm install` (dépendances ajoutées : `@google/generative-ai`, `@anthropic-ai/sdk`, `@mistralai/mistralai`).
- Port utilisé : ajuster `PORT` et `VITE_API_URL` si 3000 est pris.

## Licence
MIT.
