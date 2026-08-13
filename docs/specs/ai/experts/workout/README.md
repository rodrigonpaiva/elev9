# Workout Expert Specification

## 1. Overview

`WorkoutExpert` is the first real domain specialist in the Elev9 Coach Intelligence layer.

It analyzes trusted backend state about training, recovery, goals, progress, and workout history, then produces a deterministic contribution that can later be composed with other experts.

The expert does not generate prompts, does not call OpenAI directly, does not mutate training plans, and does not produce the final coach reply.

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

The current implementation is internal-only and remains hidden behind the existing agent runtime and policy model.

---

## 3. Analysis Model

The expert deterministically evaluates:

- today’s training plan
- recovery readiness
- adaptive recommendation signals
- fatigue
- current goal
- recent workout history
- workout completion
- equipment availability
- physical limitations
- active injuries when present in trusted backend state

It reuses existing domain services and read models instead of duplicating training logic.

The analysis is intentionally conservative:

- it never fabricates certainty
- it never invents a workout plan
- it never modifies the user’s training data
- it only reasons from trusted backend context

---

## 4. Recommendation Model

The expert emits deterministic recommendation codes and human-readable summaries such as:

- maintain today’s session
- reduce training volume
- reduce intensity
- increase intensity
- rest first
- prioritize mobility
- focus on technique
- avoid overhead movements

It may reuse the existing adaptive recommendation when available, but it does not recalculate adaptation algorithms.

---

## 5. Risk Model

Risk is classified into:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

The score is derived from trusted signals only, including readiness, workout completion, repeated skips, and injury or limitation hints.

The expert returns deterministic risk output that the runtime can later compose with other specialist opinions.

---

## 6. Confidence Model

Confidence is returned as:

- `LOW`
- `MEDIUM`
- `HIGH`

Confidence is based on signal completeness and backend certainty.

When the available data is sparse, the expert intentionally lowers confidence instead of guessing.

---

## 7. Runtime Integration

When the workout expert is selected by the coach expert registry:

```txt
Agent Runtime
↓
Workout Expert
↓
Deterministic Contribution
↓
Future Composition Engine
```

The expert currently contributes structured metadata to the agent runtime and trace model. It does not produce a public response and does not change the mobile contract.

---

## 8. Integration With Recovery and Goals

The expert reads recovery readiness and goal state to determine:

- whether training should be maintained or reduced
- whether recovery should be prioritized
- whether the session contributes to the current goal

It depends on existing backend read models and services for those domains.

---

## 9. Related Docs

- [AI Specs Index](../../README.md)
- [Create Coach Chat](../../create-coach-chat/README.md)
- [Agent Execution](../../agent-execution/README.md)
- [Agent Memory](../../agent-memory/README.md)
- [Goal Expert](../goals/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../../adr/adr-011-coach-intelligence-architecture.md)
