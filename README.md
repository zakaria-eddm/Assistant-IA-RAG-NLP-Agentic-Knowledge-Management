# Assistant IA — RAG / NLP / KM / FAISS / Agentic

## Description

Ce projet est un **assistant intelligent** capable de comprendre et de répondre aux requêtes des utilisateurs en combinant plusieurs technologies d’intelligence artificielle et de gestion des connaissances :

- **RAG (Retrieval-Augmented Generation)** : recherche d’informations pertinentes dans une base de connaissances et génération de réponses contextualisées.  
- **NLP (Natural Language Processing)** : compréhension et interprétation du langage naturel.  
- **KM (Knowledge Management)** : structuration et gestion centralisée des connaissances.  
- **FAISS** : moteur de recherche vectorielle pour retrouver rapidement les documents pertinents.  
- **Agentic capabilities** : capacités d’agir de manière autonome selon le contexte et les besoins de l’utilisateur.


## Architecture du projet

Le projet est structuré en **trois grandes parties** :

### Backend
<img width="569" height="477" alt="Architecture Backend" src="https://github.com/user-attachments/assets/9ea2077d-cdd5-4b0a-ae4c-595990f625b7" />

### Frontend Web
Interface web interactive pour interagir avec l’assistant.

### Frontend Mobile
Application mobile développée avec **React Native / Expo** pour une utilisation multiplateforme.

## Installation & Démarrage

### Backend

Créer un environnement virtuel :
```bash
python3 -m venv venv
source venv/bin/activate
````

Installer les dépendances :

```bash
pip install -r backend/requirements.txt
```

Lancer le serveur :

```bash
uvicorn backend.main:app --reload
```

### Frontend Web

Installer les dépendances :

```bash
cd frontend-web
npm install
```

Lancer l’application :

```bash
npm run dev
```

### Frontend Mobile

Installer les dépendances :

```bash
cd frontend-mobile
npm install
```

Lancer l’application :

```bash
npx expo start
```

## Configuration

Les fichiers sensibles (API Keys, Firebase Keys, etc.) doivent être stockés dans un fichier `.env` **non versionné**.

Exemple de configuration :
`backend/.env.example`

## Fonctionnalités principales

* Chat intelligent basé sur le **RAG** et la **connaissance**.
* Gestion des utilisateurs et **authentification sécurisée**.
* Recherche vectorielle rapide via **FAISS**.
* Interface **Web** et **Mobile**.
* Capacités **agentiques** pour automatiser des tâches selon le contexte.

## Contribution

1. **Forkez** le dépôt.
2. Créez une branche pour vos modifications :

   ```bash
   git checkout -b feature-nom
   ```
3. Ajoutez, validez et poussez vos changements :

   ```bash
   git add .
   git commit -m "Ajout d'une nouvelle fonctionnalité"
   git push origin feature-nom
   ```
4. Ouvrez une **Pull Request** pour révision.

## Documentation

- [Rapport complet](https://github.com/user-attachments/files/23148583/rapport.docx)

