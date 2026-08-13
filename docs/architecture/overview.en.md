# Architecture Overview

## Summary

Elev9 Coach is organized as an Nx monorepo with a modular NestJS backend and an Expo React Native client. The current architecture now supports the full AI Coach experience in mobile, alongside the core training, nutrition, recovery, goals, habits, personalization, notification, and AI observability flows.

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
- `nutrition`
- `recovery`
- `goals`
- `habits`
- `personalization`
- `notifications`
- `ai`
- `dashboard`

## Mobile Model

The mobile app is an Expo React Native application inside the same monorepo. It consumes the backend through the shared `@elev9/api-client` package and reuses public contracts from `@elev9/types`.

Current mobile scope:

- login
- token persistence
- authenticated dashboard flow
- full AI Coach experience
- workout, nutrition, recovery, and goal-linked surfaces
- AI coach home, conversation, briefing, memory, insights, ask coach, weekly review, goal guidance, and smart notifications

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
- contract consistency across backend and clients
- explainable coach surfaces
- safety, reliability, and observability around optional LLM-assisted coaching
- modern OpenAI Responses API usage with structured outputs and a centralized parser
- additive streaming transport for coach chat without changing the synchronous contract
- prompt version registry, canary rollout, rollback, and internal evaluation for coach prompts
- safe future extraction

It does not yet optimize for:

- distributed services
- advanced caching
- large-scale operational concerns

## Engineering Highlights

- spec-driven development
- modular monolith
- repository pattern
- shared package strategy
- typed API consumption
- test-backed backend workflows

## Positioning

The architecture is designed to demonstrate sound engineering decisions, product iteration discipline, and a credible path toward broader web and mobile surfaces.
