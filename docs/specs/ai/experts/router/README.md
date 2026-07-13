# Expert Router Specification

## 1. Overview

`CoachExpertRouterService` is the deterministic internal router that decides which coach experts participate in a request, which one is primary, which ones are complementary, and the order in which they execute.

The router does not call OpenAI, does not inspect raw prompts, does not mutate data, and does not compose the final coach response.

It only turns trusted intent and policy metadata into a structured routing decision.

---

## 2. Routing Contract

The router produces an immutable decision with:

- `primaryExpert`
- `complementaryExperts`
- `orderedExperts`
- `blockedExperts`
- `skippedExperts`
- `routingReasons`
- `estimatedCost`
- `estimatedLatencyMs`
- `confidence`
- `metadata`

The routing snapshot is internal-only and feeds planning, execution, and observability.

---

## 3. Primary Expert Model

Primary selection is deterministic:

- `TRAINING` -> `WorkoutExpert`
- `NUTRITION` -> `NutritionExpert`
- `RECOVERY` -> `RecoveryExpert`
- `GOALS` -> `GoalExpert`
- `HABITS` -> `HabitExpert`
- `PROGRESS` -> `ProgressExpert`
- `MOTIVATION` -> `MotivationExpert`

For ambiguous or general requests, the router falls back to deterministic capability scoring or returns no primary expert when evidence is insufficient.

---

## 4. Complementary Expert Model

Complementary participation is centralized in the router policy.

Representative examples:

- Workout -> Recovery, Goal
- Nutrition -> Goal, Recovery
- Recovery -> Workout, Nutrition
- Goal -> Workout, Nutrition, Recovery, Habit, Progress
- Habit -> Goal, Progress, Motivation
- Progress -> Goal, Habit, Workout, Recovery
- Motivation -> Habit, Progress, Goal

Complementary selection is bounded by policy approval, enabled status, and runtime limits.

---

## 5. Dependency and Order Model

The router resolves execution order deterministically from dependency metadata and stable tie-breakers.

Dependencies influence ordering, not mutability.

The resulting order is topological and reproducible, with fallback to a safe subset when a cycle or invalid route is detected.

---

## 6. Combination Rules

The router centralizes expert combination compatibility rules so the rest of the runtime does not need to reason about expert pairing.

The current model blocks:

- duplicate expert execution
- disabled experts
- policy-blocked experts
- unsupported experts

It permits deterministic compatible combinations inside the coach specialist family.

---

## 7. Policy Integration

The router consumes the existing agent policy decision and respects:

- allowed experts
- blocked experts
- blocked domains
- LLM fallback decisions
- runtime limits

The policy engine remains the source of truth for authorization.

---

## 8. Runtime Integration

The internal runtime flow is:

```txt
Runtime
↓
Policy Engine
↓
Expert Router
↓
Planning Engine
↓
Ordered Expert Execution
```

The router only returns structured routing metadata for planning and execution.

---

## 9. Observability

The runtime records routing metadata internally:

- routing started
- routing completed
- primary expert selected
- complementary experts selected
- experts blocked
- experts skipped
- route validation result
- routing confidence
- execution duration

No routing metadata is exposed to mobile clients.
