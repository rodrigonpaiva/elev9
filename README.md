# Elev9 Coach

> An Nx monorepo for an adaptive fitness-coaching MVP, with a NestJS API, an Expo mobile application, shared TypeScript contracts, and a deterministic-first Coach Intelligence layer.

[English](./README.md) · [Français](./README.fr.md) · [Português do Brasil](./README.pt-BR.md) · [legacy English filename](./README.en.md)

## Table of contents

- [Purpose](#purpose)
- [Implemented capabilities](#implemented-capabilities)
- [Architecture](#architecture)
- [Technology and requirements](#technology-and-requirements)
- [Installation and configuration](#installation-and-configuration)
- [Commands](#commands)
- [Main flow](#main-flow)
- [API surface](#api-surface)
- [Tests and validation](#tests-and-validation)
- [Repository structure](#repository-structure)
- [Integrations](#integrations)
- [Current status and limitations](#current-status-and-limitations)
- [Evidence-based next steps](#evidence-based-next-steps)
- [Contributing](#contributing)
- [License](#license)
- [Documentation map](#documentation-map)

## Purpose

Elev9 Coach addresses the fragmentation between workouts, recovery, nutrition, habits, goals, and progress. The MVP connects authentication, profiles, adaptive recommendations, activity logging, progress views, and a contextual Coach.

Product positioning, target users, user journeys, and scope are documented in [docs/product](./docs/product/).

## Implemented capabilities

| Area                | Implemented scope                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication      | Registration, login, JWT session validation, and authenticated /me access                                                                                                                    |
| User and fitness    | User-profile creation plus fitness-profile creation and retrieval                                                                                                                            |
| Training            | Training-plan creation/retrieval and adaptive recommendations with today/current/history read models                                                                                         |
| Progress            | Daily check-ins, workout logs, workout history, and progress summary                                                                                                                         |
| Recovery            | Current/today/history read models, deterministic guidance, analytics, and mobile offline read caching                                                                                        |
| Nutrition           | Profiles and plans, macro calculation, today’s nutrition, meal logs, replacement, recommendations, history, trends, and dashboard integration                                                |
| Goals and habits    | Goal current/history/milestones/achievement/forecast views and habit snapshots, summaries, risks, history, and replay                                                                        |
| Personalization     | Today/current/history views, behavioral patterns, and user profile read models                                                                                                               |
| Notifications       | Today/current decisions, history, engagement summary, event recording, and replay                                                                                                            |
| Dashboard           | Consolidated home view and adaptive-signal debug view                                                                                                                                        |
| Coach Intelligence  | Cross-domain context, deterministic experts, explainability/evidence, safety/fallback policies, chat, briefing, insights, memory, weekly review, goal guidance, notifications, and ask-Coach |
| Mobile product loop | Login/onboarding, dashboard, training, nutrition, recovery, progress, and Coach screens connected to the API client                                                                          |
| Observability       | Correlated and structured logging with redaction, optional OpenTelemetry export, and an optional local Collector                                                                             |

“Implemented” means supported by this repository. Production rollout, store distribution, and external operational guarantees are not inferred from source code alone.

## Architecture

This is an Nx monorepo with a modular NestJS backend, an Expo/React Native client, and shared packages.

    apps/api/       NestJS modular monolith
    apps/mobile/    Expo React Native application and native projects
    apps/web/       Next-oriented workspace shell; targets currently empty
    packages/types/ Shared domain and HTTP contracts
    packages/api-client/ Shared typed HTTP client
    packages/ui/    Shared mobile-oriented UI primitives
    infra/          Optional OpenTelemetry Collector configuration
    docs/           Specs, ADRs, product, validation, operations, roadmap
    scripts/        Node CLI wrapper and Docker smoke helper

The API uses bounded contexts under apps/api/src/modules/, separating presentation, application use cases/services, domain entities/value objects/repositories, and infrastructure adapters. MongoDB access uses Mongoose repositories and schemas. The mobile app consumes shared contracts and the API client.

The coaching design is deterministic-first: domain signals and policy engines produce explainable decisions; optional LLM/agent capabilities are guarded by configuration, safety checks, bounded execution, memory limits, tool limits, and fallback paths.

## Technology and requirements

- Nx 22.7.1, npm workspaces, TypeScript 5.7.x
- NestJS 11, Node.js 22 LTS, MongoDB 7, Mongoose 8
- Expo 54, React Native 0.81, React 19, NativeWind, React Navigation
- Jest 29, Supertest, MongoDB Memory Server
- JWT, bcrypt, optional OpenAI SDK and OpenTelemetry/OTLP
- Docker and Docker Compose

Use Node.js 22 LTS (.nvmrc is provided), npm, Docker Compose, Expo tooling, and an emulator/simulator or physical device. Native builds additionally require platform SDKs. An OpenAI key is only required when the optional LLM path is enabled.

## Installation and configuration

Install from the repository root:

    npm install
    cp .env.example .env
    docker compose up -d mongo

| Variable                                                                         | Required | Example/default                  | Purpose                                                   |
| -------------------------------------------------------------------------------- | -------- | -------------------------------- | --------------------------------------------------------- |
| PORT                                                                             | No       | 3000                             | API port                                                  |
| MONGODB_URI                                                                      | Yes      | mongodb://localhost:27017/elev9  | MongoDB connection                                        |
| JWT_SECRET                                                                       | Yes      | change-me                        | JWT signing secret                                        |
| OBSERVABILITY\_\*                                                                | No       | See .env.example                 | OTLP export, resource, timeout, and diagnostic settings   |
| AI*AGENT*\*                                                                      | No       | See .env.example                 | Agent enablement, memory, steps, tools, and timeouts      |
| OPENAI_API_KEY / OPENAI_MODEL                                                    | Optional | Not set / implementation default | Optional LLM provider                                     |
| AI*LLM*_, AI*COACH_MAX_EXPERTS, AI_EXPERT_TRACE*_, AI*AGENT_TRACE*_, AI*PROMPT*_ | Optional | See source/config tests          | Advanced LLM, expert, trace, prompt, and rollout controls |

The complete baseline is [.env.example](./.env.example); Docker uses [.env.docker.example](./.env.docker.example). Never commit real secrets.

For mobile:

    cp apps/mobile/.env.example apps/mobile/.env

Set EXPO_PUBLIC_API_URL to an address reachable by the device, for example http://192.168.1.20:3000. A physical phone must not use localhost. EXPO_PUBLIC_DEMO_MODE and EXPO_PUBLIC_AI_COACH_INTELLIGENCE_ENABLED are optional client switches.

## Commands

| Command                                     | Purpose                                      |
| ------------------------------------------- | -------------------------------------------- |
| npm run start:dev                           | Start the API from TypeScript in development |
| npm run start                               | Build and start the API                      |
| npm run mobile:start                        | Start Expo/Metro                             |
| npm run dev:all                             | Run API, web, and mobile concurrently        |
| npm run build                               | Build configured API and workspace packages  |
| npm run lint                                | Run configured lint targets                  |
| npm run format:check / npm run format       | Check/format with Prettier                   |
| npm run test / npm run test:watch           | Run the API Jest suite                       |
| npm run test:e2e                            | Run API end-to-end tests in band             |
| npm run mobile:android / npm run mobile:ios | Launch Expo on Android/iOS                   |
| npm run dev:web                             | Start the current web shell                  |

Direct Nx targets include npm exec nx run api:build, npm exec nx run api:test, npm exec nx run api:test:e2e, npm exec nx run mobile:start, npm exec nx run mobile:test, and npm exec nx run mobile:build.

Docker runtime:

    cp .env.docker.example .env
    docker compose up --build
    docker compose --profile observability up --build

## Main flow

1. Mobile resolves its API URL and authenticates through /auth/register, /auth/login, and /auth/me.
2. Onboarding creates user, fitness, training, and nutrition context as needed.
3. The dashboard aggregates progress, recovery, training, nutrition, goals, habits, and personalization signals.
4. Deterministic services calculate read models and adaptive recommendations with freshness, date, and timezone rules.
5. Coach Intelligence assembles context, routes to domain experts, and applies safety/explainability policies.
6. Persisted actions can feed later snapshots, trends, notifications, and Coach context.

## API surface

The API has no documented global prefix. Main groups are /auth, /users, /fitness, /training, /training/adaptive, /progress, /recovery, /nutrition, /goals, /habits, /personalization, /notifications, /dashboard, /ai, /ai/coach-decision, and /health or /health/ready. Exact DTOs are in each module’s presentation/http/dto directory; shared public contracts are in [packages/types/src](./packages/types/src).

## Tests and validation

The repository inventory contains 267 test files, including API application/domain/infrastructure and controller tests, mobile hook/analytics tests, and API E2E scenarios for auth, profiles, dashboard, training, progress, recovery, nutrition, and Coach flows.

    npm exec nx run api:build       passed
    npm exec nx run api:test        219 suites, 1,368 tests passed

Jest reported a worker that required forced exit during teardown; no assertion failed. Mobile/native builds require their platform runtime and were not treated as validated by this API check. See [docs/ci.md](./docs/ci.md).

## Repository structure

    apps/api/src/modules/<context>/  presentation, application, domain, infrastructure
    apps/api/src/common/             middleware and shared API concerns
    apps/api/src/observability/      logging, redaction, OTLP, lifecycle
    apps/api/src/shared/             replay, mappers, concurrency, dates
    apps/api/test/e2e/                API end-to-end scenarios
    apps/mobile/src/                  screens, navigation, hooks, API, storage, UI
    packages/api-client/src/          typed API functions and HTTP client
    packages/types/src/               shared contracts by domain
    packages/ui/src/                  shared React Native primitives and theme
    docs/                             product, specs, ADRs, validation, operations

## Integrations

- MongoDB 7 is the primary persistence service; local Compose uses the named mongo-data volume.
- The mobile app uses Expo/Metro and committed Android/iOS projects under apps/mobile.
- OpenAI is an optional LLM provider behind runtime configuration and safety/fallback services.
- OpenTelemetry can target the Collector in [docker-compose.yml](./docker-compose.yml) and [infra/observability/otel-collector/config.yaml](./infra/observability/otel-collector/config.yaml).
- EAS build profiles are in [eas.json](./eas.json); store submission or published builds are not confirmed.

## Current status and limitations

This is an evolving, non-licensed MVP (UNLICENSED in package.json). Recent Git history covers structured observability, nutrition rollout gates, recovery intelligence, daily check-ins, Coach Intelligence, and the Nx/mobile baseline.

- The web project exists in Nx, but project.json currently defines no targets or confirmed production web surface.
- Agent runtime, tools, OpenAI/LLM execution, and observability export are disabled by default.
- Native mobile execution depends on local SDKs, devices/simulators, and network reachability to the API.
- Production deployment, hosted MongoDB, store releases, external telemetry backends, and email infrastructure are not confirmed.
- The API suite passes but reports a teardown worker warning; test isolation remains a maintenance item.
- This checkout has no sources/ directory, so no reference files were available for this update.

## Evidence-based next steps

Existing operations, runbook, certification, and roadmap documents support these directions:

- Expand the currently empty web surface.
- Continue mobile/native and end-to-end validation where device and database access are available.
- Keep shared contracts, UI primitives, and documentation synchronized.
- Continue operational hardening described in docs/operations/, docs/runbooks/, docs/certification/, and docs/roadmap/.

## Contributing

Inspect the relevant module, specification, ADR, and tests before a change. Keep domain contracts in packages/types, HTTP access in packages/api-client, and reusable mobile primitives in packages/ui. Prefer Nx targets and update tests/documentation with behavior changes. See [docs/ci.md](./docs/ci.md) and [docs/pull-requests.md](./docs/pull-requests.md).

## License

The root package.json declares UNLICENSED. No open-source license grant is identified; confirm intended licensing before redistribution.

## Documentation map

- [Product vision, scope, feature inventory, and target users](./docs/product/)
- [Architecture overview and monorepo strategy](./docs/architecture/)
- [System and domain specifications](./docs/specs/)
- [Architecture Decision Records](./docs/adr/)
- [Validation and certification](./docs/validation/)
- [Operations, runbooks, and rollout material](./docs/operations/)
- [Development roadmap](./docs/roadmap/)
- [Demo guide](./docs/demo/README.md)
- [CI validation flow](./docs/ci.md)
