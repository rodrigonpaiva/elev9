# ADR — Notifications & Engagement Engine

## Status

Proposed

## Context

Elev9 already produces deterministic daily signals from:

- `CoachDecision`
- `GoalProgressSnapshot`
- `GoalForecast`
- `GoalMilestone`
- `GoalAchievement`
- `RecoverySnapshot`
- `AdaptiveTrainingRecommendation`
- nutrition and workout activity signals

Today those signals are consumed by dashboard, coach feedback, and chat, but there is no canonical notification layer that turns them into safe, timely interventions.

The product needs a bounded context that can:

- generate notification decisions deterministically
- keep a notification history
- record engagement events
- measure notification fatigue
- remain provider independent in the MVP

## Decision

Introduce a dedicated bounded context:

```ts
notifications
```

The engine will be read-model-first and deterministic-first.
It will persist daily notification decisions and event history, and it will consume existing platform engines rather than owning coaching logic.

The engine will own:

- `NotificationDecision`
- `NotificationHistory`
- `EngagementEvent`
- `NotificationPreference`
- fatigue protection rules
- formula versioning
- replay/debug support

The engine will consume existing signals from:

- `CoachDecision`
- `GoalProgressSnapshot`
- `GoalForecast`
- `GoalMilestone`
- `GoalAchievement`
- `RecoverySnapshot`
- `AdaptiveTrainingRecommendation`
- nutrition signals
- workout activity signals

## Why Deterministic First

Notifications must be:

- explainable
- replayable
- idempotent
- safe without delivery providers
- stable across retries and reads

LLM is not part of the MVP.

## Why Persist Decisions

Persisting notification decisions provides:

- a stable daily intervention state
- notification history
- engagement tracking
- fatigue suppression
- replay/debug support
- future delivery abstraction

## Explicit Non-Goals

- push provider implementation
- email provider implementation
- marketing automation
- campaign management
- analytics platform

## Consequences

### Positive

- canonical notification decision layer
- no provider lock-in in the MVP
- deterministic replay/debug surface
- fatigue-aware interventions
- clear boundary between coaching and notification delivery

### Negative

- introduces another bounded context and persistence layer
- requires disciplined separation from coaching logic
- daily partitioning must be explicit
- notification fatigue rules must be stable and testable

## Integration Strategy

1. `recovery`, `training`, `goals`, and `CoachDecision` produce stable signals.
2. `notifications` consumes those signals and produces notification decisions.
3. `dashboard` reads notification summaries if needed, but does not own notification logic.
4. `CoachFeedback` and `CoachChat` remain consumers only.
5. `EngagementEvent` records user interactions with notifications.
6. `NotificationPreference` guides future channel selection without requiring providers.

## Related Specs

- [build-notification-decision](../specs/notifications/build-notification-decision/README.md)
- [get-today-notification](../specs/notifications/get-today-notification/README.md)
- [get-current-notification](../specs/notifications/get-current-notification/README.md)
- [get-notification-history](../specs/notifications/get-notification-history/README.md)
- [record-engagement-event](../specs/notifications/record-engagement-event/README.md)
- [get-engagement-summary](../specs/notifications/get-engagement-summary/README.md)
- [replay-notification-decision](../specs/notifications/replay-notification-decision/README.md)
