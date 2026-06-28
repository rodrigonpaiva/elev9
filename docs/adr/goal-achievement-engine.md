# Goal Achievement Engine

Status: Accepted

## Context

The repository already has strong signal layers for fitness, progress, nutrition, recovery, training, dashboard, and AI coaching. It does not yet have a canonical goal bounded context that can own long-term user outcomes.

Today, goal-related state is fragmented:

- `FitnessProfile.goal` seeds coarse objectives only
- `ProgressSummary` captures short-term progress signals
- `RecoverySnapshot` captures readiness and fatigue
- `NutritionProgress` captures adherence
- `TrainingPlan` and `AdaptiveTrainingRecommendation` capture training intent and adaptation
- `UserHealthContext`, `CoachDecision`, and dashboard summaries synthesize signals, but do not own goal state

The current product uses a dedicated Goal Achievement Engine as the canonical source of truth for long-term outcome tracking.

## Decision

The current product uses a goal bounded context with:

- `Goal` as the canonical aggregate
- `GoalProgressSnapshot` as the daily read model
- `GoalForecast` as the deterministic prediction read model
- `GoalMilestone` as milestone tracking
- `GoalAchievement` as completion history

The engine is read-model first and deterministic-first. It reuses existing signals from recovery, nutrition, training, progress, and AI, but it does not depend on any of those modules owning goal state.

## Consequences

Positive:

- goal semantics become explicit and versionable
- progress and forecasting can be explained and replayed
- milestones and achievements become first-class domain concepts
- dashboard and coaching layers can consume a single goal source of truth

Tradeoffs:

- `FitnessProfile.goal` becomes a seed, not the canonical store
- target data may be incomplete for some users, so neutral fallback rules are required
- forecast confidence must be guarded against sparse history

## Related Docs

- `docs/specs/goals/build-goal-progress-snapshot/`
- `docs/specs/goals/build-goal-forecast/`
- `docs/specs/goals/get-current-goal/`
- `docs/specs/goals/get-goal-history/`
- `docs/specs/goals/get-goal-milestones/`
- `docs/specs/goals/get-goal-achievement-history/`
