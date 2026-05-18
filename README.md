## 🌍 Documentation

- 🇵🇹 Portuguese (default)
- 🇬🇧 English → [README.en.md](./README.en.md)
- 🇫🇷 French → [README.fr.md](./README.fr.md)

# Elev9 Coach

Elev9 Coach is an MVP fitness coaching platform built as a spec-driven monorepo. The current scope focuses on adaptive coaching, recovery intelligence, nutrition guidance, conversational coaching, and clear architectural boundaries for future growth.

## Stack

- Nx monorepo
- NestJS
- MongoDB / Mongoose
- Expo React Native
- TypeScript
- Jest

## Architecture

```text
apps/
  api/        NestJS backend
  mobile/     Expo React Native app

packages/
  types/      Shared public contracts
  api-client/ Shared HTTP client
  ui/         Shared mobile-oriented UI primitives
```

Additional architectural notes live in [docs/architecture/overview.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/overview.md) and [docs/architecture/monorepo.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/architecture/monorepo.md).

## Architecture & Documentation

The project follows a spec-driven and deterministic-first architecture workflow.

Specifications document workflows, contracts, rules, tasks, and tests. ADRs document the architectural decisions behind those flows. The AI module also has its own documentation index covering context aggregation, recovery heuristics, explainability, and replay.
The dashboard documentation covers adaptive signals and internal explainability/debug surfaces, while the conversational coaching documentation covers deterministic chat built on top of the same health context.
Repository-wide documentation governance is defined in [docs/specs/GOVERNANCE.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/GOVERNANCE.md), which keeps specs, ADR alignment, navigation consistency, placeholders, and deterministic-first documentation rules in sync.

### Specifications

- [System Specs](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/README.md)
- [AI Module Specs](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/ai/README.md)

### Architecture Decision Records

- [ADR Index](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/adr/README.md)

### Documentation Governance

- [Documentation Governance](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/specs/GOVERNANCE.md)

### CI Validation

- [CI Validation Flow](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/ci.md)

### Pull Requests

- [Pull Request Guidelines](./docs/pull-requests.md)

This documentation set covers the adaptive systems, dashboard explainability, and conversational coaching layers of the product.

## Features Implemented

- Auth: register, login, session validation
- Users: create user profile
- Fitness: create and fetch active fitness profile
- Training: create and fetch active training plan
- Progress: workout logs and progress summary
- Dashboard: consolidated home endpoint
- AI: coach feedback, explainability, replay, and conversational chat
- Mobile: login flow and dashboard consumption

## Engineering Highlights

- Spec-driven development with explicit use-case documentation under `docs/specs/`
- DDD-lite modular monolith with bounded contexts
- Deterministic-first adaptive coaching architecture
- Repository pattern across persistence boundaries
- JWT-based authentication and protected endpoints
- Shared contracts via `packages/types`
- Shared HTTP client via `packages/api-client`
- Shared UI base via `packages/ui`
- Automated backend test coverage with Jest
- Mobile app integrated into the same Nx workspace

## How To Run

### 1. Install dependencies

```bash
npm install
```

### 2. Start MongoDB with Docker Compose

```bash
docker compose up -d
```

This starts a local MongoDB on port `27017` with a persistent Docker volume.

### 3. Configure environment variables

Backend:

```bash
cp .env.example .env
```

Set at least:

- `PORT=3000`
- `MONGODB_URI=mongodb://localhost:27017/elev9`
- `JWT_SECRET=change-me`

Mobile:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set:

- `EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000`
- `EXPO_PUBLIC_DEMO_MODE=true`

Important:

- On a physical phone, do not use `localhost`
- Use your computer local network IP, for example `http://192.168.1.20:3000`

### 4. Start the backend

```bash
npm run start
```

### 5. Start the mobile app

```bash
npm run mobile:start
```

### 6. Run tests

```bash
npm run test
```

## Docker Runtime

The Docker runtime remains local-first and development-oriented.
Use `.env.docker.example` as a separate runtime template from the standard application environment flow.

```bash
cp .env.docker.example .env
docker compose up --build
```

The compose setup builds the API image deterministically and starts MongoDB alongside the backend.

## Project Status

Elev9 Coach is an evolving MVP. The backend domain flow is already structured around explicit specs and modular boundaries, and the mobile app currently covers the minimum functional loop for authentication and home dashboard consumption.

This repository is intentionally not presented as production-ready. The current goal is to show technical rigor, product thinking, and a clean path for continued expansion.

## Demo

A practical demo guide is available at [docs/demo/README.md](/Users/rodrigopaiva/Desktop/Travail/Portfolio/elev9/docs/demo/README.md).

## Next Steps

- Expand the mobile experience beyond login and home dashboard
- Add richer UI states and onboarding flows
- Introduce web surfaces for landing page and internal/admin use cases
- Increase end-to-end coverage in environments where mobile and database services can run freely
- Continue extracting stable shared contracts and presentation primitives across apps
- Continue evolving conversational coaching without losing deterministic behavior or explainability
