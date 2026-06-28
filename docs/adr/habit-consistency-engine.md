# ADR — Habit & Consistency Engine

## Status

Proposed

## Context

Elev9 already tracks short-term execution through:

- `RecoverySnapshot`
- `AdaptiveTrainingRecommendation`
- `GoalProgressSnapshot`
- `GoalForecast`
- `GoalMilestone`
- `GoalAchievement`
- `CoachDecision`
- `NotificationDecision`
- dashboard read models

Those engines capture important signals, but the platform does not yet have a canonical bounded context for long-term behavioral consistency, streak analysis, habit adherence, and dropout risk.

The product needs a deterministic engine that can answer:

- is the user becoming more consistent?
- is a streak at risk?
- is the user drifting toward dropout?
- what long-term habit patterns are stable, improving, or declining?

## Decision

Introduce a dedicated bounded context:

```ts
habits;
```

The Habit Engine will be read-model-first and deterministic-first.
It will consume existing platform signals and turn them into canonical habit snapshots, consistency summaries, and risk signals.

The engine will own:

- `HabitSnapshot`
- `ConsistencySummary`
- `HabitRiskSignal`
- habit replay/debug support
- deterministic habit formulas
- consistency trend classification

The engine will consume existing signals from:

- workouts
- daily check-ins
- recovery
- goals
- coach decisions
- notification engagement

## Source of Truth

The Habit Engine is the canonical source of truth for long-term consistency state.

It does not replace:

- Recovery
- Adaptive Training
- Goals
- Coach Decision
- Notifications

Instead, it provides the long-horizon consistency layer that those engines can read from.

## Deterministic First

Habit state must be:

- explainable
- replayable
- idempotent
- safe without live recomputation
- stable under retries and reads

LLMs are not part of the MVP.

## Replay Strategy

Habit replay will rebuild from persisted reduced `sourceContext` only.
Replay must not query live engines, and it must compare only deterministic fields using the platform replay conventions established in Epic 6.

## Relationship to Other Engines

- Goals provide long-term targets and milestones.
- CoachDecision can consume consistency trend and risk signals.
- Notifications can consume streak risk and dropout risk.
- Dashboard can display consistency summary and risk signals.
- Recovery and Adaptive Training remain upstream signal providers, not owners of habit logic.

## Explicit Non-Goals

- habit coaching provider integration
- ML-based dropout prediction
- behavioral analytics platform
- push/email delivery
- user-facing habit editing UI

## Consequences

### Positive

- canonical long-term consistency source
- deterministic streak/risk analysis
- clear separation from short-term coaching and recovery logic
- replay/debug friendly behavior

### Negative

- introduces another bounded context and read model family
- requires careful source-context governance
- risk of overlap with Goal and Notification domains if boundaries drift

## Future Evolution

The initial MVP should focus on daily habit snapshots, consistency summaries, and deterministic risk signals.
Future phases may add habit preferences, habit-specific goal grouping, and richer replay/debug surfaces, but only if they remain deterministic and read-model-first.

## Related Specs

- [build-habit-snapshot](../specs/habits/build-habit-snapshot/README.md)
- [get-today-habits](../specs/habits/get-today-habits/README.md)
- [get-current-habits](../specs/habits/get-current-habits/README.md)
- [get-habit-history](../specs/habits/get-habit-history/README.md)
- [get-consistency-summary](../specs/habits/get-consistency-summary/README.md)
- [get-habit-risk-signals](../specs/habits/get-habit-risk-signals/README.md)
- [replay-habit-snapshot](../specs/habits/replay-habit-snapshot/README.md)
