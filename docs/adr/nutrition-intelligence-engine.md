# ADR — Nutrition Intelligence Engine

## Status

Accepted

## Context

Elev9 Coach already has a Nutrition module, but its implementation currently covers only `NutritionProfile`.

The product now needs a first Nutrition Intelligence Engine capable of:

- calculating macro targets
- generating weekly meal plans
- exposing today nutrition
- logging meal adherence
- replacing planned meals
- producing deterministic nutrition recommendations

The existing architecture is:

- NestJS
- Nx monorepo
- DDD-lite
- modular monolith
- Mongoose
- spec-driven
- deterministic-first adaptive coaching

The nutrition engine integrates progressively with Dashboard and AI Context without making the product LLM-dependent.

## Decision

The Nutrition Intelligence Engine is implemented as a deterministic-first extension of the existing Nutrition bounded context.

The module will own:

- `NutritionProfile`
- `MacroTargets`
- `NutritionPlan`
- `NutritionDay`
- `Meal`
- `MealOption`
- `FoodItem`
- `NutritionLog`
- `NutritionRecommendation`

The initial pipeline is:

```txt
Authenticated User
→ UserProfile + FitnessProfile + NutritionProfile
→ Macro Target Calculation
→ Weekly NutritionPlan
→ Today Nutrition
→ Nutrition Logs
→ Deterministic Recommendation
→ Dashboard / AI Context integration
```

## Why Deterministic First

Nutrition behavior affects daily product guidance and must be:

- predictable
- testable
- explainable
- safe without external providers
- compatible with local development

LLM behavior can be added later as an optional layer, but the MVP engine must work without it.

## Why Persist Weekly Nutrition Plans

The weekly plan is persisted because users need stable planned meals across sessions.

Persistence also enables:

- meal replacement
- today nutrition
- adherence tracking
- debug and explainability
- future replay of recommendations

Generating a new plan on every read would create inconsistent UX and make replacement history hard to reason about.

## Why Macro Targets Are Calculated and Snapshot

Macro targets are calculation outputs, but they are also stored inside `NutritionPlan`.

This gives two useful behaviors:

- current targets can be recalculated when profile data changes
- historical plans remain explainable because they preserve the targets used when generated

Plan snapshots should not mutate automatically when profile data changes.

## Why Nutrition Logs Stay in Nutrition Module

Meal logs represent nutrition adherence, not generic progress.

The Nutrition module owns:

- meal status
- planned vs actual macros
- meal-level adherence
- nutrition-specific history

The Progress and Dashboard modules may consume aggregated nutrition signals, but they should not own meal logs.

## AI and Dashboard Integration

Dashboard integration should consume stable nutrition read models:

- today macro targets
- meals
- logs
- progress
- nutrition focus

AI Context integration should consume reduced nutrition context:

- nutrition profile
- macro target snapshot
- active plan existence
- today adherence
- recent meal logs
- nutrition recommendation influences

The AI module should not duplicate meal planning rules. Nutrition rules should remain in the Nutrition module and be exposed as structured context.

## Consequences

### Positive

- deterministic behavior
- strong testability
- stable user-facing plans
- explainable recommendations
- clean ownership boundaries
- progressive Dashboard and AI integration

### Negative

- initial meal planning is template-based and limited
- no natural language meal generation in MVP
- requires additional persistence and repository complexity
- macro formula changes require versioning discipline

## Future Directions

Future work may include:

- larger food template catalog
- grocery list generation
- recipe substitutions
- LLM-assisted explanation
- nutrition replay
- semantic food preferences
- wearable or external nutrition database integrations

These are future options, not part of the initial deterministic engine.

## Related Specs

- [calculate-macro-targets](../specs/nutrition/calculate-macro-targets/README.md)
- [create-nutrition-plan](../specs/nutrition/create-nutrition-plan/README.md)
- [get-current-nutrition-plan](../specs/nutrition/get-current-nutrition-plan/README.md)
- [get-today-nutrition](../specs/nutrition/get-today-nutrition/README.md)
- [replace-meal](../specs/nutrition/replace-meal/README.md)
- [log-meal](../specs/nutrition/log-meal/README.md)
- [generate-nutrition-recommendation](../specs/nutrition/generate-nutrition-recommendation/README.md)

## Related ADRs

- [ADR-002 — Recovery & Adaptive Coaching System](./adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](./adr-003-coach-feedback-explainability.md)
- [ADR-004 — Conversational Coach Architecture](./adr-004-conversational-coach-architecture.md)
