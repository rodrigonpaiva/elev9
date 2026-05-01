# Architecture Overview

## Summary

Elev9 Coach is organized as an Nx monorepo with a modular NestJS backend and an Expo React Native client. The current architecture is intentionally MVP-oriented: clear boundaries, low operational complexity, and enough structure to scale without rewriting core flows.

## Workspace Structure

```text
apps/
  api/
  mobile/

packages/
  api-client/
  types/
  ui/
```

## Backend Model

The backend is implemented as a modular monolith using DDD-lite conventions.

Core characteristics:

- feature-oriented modules
- use-case level application services
- repository abstractions
- Mongoose persistence adapters
- JWT authentication
- explicit specs for each implemented flow

Main implemented domains:

- `auth`
- `users`
- `fitness`
- `training`
- `progress`
- `dashboard`

## Mobile Model

The mobile app is an Expo React Native application inside the same monorepo. It consumes the backend through the shared `@elev9/api-client` package and reuses public contracts from `@elev9/types`.

Current mobile scope:

- login
- token persistence
- authenticated dashboard flow

## Shared Packages

### `packages/types`

Public request and response contracts shared between backend-facing clients.

### `packages/api-client`

Typed HTTP client used by mobile today and intended for future web consumers.

### `packages/ui`

Small reusable UI primitives for the mobile layer. This package intentionally avoids domain logic.

## Architectural Intent

The project optimizes for:

- implementation clarity
- low-friction iteration
- safe future extraction
- strong contract consistency across backend and clients

It does not yet optimize for:

- distributed services
- advanced caching
- production-grade observability
- large-scale operational concerns

## Engineering Highlights

- spec-driven development
- modular monolith
- repository pattern
- shared package strategy
- typed API consumption
- test-backed backend workflows

## Positioning

This is an MVP in progress, not a production-ready platform. The architecture is designed to demonstrate sound engineering decisions, product iteration discipline, and a credible path toward broader web and mobile surfaces.
