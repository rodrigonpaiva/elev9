# Personalization & Learning Engine

## Overview

The `personalization` bounded context is the deterministic adaptation layer for Elev9 Coach.

It consumes read models from recovery, adaptive training, goals, coach decisions, notifications, and habits. It does not own those domains and does not use machine learning to infer behavior.

## Canonical Entities

- `UserBehaviorProfile`
- `BehavioralPattern`
- `PersonalizationSnapshot`
- `PersonalizationSummary`

## Value Objects

- `CoachingStyle`
- `EngagementProfile`
- `ResponsivenessLevel`
- `BehavioralPatternType`
- `PersonalizationTrend`

## Repository Contracts

- `UserBehaviorProfileRepository`
- `PersonalizationSnapshotRepository`
- `BehavioralPatternRepository`

## Build Use Cases

- `BuildPersonalizationSnapshotUseCase`
- `BuildBehavioralPatternsUseCase`
- `BuildUserBehaviorProfileUseCase`

## Read Use Cases

- `GetCurrentPersonalizationUseCase`
- `GetTodayPersonalizationUseCase`
- `GetPersonalizationHistoryUseCase`
- `GetBehavioralPatternsUseCase`
- `GetUserBehaviorProfileUseCase`

## Replay

- `ReplayPersonalizationSnapshotUseCase`

Replay must use persisted `sourceContext` only and follow the shared replay comparator conventions.

## Related ADR

- [Personalization & Learning Engine](../../adr/personalization-learning-engine.md)

## Related Specs

- [build-personalization-snapshot](build-personalization-snapshot/README.md)
- [build-behavioral-patterns](build-behavioral-patterns/README.md)
- [build-user-behavior-profile](build-user-behavior-profile/README.md)
- [get-current-personalization](get-current-personalization/README.md)
- [get-today-personalization](get-today-personalization/README.md)
- [get-personalization-history](get-personalization-history/README.md)
- [get-behavioral-patterns](get-behavioral-patterns/README.md)
- [get-user-behavior-profile](get-user-behavior-profile/README.md)
- [replay-personalization-snapshot](replay-personalization-snapshot/README.md)
