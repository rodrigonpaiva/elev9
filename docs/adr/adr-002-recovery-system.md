# ADR-002 — Recovery & Adaptive Coaching System

## Status

Accepted

## Context

The Elev9 Coach MVP started with static or lightly contextual feedback. That was enough to validate the first coaching loop, but it did not support daily changes in user state, recovery needs, or training readiness.

As the product evolved, the backend gained several inputs that can be combined into a daily recovery model:

- a daily self-reported check-in
- workout progress signals
- a consolidated `UserHealthContext`
- deterministic fatigue and trend heuristics
- contextual coach feedback
- recovery-aware dashboard and mobile UX

The architectural goal was to introduce adaptive coaching without jumping directly to an LLM-first design. The system needed to remain:

- explainable
- testable
- deterministic
- safe from medical claims
- easy to extend later with richer signals or an LLM layer

This decision establishes the recovery system as an internal product capability, not as a diagnostic or medical feature.

## Decision

The recovery layer is structured as a deterministic pipeline:

```txt
Daily Check-in
→ UserHealthContext
→ Fatigue Level
→ Recovery Trend
→ Contextual Coach Feedback
→ Dashboard Recovery
→ Mobile Recovery Experience
```

The backend is the source of truth for recovery logic. The mobile app and dashboard consume the resulting read models through shared contracts.

The system currently uses:

- daily subjective signals
- workout history
- recent progress
- current streak
- aggregate training output
- simple heuristics for interpretation

No LLM is required for the current implementation.

## Current Signals

### Daily Check-in

The user can submit a daily recovery check-in with the following fields:

- `energyLevel`
- `sleepQuality`
- `muscleSoreness`
- `motivationLevel`

Each value is rated from `1` to `5`.

### Recovery Signals

The backend combines the check-in with existing progress data:

- `currentStreak`
- `averageWorkoutDuration`
- `weeklyFrequency`
- recent workout activity
- latest daily check-in

### Context Sources

The `UserHealthContext` is built from:

- `UserProfile`
- active `FitnessProfile`
- active `TrainingPlan`
- recent `WorkoutLog` records
- latest `DailyCheckIn`

## Heuristics

### Fatigue Level

`fatigueLevel` is a deterministic signal with three values:

- `LOW`
- `MODERATE`
- `HIGH`

Current behavior:

- `HIGH` when the latest check-in shows low energy, poor sleep, or high soreness
- `LOW` when recovery signals are strong and consistency is healthy
- `MODERATE` as a safe fallback when the signal is mixed or incomplete
- if no check-in exists, the system falls back to progress-based heuristics

The implementation is intentionally simple and predictable. It is not a clinical or physiological diagnosis.

### Recovery Trend

`recoveryTrend` is another deterministic recovery signal with three values:

- `improving`
- `stable`
- `needs_recovery`

Current behavior:

- based on the last 3 daily check-ins
- compares the most recent check-in to the oldest check-in in the window
- considers:
  - energy moving up or down
  - sleep quality moving up or down
  - soreness moving up or down
- returns `stable` when there are fewer than 3 check-ins or when the pattern is mixed

This keeps the trend readable and easy to test.

## Rationale

### Deterministic first

The recovery system was introduced as a deterministic layer before any LLM integration. That choice keeps the product behavior stable and makes it possible to validate the system through unit tests and endpoint specs.

### Explainability

The current architecture makes it possible to explain why a user is seeing a given recovery state:

- the latest check-in is visible
- fatigue level has a visible rule-based basis
- trend is derived from a small recent window
- coach feedback can reference the same context

### No medical claims

The system intentionally avoids diagnosis language. It uses user-reported recovery inputs and training history only. This keeps the feature in the product domain rather than the medical domain.

### Future LLM readiness

The architecture already separates:

- context building
- heuristic interpretation
- feedback generation
- presentation

That separation makes it easier to swap or augment the feedback layer later with an LLM without rewriting the underlying recovery model.

### Testability

Each step can be tested independently:

- check-in persistence
- context composition
- fatigue heuristics
- trend heuristics
- coach feedback adaptation
- dashboard mapping
- mobile rendering

## Consequences

### Positive

- adaptive coaching foundation
- richer dashboard context
- more useful mobile recovery UX
- deterministic and easy-to-debug behavior
- future readiness for LLM-based coaching
- clear contract boundaries across backend and clients

### Negative

- heuristics remain simple
- recovery is still only partially personalized
- no biometric or wearable data yet
- no real physiological readiness model yet
- no advanced recommendation engine yet

## Future Work

The current system is intentionally minimal. Likely extensions include:

- readiness score
- wearable integrations
- HRV and sleep API ingestion
- semantic memory for coach interactions
- nutrition correlation
- adaptive training load adjustments
- recommendation engine
- LLM orchestration
- predictive fatigue detection
- streak anomaly detection

These are not part of the current ADR. They are future options once the deterministic foundation proves useful.

## Technical Notes

### Current Endpoints

- `POST /progress/daily-check-in`
- `GET /progress/daily-check-ins`
- `GET /dashboard/home`
- `GET /ai/context`
- `POST /ai/coach-feedback`

### Current Modules

- `progress`
- `ai`
- `dashboard`
- `mobile`

### Shared Contracts

The recovery system is exposed through shared contracts in:

- `packages/types`
- `packages/api-client`

### Relevant Documentation

- [Architecture Overview](../architecture/overview.md)
- [Generate Coach Feedback ADR Links](../specs/ai/generate-coach-feedback/adr-links.md)
- [Get Home Dashboard ADR Links](../specs/dashboard/get-home-dashboard/adr-links.md)

## Summary

The Recovery & Adaptive Coaching System is a deterministic, explainable foundation for adaptive coaching in Elev9 Coach.

It connects daily self-reporting, progress history, fatigue interpretation, and recovery-aware UX without introducing LLM dependence or medical claims.

The design deliberately keeps the underlying signals simple so the product can evolve safely toward richer recovery modeling later.
