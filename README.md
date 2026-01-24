# Projet de Chatbot AI

Chatbot multi-fournisseurs (OpenAI, Gemini, Claude, Mistral) avec front React + Vite, back Express/SQLite et chiffrement des clés API côté base.

## Structure
Le projet est séparé en deux dossiers distincts :
- **Backend** (`backend/`) : Serveur Express, logique métier (Controllers), modèles (SQLite), et routes.
- **Frontend** (`frontend/`) : Application React avec Vite, organisée par fonctionnalités (`features/`).

### Architecture
- **Backend** :
    - `controllers/` : Logique métier (Auth, Chat, User, OpenAI).
    - `routes/` : Définition des endpoints API.
    - `models/` : Gestion de la base de données SQLite (`database/ChatData.db`).
- **Frontend** :
    - `features/` : Modules fonctionnels (`auth`, `chat`, `profile`).
    - `components/` : Composants UI réutilisables (`common`, `layout`).

## Prérequis
- Node.js 18+
- npm
- SQLite

## Installation

Installez les dépendances pour le frontend et le backend :

```bash
npm install # Installe les scripts racine
npm run install:all # Installe les dépendances dans frontend/ et backend/
```

Ou manuellement :
```bash
cd backend && npm install
cd ../frontend && npm install
```

## Variables d'environnement
Créer un fichier `.env` dans **`backend/`** (pour le serveur) et `.env` dans **`frontend/`** (si nécessaire).

**Backend (`backend/.env`)** :
```
SECRET_KEY=...           # JWT
ENCRYPTION_KEY=...       # Chiffre les clés API en base (AES)
EMAIL_USER=...           # Compte d'envoi d'email (reset MDP)
PASSWORD=...             # Mot de passe ou app password email
PORT=3000                # (optionnel) Port du back
OPENAI_API_KEY=...       # Clé maître OpenAI (si utilisé pour le chiffrement/déchiffrement interne)
```

**Frontend (`frontend/.env`)** :
```
VITE_API_URL=http://localhost:3000   # URL de l'API Backend
```

## Lancement

Depuis la racine du projet, vous pouvez utiliser les commandes suivantes :

```bash
# Lancer le backend (http://localhost:3000)
npm run start:backend

# Lancer le frontend (http://localhost:5173)
npm run start:frontend
```

## Base de données
- Fichier : `database/ChatData.db` (créé automatiquement au démarrage du backend si absent).
- Tables : `users`, `api_keys`, `chat_history`, `password_resets`.

## Fonctionnalités
- **Authentification** : Inscription, Connexion, Réinitialisation de mot de passe.
- **Profil** : Gestion du compte, ajout des clés API personnelles (chiffrées).
- **Chat Multi-Modèles** : Discussion avec OpenAI, Gemini, Claude, Mistral.

## Débogage courant
- **Erreur de module** : Assurez-vous d'avoir lancé `npm install` dans les DEUX dossiers `frontend` et `backend`.
- **Base de données** : Si la base est verrouillée, assurez-vous qu'aucun autre processus n'y accède.

## Licence
MIT.
