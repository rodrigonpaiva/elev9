# Goal Expert Specification

## 1. Overview

`GoalExpert` is the goal-domain specialist in the Elev9 Coach Intelligence layer.

It analyzes trusted backend state about the active goal, goal progress snapshots, forecast state, milestones, achievements, and the deterministic expert signals from workout, nutrition, and recovery. It produces a structured contribution that can later be composed with other experts.

The expert does not generate prompts, does not call OpenAI directly, does not mutate goals, and does not produce the final coach reply.

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

- active goal
- goal status
- progress percentage
- recent progress trend
- goal milestones
- goal completion trajectory
- workout adherence signals
- nutrition adherence signals
- recovery consistency signals
- recent inactivity
- forecast confidence

It reuses existing goal, progress, workout, nutrition, and recovery read models instead of duplicating domain logic.

The analysis is intentionally conservative:

- it never fabricates certainty
- it never invents missing goal state
- it never modifies goals or milestones
- it only reasons from trusted backend context

---

## 4. Progress Evaluation

The expert normalizes progress into an internal assessment with:

- completion percentage
- current and target values when available
- trend
- progress delta
- history depth
- recency of the latest update

This is derived from persisted goal progress snapshots and historical goal evolution.

---

## 5. Forecast Model

The expert evaluates forecast status as:

- `LIKELY`
- `UNCERTAIN`
- `UNLIKELY`
- `UNKNOWN`

The forecast is deterministic and depends only on trusted backend signals, including the stored goal forecast, the current goal target date, progress trend, and cross-domain consistency.

---

## 6. Milestone Model

The expert evaluates milestone state as:

- completed milestones
- remaining milestones
- blocked milestones
- next milestone
- completion percentage

It never creates or mutates milestones. Blocked milestones are derived deterministically from stale or declining execution signals.

---

## 7. Cross-Domain Interpretation

The expert consumes the deterministic contributions from:

- `WorkoutExpert`
- `NutritionExpert`
- `RecoveryExpert`

It uses those specialist signals to interpret whether the athlete is realistically progressing toward the current objective.

---

## 8. Recommendation Model

The expert emits deterministic recommendation codes and summaries such as:

- maintain current strategy
- increase weekly consistency
- improve workout adherence
- improve nutrition adherence
- prioritize recovery
- focus on the next milestone
- review training frequency
- reduce inactivity periods
- stay consistent with the current plan

It does not produce conversational copy.

---

## 9. Runtime Integration

When the goal expert is selected by the coach expert registry:

```txt
Agent Runtime
↓
Goal Expert
↓
Deterministic Contribution
↓
Future Composition Engine
```

The expert contributes structured metadata to the agent runtime and trace model. It does not produce a public response and does not change the mobile contract.

---

## 10. Related Docs

- [AI Specs Index](../../README.md)
- [Create Coach Chat](../../create-coach-chat/README.md)
- [Agent Execution](../../agent-execution/README.md)
- [Agent Memory](../../agent-memory/README.md)
- [Workout Expert](../workout/README.md)
- [Nutrition Expert](../nutrition/README.md)
- [Recovery Expert](../recovery/README.md)
- [Progress Expert](../progress/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../../adr/adr-011-coach-intelligence-architecture.md)
