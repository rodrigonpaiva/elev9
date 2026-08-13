# ADR — Adaptive Training Engine

## Status

Accepted

## Context

Elev9 already has the core signals required to adapt training decisions:

- training plans
- workout logs
- daily check-ins
- recovery snapshots
- nutrition plans and nutrition recommendations
- AI health context and coach feedback

Today these signals are consumed independently by different modules.
That creates duplicated heuristics and inconsistent training guidance.

The product needs a single deterministic read model for adaptive training:

```txt
AdaptiveTrainingRecommendation
```

The engine must remain:

- deterministic-first
- explainable
- replayable
- testable
- independent from LLM availability

## Decision

The Adaptive Training Engine is implemented as a deterministic bounded capability that owns adaptive training recommendation generation.

The module will own:

- `AdaptiveTrainingRecommendation`
- `AdaptiveTrainingInfluence`
- formula versioning
- recommendation persistence
- current/today/history read models

The engine consumes signals from existing bounded contexts:

- `training`
- `progress`
- `recovery`
- `nutrition`
- `ai` context

The MVP will not rewrite persisted `TrainingPlan` data.
It will produce a durable recommendation read model only.

## Why Deterministic First

Adaptive training affects daily user guidance and must be:

- reproducible
- explainable
- versioned
- safe without LLM dependency
- replayable for debugging

LLMs may later interpret or narrate the recommendation, but the core decision must remain deterministic.

## Why Persist Recommendations

Persisting the recommendation gives:

- stable daily state
- historical adaptation trends
- idempotent reads
- replay/debug support
- shared consumption by dashboard and AI

## Why a Read Model First

The MVP should inform the user and downstream systems without mutating the training plan.
This keeps the blast radius low and avoids coupling recommendation logic to plan rewriting.

## Read Model Contract

The canonical adaptive training object is:

```ts
{
  id: string;
  userProfileId: string;
  trainingPlanId?: string;
  date: string;
  recommendationType:
    | 'increase_intensity'
    | 'decrease_intensity'
    | 'increase_volume'
    | 'decrease_volume'
    | 'recovery_workout'
    | 'rest_day'
    | 'reschedule_workout'
    | 'maintain';
  recommendedIntensity: 'recovery' | 'light' | 'moderate' | 'hard';
  volumeAction: 'increase' | 'maintain' | 'decrease';
  reasoning: string;
  influences: AdaptiveTrainingInfluence[];
  sourceContext: object;
  formulaVersion: string;
  generatedBy: 'deterministic';
  createdAt: Date;
  updatedAt: Date;
}
```

## Consequences

### Positive

- one canonical adaptive training source
- simpler dashboard and AI consumption
- stable daily history
- deterministic replay/debug
- a clean foundation for future plan rewriting

### Negative

- added persistence and repository complexity
- formula versioning discipline is required
- day boundary handling must be explicit
- some existing heuristics will need consolidation later

## Integration Strategy

1. `training` provides the active plan and planned load.
2. `progress` provides workout logs, adherence, and streak.
3. `recovery` provides readiness and fatigue as the primary signal.
4. `nutrition` provides support signals as a secondary input.
5. `dashboard` reads the recommendation for user-facing guidance.
6. `ai` context consumes the recommendation without recalculating it.
7. `coach feedback` turns the recommendation into readable guidance.

## Related Specs

- [build-adaptive-training-recommendation](../specs/training/adaptive/build-adaptive-training-recommendation/README.md)
- [get-current-adaptive-training](../specs/training/adaptive/get-current-adaptive-training/README.md)
- [get-today-adaptive-training](../specs/training/adaptive/get-today-adaptive-training/README.md)
- [get-adaptive-training-history](../specs/training/adaptive/get-adaptive-training-history/README.md)
