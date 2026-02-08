# Documentation API

## Sommaire

- [Authentification](#authentification)
- [Auth](#auth)
- [Utilisateurs](#utilisateurs)
- [Projets](#projets)
- [Threads](#threads)
- [Chat](#chat)
- [Erreurs communes](#erreurs-communes)

---

## Authentification

L'API utilise des **JSON Web Tokens (JWT)** transmis via un cookie HTTP-only (`auth_token` par defaut, configurable via `AUTH_COOKIE_NAME`).

Le token est emis lors de la connexion ou de la verification d'email, et expire au bout de **7 jours**.

Les routes protegees acceptent le token de deux facons :
- **Cookie** : `auth_token=<jwt>` (methode principale)
- **Header** : `Authorization: Bearer <jwt>`

En mode developpement (`DEV_BYPASS_AUTH=true`, `NODE_ENV != production`), l'authentification peut etre contournee via les headers `X-Dev-User-Email` et `X-Dev-User-Name`.

### Reponse en cas d'echec d'authentification

```json
{ "error": "Unauthorized" }
```
Code HTTP : `401`

---

## Auth

Toutes les routes auth sont montees sur `/` (pas de prefixe).

### POST /register

Inscription d'un nouvel utilisateur. Un email de verification est envoye automatiquement.

**Rate limit** : 5 requetes / 15 minutes

**Authentification** : Non requise

**Corps de la requete** :

| Champ      | Type     | Requis | Contraintes                  |
|------------|----------|--------|------------------------------|
| `username` | `string` | Oui    | min: 1, max: 100 caracteres  |
| `email`    | `string` | Oui    | Format email valide           |
| `password` | `string` | Oui    | min: 8, max: 128 caracteres. Doit contenir au moins 1 majuscule, 1 minuscule et 1 chiffre |

**Reponses** :

- `201` : Inscription reussie
  ```json
  {
    "message": "User registered successfully",
    "userId": 1,
    "emailVerificationRequired": true
  }
  ```
- `400` : Email deja utilise
  ```json
  { "error": "exists" }
  ```
- `400` : Mot de passe trop faible
  ```json
  { "error": "characters" }
  ```

---

### POST /login

Connexion d'un utilisateur existant. Definit le cookie d'authentification.

**Rate limit** : 10 requetes / 15 minutes

**Authentification** : Non requise

**Corps de la requete** :

| Champ      | Type     | Requis | Contraintes        |
|------------|----------|--------|--------------------|
| `email`    | `string` | Oui    | Format email valide |
| `password` | `string` | Oui    | min: 1 caractere    |

**Reponses** :

- `200` : Connexion reussie (cookie `auth_token` defini)
  ```json
  {
    "message": "Login successful",
    "userId": 1,
    "username": "jean",
    "email": "jean@example.com",
    "email_verified": 1
  }
  ```
- `401` : Identifiants invalides
  ```json
  { "error": "invalid_credentials" }
  ```
- `403` : Email non verifie
  ```json
  { "error": "email_not_verified" }
  ```

---

### POST /logout

Deconnexion de l'utilisateur. Supprime le cookie d'authentification.

**Rate limit** : Aucun

**Authentification** : Non requise (le cookie est simplement supprime)

**Corps de la requete** : Aucun

**Reponse** :

- `200` :
  ```json
  { "message": "Logout successful" }
  ```

---

### POST /reset-password-request

Demande de reinitialisation du mot de passe. Un email avec un lien de reinitialisation est envoye.

**Rate limit** : 5 requetes / 15 minutes

**Authentification** : Non requise

**Corps de la requete** :

| Champ   | Type     | Requis | Contraintes        |
|---------|----------|--------|--------------------|
| `email` | `string` | Oui    | Format email valide |

**Reponse** :

- `200` : Toujours la meme reponse (pour ne pas reveler si l'email existe)
  ```json
  { "message": "Reset email sent" }
  ```

---

### POST /reset-password

Reinitialisation du mot de passe avec un token recu par email. Le token expire au bout d'1 heure.

**Rate limit** : 5 requetes / 15 minutes

**Authentification** : Non requise

**Corps de la requete** :

| Champ         | Type     | Requis | Contraintes                    |
|---------------|----------|--------|--------------------------------|
| `token`       | `string` | Oui    | min: 1 caractere                |
| `newPassword` | `string` | Oui    | min: 8, max: 128 caracteres. Doit contenir 1 majuscule, 1 minuscule et 1 chiffre |

**Reponses** :

- `200` :
  ```json
  { "message": "Password reset successfully" }
  ```
- `400` : Mot de passe trop faible
- `404` : Token invalide ou expire
  ```json
  { "error": "Invalid or expired token" }
  ```

---

### GET /verify-email

Verification de l'adresse email via un token. Le token expire au bout de 24 heures. En cas de succes, un cookie d'authentification est automatiquement defini.

**Rate limit** : 5 requetes / 15 minutes

**Authentification** : Non requise

**Parametres query** :

| Champ   | Type     | Requis | Contraintes       |
|---------|----------|--------|-------------------|
| `token` | `string` | Oui    | min: 1 caractere   |

**Reponses** :

- `200` : Email verifie (cookie `auth_token` defini)
  ```json
  {
    "message": "Email verified successfully",
    "userId": 1,
    "username": "jean",
    "email": "jean@example.com"
  }
  ```
- `404` : Token invalide ou expire
  ```json
  { "error": "Invalid or expired token" }
  ```

---

### POST /verify-email-request

Renvoyer l'email de verification pour un utilisateur non verifie.

**Rate limit** : 5 requetes / 15 minutes

**Authentification** : Non requise

**Corps de la requete** :

| Champ   | Type     | Requis | Contraintes        |
|---------|----------|--------|--------------------|
| `email` | `string` | Oui    | Format email valide |

**Reponse** :

- `200` : Toujours la meme reponse (pour ne pas reveler si l'email existe)
  ```json
  { "message": "Verification email sent" }
  ```

---

## Utilisateurs

Toutes les routes utilisateur sont montees sur `/` (les chemins incluent `/api/`).

### GET /api/users

Recuperer les informations de l'utilisateur connecte.

**Rate limit** : 20 requetes / minute

**Authentification** : Requise

**Reponse** :

- `200` : Tableau contenant l'utilisateur courant
  ```json
  [
    {
      "id": 1,
      "username": "jean",
      "email": "jean@example.com",
      "email_verified": 1
    }
  ]
  ```

---

### POST /api/update-api-key

Ajouter ou mettre a jour une cle API pour un fournisseur. La cle est chiffree (AES) avant stockage.

**Rate limit** : 20 requetes / minute

**Authentification** : Requise

**Corps de la requete** :

| Champ      | Type     | Requis | Contraintes                                          |
|------------|----------|--------|------------------------------------------------------|
| `provider` | `string` | Oui    | Valeurs : `openai`, `gemini`, `claude`, `mistral`     |
| `apiKey`   | `string` | Oui    | min: 1, max: 500 caracteres                           |

**Reponse** :

- `200` :
  ```json
  { "message": "API Key updated successfully" }
  ```

---

### GET /api/api-keys

Lister les fournisseurs pour lesquels l'utilisateur a enregistre une cle API. Les cles elles-memes ne sont pas renvoyees.

**Rate limit** : 20 requetes / minute

**Authentification** : Requise

**Reponse** :

- `200` :
  ```json
  { "providers": ["openai", "gemini"] }
  ```

---

### DELETE /api/api-keys/:provider

Supprimer la cle API d'un fournisseur.

**Rate limit** : 20 requetes / minute

**Authentification** : Requise

**Parametres d'URL** :

| Champ      | Type     | Contraintes                                      |
|------------|----------|--------------------------------------------------|
| `provider` | `string` | Valeurs : `openai`, `gemini`, `claude`, `mistral` |

**Reponse** :

- `200` :
  ```json
  { "message": "API key deleted successfully" }
  ```

---

### POST /api/update-user-data

Modifier le nom d'utilisateur de l'utilisateur connecte.

**Rate limit** : 20 requetes / minute

**Authentification** : Requise

**Corps de la requete** :

| Champ      | Type     | Requis | Contraintes              |
|------------|----------|--------|--------------------------|
| `username` | `string` | Oui    | min: 1, max: 100 caracteres |

**Reponses** :

- `200` :
  ```json
  { "message": "User data updated successfully" }
  ```
- `400` : Nom d'utilisateur deja pris
  ```json
  { "error": "Username already exists" }
  ```

---

## Projets

Toutes les routes sont montees sur `/` (les chemins incluent `/api/`).

### GET /api/projects

Lister tous les projets de l'utilisateur connecte, tries par date de mise a jour decroissante.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Reponse** :

- `200` : Tableau de projets
  ```json
  [
    {
      "id": 1,
      "name": "Mon projet",
      "description": "Description du projet",
      "instructions": "Instructions personnalisees",
      "context_data": "Donnees de contexte",
      "created_at": "2025-01-15 10:30:00",
      "updated_at": "2025-01-16 14:00:00"
    }
  ]
  ```

---

### POST /api/projects

Creer un nouveau projet.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Corps de la requete** :

| Champ          | Type     | Requis | Contraintes               |
|----------------|----------|--------|---------------------------|
| `name`         | `string` | Oui    | min: 1, max: 200 caracteres |
| `description`  | `string` | Non    | max: 2000 caracteres        |
| `instructions` | `string` | Non    | max: 10000 caracteres       |
| `context_data` | `string` | Non    | max: 50000 caracteres       |

**Reponse** :

- `201` :
  ```json
  {
    "id": 1,
    "name": "Mon projet",
    "description": null,
    "instructions": null,
    "context_data": null
  }
  ```

---

### GET /api/projects/:projectId

Recuperer les details d'un projet.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Parametres d'URL** :

| Champ       | Type     | Contraintes            |
|-------------|----------|------------------------|
| `projectId` | `number` | Entier positif          |

**Reponses** :

- `200` : Objet projet (meme format que dans la liste)
- `404` :
  ```json
  { "error": "Project not found" }
  ```

---

### PATCH /api/projects/:projectId

Modifier un projet existant. Seuls les champs fournis sont mis a jour.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Parametres d'URL** :

| Champ       | Type     | Contraintes   |
|-------------|----------|---------------|
| `projectId` | `number` | Entier positif |

**Corps de la requete** :

| Champ          | Type     | Requis | Contraintes               |
|----------------|----------|--------|---------------------------|
| `name`         | `string` | Non    | min: 1, max: 200 caracteres |
| `description`  | `string` | Non    | max: 2000 caracteres        |
| `instructions` | `string` | Non    | max: 10000 caracteres       |
| `context_data` | `string` | Non    | max: 50000 caracteres       |

**Reponse** :

- `200` :
  ```json
  { "message": "Project updated" }
  ```

---

### DELETE /api/projects/:projectId

Supprimer un projet.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Parametres d'URL** :

| Champ       | Type     | Contraintes   |
|-------------|----------|---------------|
| `projectId` | `number` | Entier positif |

**Reponse** :

- `200` :
  ```json
  { "message": "Project deleted" }
  ```

---

### GET /api/projects/:projectId/threads

Lister les threads d'un projet, tries par dernier message decroissant.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Parametres d'URL** :

| Champ       | Type     | Contraintes   |
|-------------|----------|---------------|
| `projectId` | `number` | Entier positif |

**Reponse** :

- `200` : Tableau de threads
  ```json
  [
    {
      "id": "uuid-thread-1",
      "title": "Ma conversation",
      "created_at": "2025-01-15 10:30:00",
      "updated_at": "2025-01-16 14:00:00",
      "last_message_at": "2025-01-16 14:05:00"
    }
  ]
  ```

---

### POST /api/projects/:projectId/threads

Creer un thread dans un projet.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Parametres d'URL** :

| Champ       | Type     | Contraintes   |
|-------------|----------|---------------|
| `projectId` | `number` | Entier positif |

**Corps de la requete** : Aucun champ requis (le thread recoit un UUID genere automatiquement).

**Reponse** :

- `201` :
  ```json
  {
    "id": "uuid-genere",
    "title": null
  }
  ```

---

## Threads

Toutes les routes sont montees sur `/` (les chemins incluent `/api/`).

### GET /api/threads

Lister tous les threads de l'utilisateur, tries par dernier message decroissant.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Reponse** :

- `200` : Tableau de threads
  ```json
  [
    {
      "id": "uuid-thread-1",
      "project_id": 1,
      "title": "Ma conversation",
      "created_at": "2025-01-15 10:30:00",
      "updated_at": "2025-01-16 14:00:00",
      "last_message_at": "2025-01-16 14:05:00"
    }
  ]
  ```

---

### POST /api/threads

Creer un nouveau thread (racine, sans projet obligatoire).

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Corps de la requete** :

| Champ       | Type               | Requis | Contraintes          |
|-------------|--------------------|--------|----------------------|
| `id`        | `string`           | Non    | UUID personnalise     |
| `title`     | `string`           | Non    | max: 200 caracteres   |
| `projectId` | `string \| number` | Non    | ID du projet a lier   |

**Reponse** :

- `201` :
  ```json
  {
    "id": "uuid-genere-ou-fourni",
    "title": null
  }
  ```

---

### GET /api/threads/:threadId/messages

Recuperer les messages d'un thread, avec pagination par curseur.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Parametres d'URL** :

| Champ      | Type     | Contraintes      |
|------------|----------|------------------|
| `threadId` | `string` | min: 1 caractere  |

**Parametres query** :

| Champ      | Type     | Requis | Contraintes               |
|------------|----------|--------|---------------------------|
| `limit`    | `number` | Non    | min: 1, max: 200 (defaut: 50) |
| `beforeId` | `number` | Non    | ID de message (curseur)        |

**Reponse** :

- `200` : Tableau de messages, ordonnes par `id` croissant
  ```json
  [
    {
      "id": 1,
      "role": "user",
      "content": "Bonjour !",
      "attachments": [],
      "provider": "openai",
      "model": "gpt-4o",
      "created_at": "2025-01-16 14:05:00"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Bonjour, comment puis-je vous aider ?",
      "attachments": [],
      "provider": "openai",
      "model": "gpt-4o",
      "created_at": "2025-01-16 14:05:01"
    }
  ]
  ```
- `404` : Thread introuvable
  ```json
  { "error": "Thread not found" }
  ```

---

### PATCH /api/threads/:threadId

Modifier un thread (titre et/ou projet associe).

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Parametres d'URL** :

| Champ      | Type     | Contraintes      |
|------------|----------|------------------|
| `threadId` | `string` | min: 1 caractere  |

**Corps de la requete** :

| Champ       | Type                          | Requis | Contraintes         |
|-------------|-------------------------------|--------|---------------------|
| `title`     | `string`                      | Non    | max: 200 caracteres  |
| `projectId` | `string \| number \| null`    | Non    | `null` pour dissocier |

**Reponse** :

- `200` :
  ```json
  {
    "id": "uuid-thread",
    "title": "Nouveau titre",
    "project_id": 1
  }
  ```
- `400` :
  ```json
  { "error": "Nothing to update" }
  ```
- `404` :
  ```json
  { "error": "Thread not found" }
  ```

---

### DELETE /api/threads/:threadId

Supprimer un thread et tous ses messages.

**Rate limit** : 60 requetes / minute

**Authentification** : Requise

**Parametres d'URL** :

| Champ      | Type     | Contraintes      |
|------------|----------|------------------|
| `threadId` | `string` | min: 1 caractere  |

**Reponse** :

- `200` :
  ```json
  { "message": "Thread deleted" }
  ```

---

## Chat

Les routes chat sont montees sur `/api/chat`.

### POST /api/chat/message

Envoyer un message a un modele IA. Le message utilisateur est sauvegarde en base, le modele genere une reponse qui est egalement sauvegardee. Si le thread n'existe pas encore, il est cree automatiquement.

Supporte le **streaming SSE** (Server-Sent Events) si le header `Accept: text/event-stream` est present.

**Rate limit** : 30 requetes / minute (reponse personnalisee : `429 Too many chat requests. Try again soon.`)

**Authentification** : Requise

**Corps de la requete** :

| Champ         | Type                 | Requis      | Contraintes                                                |
|---------------|----------------------|-------------|------------------------------------------------------------|
| `sessionId`   | `string`             | Conditionnel | Requis si `threadId` absent                                |
| `threadId`    | `string`             | Conditionnel | Requis si `sessionId` absent                               |
| `message`     | `string`             | Conditionnel | max: 8000 caracteres. Requis si pas de `attachments`        |
| `provider`    | `string`             | Non          | Valeurs : `openai`, `gemini`, `claude`, `mistral`. Defaut : `openai` |
| `model`       | `string`             | Non          | Modele specifique. Defauts : `gpt-4o`, `gemini-2.5-pro`, `claude-3-5-sonnet-20240620`, `mistral-large-latest` |
| `projectId`   | `string \| number`   | Non          | ID du projet a associer au thread                           |
| `attachments` | `array`              | Non          | max: 4 fichiers, 5 Mo par fichier. Uniquement pour Gemini   |

**Schema des attachments** :

| Champ      | Type     | Requis | Description                                |
|------------|----------|--------|--------------------------------------------|
| `id`       | `string` | Non    | Identifiant de la piece jointe              |
| `type`     | `string` | Non    | Type (`image`, `document`, `file`)          |
| `name`     | `string` | Non    | Nom du fichier                              |
| `mimeType` | `string` | Non    | Types images acceptes : `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| `dataUrl`  | `string` | Non    | Donnees en base64 (`data:<mime>;base64,...`) |
| `fileUri`  | `string` | Non    | URI d'un fichier deja upload (Gemini)       |

**Regles de validation** :
- `threadId` ou `sessionId` est obligatoire
- `message` ou `attachments` (non vide) est obligatoire
- Les pieces jointes ne sont supportees que pour le fournisseur `gemini`

**Reponse (mode classique)** :

- `200` :
  ```json
  {
    "reply": "Reponse du modele IA",
    "threadId": "uuid-du-thread"
  }
  ```

**Reponse (mode streaming SSE)** :

Header de requete : `Accept: text/event-stream`

Evenements envoyes :
```
data: {"type":"delta","content":"fragment de texte"}

data: {"type":"done","reply":"reponse complete","threadId":"uuid-du-thread"}
```

En cas d'erreur en streaming :
```
data: {"type":"error","error":"Stream error"}
```

**Codes d'erreur specifiques** :

| Code | Description                              |
|------|------------------------------------------|
| 400  | Payload invalide, fournisseur non supporte, cle API manquante, attachments non supportes pour ce fournisseur |
| 401  | Non authentifie ou cle API invalide       |
| 413  | Message trop long ou piece jointe trop volumineuse |
| 429  | Trop de requetes                          |
| 500  | Erreur serveur ou cle de chiffrement manquante |

---

## Erreurs communes

### Erreur de validation (toutes les routes avec schemas Zod)

- `400` :
  ```json
  {
    "error": "Validation failed",
    "details": {
      "fieldName": ["Message d'erreur"]
    }
  }
  ```

### Rate limiting

Les headers standard de rate limiting sont inclus dans les reponses (`RateLimit-*`). Les headers legacy ne sont pas inclus.

- `429` : Trop de requetes
  ```json
  { "error": "Too many chat requests. Try again soon." }
  ```
  (Le message varie selon la route ; la reponse personnalisee ci-dessus ne concerne que `/api/chat/message`. Les autres routes utilisent la reponse par defaut d'express-rate-limit.)

### Erreur serveur

- `500` :
  ```json
  { "error": "Internal server error" }
  ```
