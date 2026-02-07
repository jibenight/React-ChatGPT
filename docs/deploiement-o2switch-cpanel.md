# Déploiement production sur o2switch (cPanel + Node.js + SSH)

Ce guide cible une architecture simple et robuste sur o2switch :
- Frontend React (Vite) servi en statique (Apache/cPanel).
- Backend Express servi via `Setup Node.js App` (Phusion Passenger).

## 1) Architecture recommandée

- Frontend :
  - Domaine principal, par exemple `https://app.domaine.tld` (ou `https://domaine.tld`).
  - Fichiers statiques générés depuis `frontend/dist`.
- Backend :
  - Sous-domaine dédié, par exemple `https://api.domaine.tld`.
  - Application Node.js créée dans cPanel.
  - Racine applicative hors `public_html` (important pour la sécurité).

## 2) Préparer le backend (Node.js App cPanel)

Dans cPanel -> `Setup Node.js App` :
- `Node.js version` : prendre la plus récente disponible (idéalement LTS moderne).
- `Application mode` : `Production`.
- `Application root` : ex. `/home/<cpanel_user>/nodeapps/chatbot-backend`.
- `Application URL` : ex. `api.domaine.tld`.
- `Application startup file` : `server.js`.

Le projet backend doit contenir :
- `server.js` (startup file cPanel).
- `dist/app.js` (généré par `npm run build`).

## 3) Installer et builder via SSH

1. Depuis cPanel, copier la commande `source ... && cd ...` fournie dans la page Node.js App.
2. En SSH, exécuter ensuite :

```bash
npm install
npm run build
```

## 4) Variables d’environnement backend (obligatoires)

Configurer ces variables dans l’interface cPanel Node.js App (ou dans `.env` côté backend) :

```bash
NODE_ENV=production
TRUST_PROXY=1

SECRET_KEY=<jwt-secret-long>
ENCRYPTION_KEY=<32+ chars>

APP_URL=https://app.domaine.tld
CORS_ALLOWED_ORIGINS=https://app.domaine.tld,https://www.app.domaine.tld

SMTP_HOST=<smtp-host>
SMTP_PORT=465
SMTP_SECURE=true
EMAIL_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
EMAIL_FROM="ChatBot <noreply@domaine.tld>"
REPLY_TO=noreply@domaine.tld
SMTP_DEBUG=false
```

Variables cookies (optionnelles, utiles selon ton setup) :

```bash
AUTH_COOKIE_NAME=auth_token
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax
# AUTH_COOKIE_DOMAIN=.domaine.tld
# AUTH_COOKIE_MAX_AGE_DAYS=7
```

Notes :
- `AUTH_COOKIE_SAMESITE=none` impose `AUTH_COOKIE_SECURE=true`.
- Si front et API sont sur le même domaine/sous-domaine racine, `lax` convient.

## 5) Redémarrer l’application Node.js

- Utiliser le bouton `Restart` dans `Setup Node.js App`.
- En cas de modification des variables, redémarrer après chaque changement.

## 6) Déployer le frontend Vite (statique)

Avant build, définir `frontend/.env.production` :

```bash
VITE_API_URL=https://api.domaine.tld
```

Puis construire le front :

```bash
cd frontend
npm install
npm run build
```

Uploader le contenu de `frontend/dist/` dans le dossier web cible (`public_html` ou sous-dossier).

Le fichier `frontend/public/.htaccess` est inclus au build pour gérer le fallback SPA (routes React).

## 7) Vérifications post-déploiement

Checks backend :

```bash
curl -i https://api.domaine.tld/healthz
```

Résultat attendu : HTTP `200` + JSON `{"status":"ok",...}`.

Checks applicatifs :
- Inscription utilisateur.
- Vérification email.
- Connexion (cookie de session).
- Création/profil/projet/thread.
- Envoi d’un message chat.
- Déconnexion puis accès route protégée (doit répondre `401`).

## 8) Checklist sécurité production

- `DEV_BYPASS_AUTH` absent (ou `false`).
- Secrets longs et uniques (`SECRET_KEY`, `ENCRYPTION_KEY`).
- Origines CORS strictes (pas de `*`).
- Sous-domaine API séparé du frontend.
- Sauvegardes régulières de la base SQLite (`database/ChatData.db`).
