# ADR — Recovery & Readiness Engine

## Status

Accepted

## Context

Elev9 already has the raw signals required to estimate user recovery and readiness:

- daily check-ins
- workout logs
- training plan completion
- streak and adherence heuristics
- dashboard recovery guidance
- AI context and coach feedback signals

Today these signals are spread across `progress`, `dashboard`, and `ai`.
That creates duplicated logic and different vocabulary for the same product concept.

The product needs a single deterministic source of truth:

```txt
RecoverySnapshot
```

The recovery layer must remain:

- deterministic-first
- explainable
- testable
- replayable
- safe without LLM dependency

## Decision

The Recovery & Readiness Engine is implemented as a deterministic bounded capability that owns the recovery snapshot lifecycle.

The module will own:

- `RecoverySnapshot`
- `RecoveryInfluence`
- recovery scoring formulas
- recovery trend calculation
- recommended intensity mapping
- recovery snapshot persistence

The source signals will continue to come from existing bounded contexts:

- `progress`
- `training`
- `nutrition`
- `ai` context

The engine is the canonical producer of recovery data for:

- `dashboard`
- `ai` context
- coach feedback
- future adaptive training

## Why Deterministic First

Recovery and readiness affect daily product guidance.
They must be:

- reproducible
- explainable
- versioned
- safe for offline/local development
- independent from LLM availability

LLM-based interpretation may be added later as a presentation layer, but the core recovery model must be deterministic.

## Why Persist Recovery Snapshots

Recovery data is consumed repeatedly by multiple surfaces. Persisting snapshots gives:

- stable daily state
- historical recovery evolution
- trend comparison over time
- replay/debug support
- idempotent reads

The snapshot is a read model, but it must be durable so the same day can be inspected consistently.

## Why a Single Snapshot

A single snapshot avoids duplicated recovery logic in:

- dashboard heuristics
- AI context building
- coach feedback generation
- nutrition recommendations

The engine becomes the source of truth for:

- `readinessScore`
- `fatigueScore`
- `recoveryTrend`
- `recommendedIntensity`

## Read Model Contract

The canonical recovery object is:

```ts
{
  userProfileId: string;
  date: string;
  readinessScore: number;
  fatigueScore: number;
  recoveryTrend: 'improving' | 'stable' | 'declining';
  recommendedIntensity: 'recovery' | 'light' | 'moderate' | 'hard';
  influences: RecoveryInfluence[];
  formulaVersion: string;
  sourceContext: object;
  createdAt: Date;
}
```

## Consequences

### Positive

- one canonical recovery source
- simpler dashboard and AI consumption
- stable day-level recovery history
- deterministic replay/debug
- clear separation between signal generation and presentation

### Negative

- additional persistence and repository complexity
- formula versioning discipline is required
- timezone handling must be explicit
- some existing heuristics will need migration into the new engine

## Integration Strategy

The new engine will be consumed progressively:

1. `dashboard` reads the recovery snapshot instead of recomputing heuristics.
2. `ai` context consumes the snapshot and exposes a reduced version to coach flows.
3. `CoachFeedbackGenerator` uses recovery snapshot fields instead of ad hoc recovery logic.
4. `nutrition` may use the snapshot later for recovery-aware recommendations.
5. `training` becomes the main consumer in the next epic for adaptive load decisions.

## Related Specs

- [build-recovery-snapshot](../specs/recovery/build-recovery-snapshot/README.md)
- [get-current-recovery](../specs/recovery/get-current-recovery/README.md)
- [get-recovery-history](../specs/recovery/get-recovery-history/README.md)
- [get-today-recovery](../specs/recovery/get-today-recovery/README.md)

## Related ADRs

- [ADR-002 — Recovery & Adaptive Coaching System](./adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](./adr-003-coach-feedback-explainability.md)
- [ADR-004 — Conversational Coach Architecture](./adr-004-conversational-coach-architecture.md)
