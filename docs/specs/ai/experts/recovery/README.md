# Recovery Expert Specification

## 1. Overview

`RecoveryExpert` is the recovery domain specialist in the Elev9 Coach Intelligence layer.

It analyzes trusted backend state about recovery snapshots, readiness, fatigue, recovery trend, training impact, sleep quality, muscle soreness, recent recovery history, training load, nutrition support, and goal state. It produces a deterministic structured contribution that can later be composed with other experts.

The expert does not generate prompts, does not call OpenAI directly, does not mutate training or nutrition plans, and does not produce the final coach reply.

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

- current recovery snapshot
- readiness score
- fatigue score
- recovery trend
- recommended training intensity
- sleep quality when available
- muscle soreness when available
- recovery history
- today’s planned workout
- today’s nutrition support
- current goal
- recent training load

It reuses existing recovery and nutrition read models and services instead of duplicating domain logic.

The analysis is intentionally conservative:

- it never fabricates certainty
- it never invents recovery signals
- it never modifies user training or nutrition data
- it only reasons from trusted backend context

---

## 4. Readiness Interpretation

The expert interprets readiness using the existing recovery snapshot and labels it as:

- `OPTIMAL`
- `GOOD`
- `MODERATE`
- `POOR`
- `CRITICAL`
- `UNKNOWN`

It does not recalculate the underlying recovery algorithm.

---

## 5. Trend Interpretation

The expert evaluates recovery trend as:

- `IMPROVING`
- `STABLE`
- `DECLINING`
- `UNKNOWN`

Trend can be sourced from the latest snapshot or inferred from trusted history when needed.

---

## 6. Training Impact Model

The expert maps recovery state to deterministic training impact:

- `FULL_SESSION`
- `REDUCED_VOLUME`
- `REDUCED_INTENSITY`
- `TECHNIQUE_ONLY`
- `ACTIVE_RECOVERY`
- `FULL_REST`

This mapping reuses the adaptive recommendation already present in the recovery and training layers.

---

## 7. Recommendation Model

The expert emits deterministic recommendation codes and human-readable summaries such as:

- proceed with today’s session
- reduce today’s volume
- reduce today’s intensity
- prioritize recovery
- complete mobility work
- take a full recovery day
- maintain recovery routine
- improve sleep consistency
- prioritize hydration
- use technique-only work

It may reuse existing adaptive recommendation signals, but it does not recalculate adaptation algorithms.

---

## 8. Risk Model

Risk is classified into:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

The score is derived from trusted signals only, including readiness, trend, fatigue, sleep quality, soreness, recovery history, and nutrition support.

The expert returns deterministic risk output that the runtime can later compose with other specialist opinions.

---

## 9. Confidence Model

Confidence is returned as:

- `LOW`
- `MEDIUM`
- `HIGH`

Confidence is based on signal completeness and backend certainty.

When the available data is sparse, the expert intentionally lowers confidence instead of guessing.

---

## 10. Runtime Integration

When the recovery expert is selected by the coach expert registry:

```txt
Agent Runtime
↓
Recovery Expert
↓
Deterministic Contribution
↓
Future Composition Engine
```

The expert currently contributes structured metadata to the agent runtime and trace model. It does not produce a public response and does not change the mobile contract.

---

## 11. Integration With Training, Nutrition, and Goals

The expert reads training load, nutrition support, and goal state to determine:

- whether today’s session should be maintained or reduced
- whether recovery should be prioritized
- whether nutrition support is adequate for recovery
- whether the current recovery state supports the active goal

It depends on existing backend read models and services for those domains.

---

## 12. Related Docs

- [AI Specs Index](../../README.md)
- [Create Coach Chat](../../create-coach-chat/README.md)
- [Agent Execution](../../agent-execution/README.md)
- [Agent Memory](../../agent-memory/README.md)
- [Workout Expert](../workout/README.md)
- [Nutrition Expert](../nutrition/README.md)
- [Goal Expert](../goals/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../../adr/adr-011-coach-intelligence-architecture.md)
