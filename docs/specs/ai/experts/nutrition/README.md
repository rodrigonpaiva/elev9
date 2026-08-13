# Nutrition Expert Specification

## 1. Overview

`NutritionExpert` is the nutrition domain specialist in the Elev9 Coach Intelligence layer.

It analyzes trusted backend state about nutrition profiles, nutrition plans, today’s meals, macro adherence, meal timing, dietary restrictions, allergies, preferred foods, recovery readiness, training load, and goal state. It produces a deterministic structured contribution that can later be composed with other experts.

The expert does not generate prompts, does not call OpenAI directly, does not mutate nutrition plans, and does not produce the final coach reply.

---

## 2. Contract

The expert implements the shared coach expert contract and exposes metadata only:

- `id`
- `displayName`
- `version`
- `category`
- `supportedIntents`
- `supportedDomains`
- `estimatedCost`
- `estimatedLatencyMs`
- `priority`
- `capabilities`
- `enabled`

The implementation is internal-only and stays behind the existing agent runtime and policy model.

---

## 3. Analysis Model

The expert deterministically evaluates:

- nutrition profile availability
- current nutrition plan availability
- today’s meals
- macro adherence for protein, carbohydrates, fat, and calories
- meal completion and meal timing
- dietary restrictions and allergies
- preferred and disliked foods
- scheduled training today
- recovery readiness
- current goal

It reuses existing nutrition read models and services instead of duplicating domain logic.

The analysis is intentionally conservative:

- it never fabricates certainty
- it never invents nutrition data
- it never modifies the user’s nutrition data
- it only reasons from trusted backend context

---

## 4. Macro Assessment

The expert evaluates each macro target as:

- `LOW`
- `PARTIAL`
- `ON_TARGET`
- `EXCEEDED`
- `UNKNOWN`

The summary is derived from the existing nutrition calculations and the active plan snapshot.

---

## 5. Meal Assessment

The expert evaluates meal completion as:

- `COMPLETED`
- `PARTIAL`
- `MISSED`
- `PENDING`
- `UNKNOWN`

Meal timing is also normalized so the runtime can reason about whether nutrition is ahead, on track, or behind the schedule.

---

## 6. Recommendation Model

The expert emits deterministic recommendation codes and human-readable summaries such as:

- increase protein intake
- complete remaining meals
- prioritize post-workout nutrition
- improve hydration
- maintain current nutrition plan
- distribute protein more evenly
- avoid skipping breakfast
- review calorie intake
- follow today’s nutrition schedule

It may reuse existing nutrition domain services, but it does not recalculate nutrition algorithms.

---

## 7. Risk Model

Risk is classified into:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

The score is derived from trusted signals only, including macro adherence, meal completion, missed meals, recovery support, and restriction or allergy conflicts.

The expert returns deterministic risk output that the runtime can later compose with other specialist opinions.

---

## 8. Confidence Model

Confidence is returned as:

- `LOW`
- `MEDIUM`
- `HIGH`

Confidence is based on signal completeness and backend certainty.

When the available data is sparse, the expert intentionally lowers confidence instead of guessing.

---

## 9. Runtime Integration

When the nutrition expert is selected by the coach expert registry:

```txt
Agent Runtime
↓
Nutrition Expert
↓
Deterministic Contribution
↓
Future Composition Engine
```

The expert currently contributes structured metadata to the agent runtime and trace model. It does not produce a public response and does not change the mobile contract.

---

## 10. Integration With Recovery, Goals, and Training

The expert reads recovery readiness, training schedule, and goal state to determine:

- whether nutrition should be prioritized for recovery support
- whether the current nutrition plan still fits the current training load
- whether the session contributes to the user’s active goal

It depends on existing backend read models and services for those domains.

---

## 11. Related Docs

- [AI Specs Index](../../README.md)
- [Create Coach Chat](../../create-coach-chat/README.md)
- [Agent Execution](../../agent-execution/README.md)
- [Agent Memory](../../agent-memory/README.md)
- [Workout Expert](../workout/README.md)
- [Goal Expert](../goals/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../../adr/adr-011-coach-intelligence-architecture.md)
