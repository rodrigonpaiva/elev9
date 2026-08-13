# Elev9 Coach

> Monorepo Nx d’un MVP de coaching fitness adaptatif, avec une API NestJS, une application mobile Expo, des contrats TypeScript partagés et une couche Coach Intelligence déterministe par défaut.

[English](./README.md) · Français (cette page) · [Português do Brasil](./README.pt-BR.md) · [ancien anglais](./README.en.md)

## Sommaire

- [Objectif](#objectif)
- [Capacités implémentées](#capacités-implémentées)
- [Architecture](#architecture)
- [Technologies et prérequis](#technologies-et-prérequis)
- [Installation et configuration](#installation-et-configuration)
- [Commandes](#commandes)
- [Flux principal](#flux-principal)
- [Surface API](#surface-api)
- [Tests et validation](#tests-et-validation)
- [Structure du dépôt](#structure-du-dépôt)
- [Intégrations](#intégrations)
- [État actuel et limites](#état-actuel-et-limites)
- [Prochaines étapes](#prochaines-étapes)
- [Contribution](#contribution)
- [Licence](#licence)
- [Documentation](#documentation)

## Objectif

Elev9 Coach relie entraînement, récupération, nutrition, habitudes, objectifs et progression dans une expérience de coaching contextualisée. Le positionnement, les utilisateurs, les parcours et le périmètre sont dans [docs/product](./docs/product/).

## Capacités implémentées

| Domaine                                | Périmètre                                                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentification et profils            | Inscription, login, validation JWT, profils utilisateur et fitness                                                                                    |
| Entraînement et progression            | Plans, recommandations adaptatives, check-ins, journaux, historique et résumé                                                                         |
| Récupération                           | Read models today/current/history, guidance déterministe, analytics et cache offline mobile                                                           |
| Nutrition                              | Plans, macros, repas, remplacement, recommandations, historique, tendances et dashboard                                                               |
| Objectifs, habitudes, personnalisation | Vues, snapshots, patterns, résumés, risques, historique et replay                                                                                     |
| Notifications et dashboard             | Décisions, engagement, événements, replay et home consolidé                                                                                           |
| Coach Intelligence                     | Contexte multi-domaines, experts déterministes, explicabilité, sécurité/fallback, chat, briefing, insights, mémoire, revue, guidance et notifications |
| Mobile                                 | Login/onboarding, dashboard et écrans de training, nutrition, recovery, progress et Coach                                                             |
| Observabilité                          | Logs corrélés/structurés avec redaction, OpenTelemetry et Collector local optionnels                                                                  |

Cette liste décrit le dépôt actuel ; aucun déploiement externe n’est déduit du code seul.

## Architecture

Monorepo Nx : backend NestJS modulaire, application Expo/React Native et packages partagés.

    apps/api/       Backend et bounded contexts
    apps/mobile/    Application Expo et projets natifs
    apps/web/       Shell web orienté Next ; cibles actuellement vides
    packages/types/ Contrats TypeScript partagés
    packages/api-client/ Client HTTP typé
    packages/ui/    Primitives UI mobiles
    infra/          Configuration OpenTelemetry optionnelle
    docs/           Specs, ADRs, produit, validation et opérations

L’API sépare présentation, application, domaine et infrastructure Mongoose sous apps/api/src/modules/. Le mobile consomme le client et les contrats partagés. Le coaching est deterministic-first ; le LLM/agent optionnel est limité par configuration, sécurité, mémoire, outils et fallback.

## Technologies et prérequis

Nx 22.7.1, TypeScript 5.7.x, NestJS 11, Node.js 22 LTS, MongoDB 7, Mongoose 8, Expo 54, React Native 0.81, React 19, NativeWind, Jest 29, Supertest, JWT, bcrypt, OpenAI et OpenTelemetry/OTLP optionnels, Docker Compose.

Utiliser Node.js 22 LTS (.nvmrc), npm, Docker Compose, les outils Expo et un appareil ou émulateur. Les builds natifs exigent les SDK de plateforme ; une clé OpenAI est nécessaire uniquement si le LLM optionnel est activé.

## Installation et configuration

    npm install
    cp .env.example .env
    docker compose up -d mongo

Variables principales : PORT, MONGODB*URI, JWT_SECRET, OBSERVABILITY*_, AI*AGENT*_, OPENAI*API_KEY/OPENAI_MODEL, AI_LLM*_, AI*COACH_MAX_EXPERTS, AI_EXPERT_TRACE*_, AI*AGENT_TRACE*_ et AI*PROMPT*_. Voir [.env.example](./.env.example) et [.env.docker.example](./.env.docker.example). Ne jamais committer de secrets.

Pour le mobile :

    cp apps/mobile/.env.example apps/mobile/.env

Définir EXPO_PUBLIC_API_URL, par exemple http://192.168.1.20:3000. Depuis un téléphone, ne pas utiliser localhost. Les flags EXPO_PUBLIC_DEMO_MODE et EXPO_PUBLIC_AI_COACH_INTELLIGENCE_ENABLED sont optionnels.

## Commandes

| Commande                                    | Fonction                        |
| ------------------------------------------- | ------------------------------- |
| npm run start:dev                           | API en développement            |
| npm run start                               | Build puis démarrage API        |
| npm run mobile:start                        | Démarrage Expo/Metro            |
| npm run dev:all                             | API, web et mobile en parallèle |
| npm run build                               | Build configuré                 |
| npm run lint                                | Lint configuré                  |
| npm run format:check / npm run format       | Prettier                        |
| npm run test / npm run test:watch           | Tests Jest API                  |
| npm run test:e2e                            | Tests API end-to-end            |
| npm run mobile:android / npm run mobile:ios | Lancement mobile                |
| npm run dev:web                             | Shell web actuel                |

Cibles Nx : npm exec nx run api:build, api:test, api:test:e2e, mobile:start, mobile:test et mobile:build.

Runtime Docker :

    cp .env.docker.example .env
    docker compose up --build
    docker compose --profile observability up --build

## Flux principal

1. Le mobile s’authentifie via /auth/register, /auth/login et /auth/me.
2. L’onboarding crée les contextes utilisateur, fitness, entraînement et nutrition.
3. Le dashboard agrège progression, récupération, training, nutrition, objectifs, habitudes et personnalisation.
4. Les services déterministes calculent read models et recommandations selon fraîcheur, date et timezone.
5. Coach Intelligence assemble le contexte, route vers les experts et applique sécurité/explicabilité.
6. Les actions persistées alimentent snapshots, tendances, notifications et contexte Coach.

## Surface API

Aucun préfixe global n’est documenté. Groupes : /auth, /users, /fitness, /training, /training/adaptive, /progress, /recovery, /nutrition, /goals, /habits, /personalization, /notifications, /dashboard, /ai, /ai/coach-decision et /health ou /health/ready. DTOs : presentation/http/dto ; contrats : [packages/types/src](./packages/types/src).

## Tests et validation

Le dépôt contient 267 fichiers de tests, couvrant API, contrôleurs, hooks/analytics mobile et E2E auth, profils, dashboard, entraînement, progression, récupération, nutrition et Coach.

    npm exec nx run api:build       réussi
    npm exec nx run api:test        219 suites, 1 368 tests réussis

Jest a signalé un worker arrêté de force au teardown, sans assertion en échec. Les builds natifs ne sont pas couverts. Voir [docs/ci.md](./docs/ci.md).

## Structure du dépôt

    apps/api/src/modules/<context>/  presentation, application, domain, infrastructure
    apps/api/src/common/             middleware partagé
    apps/api/src/observability/      logs, redaction, OTLP, lifecycle
    apps/api/src/shared/             replay, mappers, concurrence, dates
    apps/api/test/e2e/                scénarios API E2E
    apps/mobile/src/                  écrans, navigation, hooks, API, stockage, UI
    packages/api-client/src/          fonctions API et client HTTP
    packages/types/src/               contrats partagés
    packages/ui/src/                  primitives React Native et thème
    docs/                             produit, specs, ADRs, validation, opérations

## Intégrations

MongoDB 7 est la persistance principale ; Expo/Metro et les projets natifs sont sous apps/mobile. OpenAI est un fournisseur LLM optionnel derrière configuration, sécurité et fallback. OpenTelemetry peut exporter vers [docker-compose.yml](./docker-compose.yml). Les profils EAS sont dans eas.json, sans confirmation de publication.

## État actuel et limites

MVP en évolution déclaré UNLICENSED. L’historique récent couvre observabilité structurée, nutrition, récupération, check-ins, Coach Intelligence et la base Nx/mobile.

- Le projet web existe dans Nx, mais project.json ne définit aucune cible ni surface de production confirmée.
- Agent, outils, LLM/OpenAI et export observabilité sont désactivés par défaut.
- Les exécutions natives dépendent des SDK, appareils et réseau vers l’API.
- Aucun déploiement, MongoDB hébergé, release store, backend telemetry ou infrastructure email n’est confirmé.
- La suite API passe, mais le warning de teardown reste à traiter.
- Aucun répertoire sources/ n’existe dans ce checkout ; aucun fichier de référence n’était disponible.

## Prochaines étapes

Les dossiers docs/operations/, docs/runbooks/, docs/certification/ et docs/roadmap/ soutiennent l’extension web, la validation mobile/E2E, la synchronisation des contrats/UI et le durcissement opérationnel.

## Contribution

Consulter module, spec, ADR et tests. Utiliser Nx et mettre à jour tests/documentation avec les changements. Voir [docs/ci.md](./docs/ci.md) et [docs/pull-requests.md](./docs/pull-requests.md).

## Licence

package.json déclare UNLICENSED. Aucune licence open source n’est identifiée ; confirmer les droits de redistribution.

## Documentation

- [Produit](./docs/product/) · [Architecture](./docs/architecture/) · [Specs](./docs/specs/) · [ADRs](./docs/adr/)
- [Validation](./docs/validation/) · [Opérations](./docs/operations/) · [Roadmap](./docs/roadmap/)
- [Demo](./docs/demo/README.md) · [CI](./docs/ci.md)
