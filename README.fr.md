## 🌍 Documentation

- 🇵🇹 Portuguese → [README.md](./README.md)
- 🇬🇧 English → [README.en.md](./README.en.md)
- 🇫🇷 French (default)

# Elev9 Coach

Elev9 Coach est une plateforme MVP de coaching fitness construite comme un monorepo guidé par des spécifications. Le périmètre actuel se concentre sur une base backend solide, un client mobile fonctionnel et des frontières d’architecture claires pour accompagner la suite du projet.

## Stack

- Monorepo Nx
- NestJS
- MongoDB / Mongoose
- Expo React Native
- TypeScript
- Jest

## Architecture

```text
apps/
  api/        Backend NestJS
  mobile/     Application Expo React Native

packages/
  types/      Contrats publics partagés
  api-client/ Client HTTP partagé
  ui/         Primitives UI partagées orientées mobile
```

Des notes d’architecture complémentaires sont disponibles dans [docs/architecture/overview.fr.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/overview.fr.md) et [docs/architecture/monorepo.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/monorepo.md).

## Points d’entrée de la documentation

Le projet suit une approche d’architecture `spec-driven` et `deterministic-first`.

Les spécifications documentent les workflows, contrats, règles, tâches et tests. Les ADRs documentent les décisions architecturales qui structurent ces flux. Le module AI possède aussi son propre index documentaire couvrant l’agrégation de contexte, les heuristiques de recovery, l’explainability et le replay.

### Spécifications

- [Spécifications système](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/README.md)
- [Spécifications du module AI](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/ai/README.md)

### ADRs

- [Index des ADRs](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/adr/README.md)

## Features Implemented

- Auth : register, login, validation de session
- Users : création du profil utilisateur
- Fitness : création et lecture du fitness profile actif
- Training : création et lecture du training plan actif
- Progress : workout logs et progress summary
- Dashboard : endpoint home consolidé
- Mobile : flux de login et consommation du dashboard

## Engineering Highlights

- Développement guidé par spécifications avec une documentation explicite des use cases dans `docs/specs/`
- Modular monolith en DDD-lite avec bounded contexts
- Repository pattern sur les frontières de persistance
- Authentification JWT et endpoints protégés
- Contrats partagés via `packages/types`
- Client HTTP partagé via `packages/api-client`
- Base UI partagée via `packages/ui`
- Couverture de tests backend automatisée avec Jest
- Application mobile intégrée au même workspace Nx

## How To Run

### 1. Installer les dépendances

```bash
npm install
```

### 2. Démarrer MongoDB avec Docker Compose

```bash
docker compose up -d
```

Cette commande démarre un MongoDB local sur le port `27017` avec un volume Docker persistant.

### 3. Configurer les variables d’environnement

Backend :

```bash
cp .env.example .env
```

Définir au minimum :

- `PORT=3000`
- `MONGODB_URI=mongodb://localhost:27017/elev9`
- `JWT_SECRET=change-me`

Mobile :

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Définir :

- `EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000`
- `EXPO_PUBLIC_DEMO_MODE=true`

Important :

- Sur un téléphone physique, ne pas utiliser `localhost`
- Utiliser l’IP locale de votre machine, par exemple `http://192.168.1.20:3000`

### 4. Démarrer le backend

```bash
npm run start
```

### 5. Démarrer l’application mobile

```bash
npm run mobile:start
```

### 6. Exécuter les tests

```bash
npm run test
```

## Project Status

Elev9 Coach est un MVP en évolution. Les flux métier du backend sont déjà structurés autour de spécifications explicites et de frontières modulaires, et l’application mobile couvre aujourd’hui la boucle fonctionnelle minimale pour l’authentification et la consultation du dashboard home.

Ce dépôt n’est volontairement pas présenté comme production-ready. L’objectif actuel est de démontrer de la rigueur technique, une vraie réflexion produit et une trajectoire propre pour la suite.

## Demo

Un guide de démonstration pratique est disponible dans [docs/demo/README.fr.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/demo/README.fr.md).

## Next Steps

- Étendre l’expérience mobile au-delà du login et du home dashboard
- Ajouter des états UI plus riches et des flows d’onboarding
- Introduire des surfaces web pour la landing page et des usages internes/admin
- Renforcer la couverture end-to-end dans des environnements où le mobile et la base de données peuvent tourner librement
- Continuer à extraire des contrats partagés stables et des primitives de présentation réutilisables entre applications
