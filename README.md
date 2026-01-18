# Projet de Chatbot AI

Ce projet est un chatbot d'IA qui utilise les modèles d'OpenAI pour interagir avec les utilisateurs. L'application est construite avec React pour le front-end et Node.js pour le back-end, et utilise SQLite pour le stockage des données.

## Structure de l'application

L'application est structurée en deux parties principales : le back-end et le front-end.

### Back-end :

Le back-end comprend les éléments suivants :

- `app.js` : Le fichier principal qui initialise le serveur Express.
- `models/database.js` : Gestion de la base de données SQLite `ChatData.db`.
- `routes/auth.js` : Routes pour l'authentification (inscription, connexion, réinitialisation de mot de passe).
- `routes/users-api.js` : API de gestion des utilisateurs.
- `routes/openaiApi.js` : Gestion des interactions avec l'API OpenAI.

### Front-end :

Le front-end est construit avec React et est organisé en plusieurs dossiers.

#### Routes (`src/routes`) :

- `App.jsx` : Le composant racine connecté.
- `login.jsx` : Page de connexion.
- `register.jsx` : Page d'inscription.
- `resetPasswordRequest.jsx` : Page de demande de réinitialisation de mot de passe.

#### Composants (`src/component`) :

- `Aside.jsx` : Barre latérale, gestion du profil et sélection des modèles.
- `Aioption.jsx` : Liste des options d'IA.
- `ChatZone.jsx` : Zone principale de chat.
- `ChatText.jsx` : Affichage des messages individuels.
- `ChatInput.jsx` : Champ de saisie des messages.
- `Dropdown.jsx` : Menu déroulant.
- `Logout.jsx` : Bouton de déconnexion.
- `Profil.jsx` : Affichage et édition du profil utilisateur.

#### Contextes et Utilitaires :

- `src/UserContext.jsx` : Contexte React pour la gestion de l'état utilisateur global.
- `src/PrivateRoute.jsx` : Composant de protection des routes nécessitant une authentification.

## Prérequis

- Node.js
- NPM
- SQLite

## Installation

Clonez ce dépôt sur votre machine locale et installez les dépendances :

```bash
git clone git@github.com:jibenight/React-ChatGPT.git
cd React-ChatGPT
npm install
```

## Utilisation

Pour utiliser l'application, vous devez lancer le front-end et le back-end.

**Attention aux ports :**
Par défaut, Vite (front-end) et le serveur Express (back-end) tentent tous deux d'utiliser le port `5173`.
Certaines fonctionnalités (comme la réinitialisation de mot de passe) s'attendent à ce que le back-end soit sur `http://localhost:5173`.

Il est recommandé de lancer le back-end en premier pour qu'il prenne le port 5173, puis le front-end (Vite passera automatiquement sur le port suivant, ex: 5174).

1. Démarrer le serveur Back-end :
```bash
npm run serve
```
*(Le serveur devrait démarrer sur http://localhost:5173)*

2. Démarrer le serveur Front-end (dans un nouveau terminal) :
```bash
npm run dev
```
*(Vite détectera que le port 5173 est occupé et proposera d'utiliser le port 5174 ou un autre)*

Ouvrez votre navigateur sur l'URL indiquée par Vite (ex: `http://localhost:5174`).

## Tests API

Une collection de tests API pour **Bruno** est disponible dans le dossier `REact chat /`.
- `bruno.json`
- `reggister.bru`

Vous pouvez utiliser ces fichiers pour tester les endpoints du back-end directement.

## Configuration de l'API OpenAI

Les clés API d'OpenAI sont stockées dans la base de données SQLite. Vous devrez ajouter votre clé API à la base de données via l'interface utilisateur ou directement en base avant de pouvoir utiliser l'application.

## Contribution

Les contributions à ce projet sont les bienvenues. N'hésitez pas à ouvrir un problème ou à soumettre une demande d'extraction.

## Licence

Ce projet est sous licence MIT. Consultez le fichier `LICENSE` pour plus d'informations.
