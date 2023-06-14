# Projet de Chatbot AI

Ce projet est un chatbot d'IA qui utilise les modèles d'OpenAI pour interagir avec les utilisateurs. L'application est construite avec React pour le front-end et Node.js pour le back-end, et utilise SQLite pour le stockage des données.

## Structure de l'application

L'application est structurée en deux parties principales : le back-end et le front-end.

### Back-end :

Le back-end comprend les éléments suivants :

- `app.js` : Le fichier principal qui initialise le serveur Express.
- Base de données : Fichier SQLite utilisé pour stocker les données des utilisateurs et les clés API OpenAI.
- `routes` : Contient les routes pour l'enregistrement (`register.js`) et la connexion (`login.js`) des utilisateurs.

### Front-end :

Le front-end est construit avec React et est organisé en plusieurs composants et routes.

#### Routes :

- `App.jsx` : Le composant racine qui gère l'affichage des composants `Aside` et `ChatZone`.
- `Login.jsx` : Gère la page de connexion de l'utilisateur.
- `Register.jsx` : Gère la page d'inscription de l'utilisateur.

#### Composants :

- `Aside` : Gère la sélection du modèle d'IA et l'envoi des messages à l'API OpenAI.
- `Aioption` : Permet à l'utilisateur de sélectionner un modèle d'IA.
- `LogOut` : Gère la déconnexion de l'utilisateur.
- `ChatZone` : Gère l'affichage des messages et l'envoi des messages à l'API OpenAI.
- `ChatText` : Affiche les messages de l'utilisateur et les réponses de l'IA.
- `ChatInput` : Gère la saisie des messages de l'utilisateur.
- `DropDown` : Composant pour la sélection du modèle d'IA.
- `Profil` : Affiche les informations de profil de l'utilisateur.

## Prérequis

- Node.js
- NPM
- SQLite

## Installation

Clonez ce dépôt sur votre machine locale et installez les dépendances :

```
git clone git@github.com:jibenight/React-ChatGPT.git
cd React-ChatGPT
npm install
```

## Utilisation

Pour démarrer l'application, exécutez :

```
npm run dev
npm run serve
```

La première commande démarre le serveur de développement de Vite pour le front-end. La seconde commande démarre le serveur back-end en Node.js.

Ouvrez votre navigateur et accédez à `http://127.0.0.1:5173` pour utiliser l'application.

## Configuration de l'API OpenAI

Les clés API d'OpenAI sont stockées dans la base de données SQLite. Vous devrez ajouter votre clé API à la base de données avant de pouvoir utiliser l'application.

## Contribution

Les contributions à ce projet sont les bienvenues. N'hésitez pas à ouvrir un problème ou à soumettre une demande d'extraction.

## Licence

Ce projet est sous licence MIT. Consultez le fichier `LICENSE` pour plus d'informations.
