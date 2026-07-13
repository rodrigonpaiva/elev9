# Habit Expert Specification

## 1. Overview

`HabitExpert` is the behavioral consistency specialist in the Elev9 Coach Intelligence layer.

It interprets trusted backend habit state over time and produces deterministic structured intelligence about consistency, streaks, inactivity, patterns, risk, and long-term behavioral progress.

The expert does not generate prompts, does not call OpenAI directly, does not mutate habit data, and does not produce the final coach reply.

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

The implementation is internal-only and remains hidden behind the existing agent runtime and policy model.

---

## 3. Behavioral Analysis Lifecycle

The expert deterministically evaluates:

- active habits
- completed habits
- missed habits
- skipped habits
- streaks
- longest streak
- broken streaks
- weekly adherence
- monthly adherence
- recent behavior
- consistency trend
- inactivity periods
- workout consistency
- nutrition consistency
- recovery consistency
- goal consistency

It reuses trusted backend context and existing domain expert output instead of duplicating domain logic.

The analysis is intentionally conservative:

- it never fabricates behavioral information
- it never invents unseen patterns
- it never modifies habit state
- it only reasons from trusted backend context

---

## 4. Consistency Model

Consistency is classified as:

- `HIGH`
- `MEDIUM`
- `LOW`
- `UNKNOWN`

The expert evaluates:

- daily consistency
- weekly consistency
- monthly consistency
- streak quality

This model is deterministic and based on backend snapshots, history, and summary data.

---

## 5. Habit Status Model

Habit status is classified as:

- `EXCELLENT`
- `GOOD`
- `INCONSISTENT`
- `POOR`
- `BROKEN`
- `UNKNOWN`

The status expresses the overall behavioral state of the athlete and reflects long-horizon adherence rather than isolated events.

---

## 6. Pattern Interpretation

The expert detects deterministic patterns such as:

- improving consistency
- declining consistency
- weekend-only adherence
- repeated missed days
- repeated skipped workouts
- irregular recovery
- irregular nutrition
- inactivity periods
- broken streaks

Pattern detection is rule-based only.

It does not use AI pattern inference and does not invent latent behavior.

---

## 7. Trend Model

Trend is classified as:

- `IMPROVING`
- `STABLE`
- `DECLINING`
- `UNKNOWN`

The expert reuses existing progress and habit history signals when available and falls back to trusted summary metadata when necessary.

Trend is used to interpret whether the athlete is strengthening routines, maintaining them, or eroding consistency over time.

---

## 8. Cross-Domain Integration

The expert interprets structured outputs from existing experts:

- Workout Expert for workout adherence and execution consistency
- Nutrition Expert for nutrition adherence and meal consistency
- Recovery Expert for recovery consistency and readiness stability
- Goal Expert for goal consistency, forecast, and milestone progression

It does not recalculate those analyses.

It only interprets their published structured contributions and runtime metadata.

---

## 9. Risk Model

Behavioral risk is classified as:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

Examples:

- `LOW` for stable routines, high adherence, and long streaks
- `HIGH` for repeated inactivity, declining consistency, and frequent skipped habits
- `CRITICAL` for abandoned routines, complete loss of consistency, and prolonged inactivity

The risk model remains deterministic and reads only trusted backend data.

---

## 10. Confidence Model

Confidence is classified as:

- `LOW`
- `MEDIUM`
- `HIGH`

Confidence depends exclusively on available backend evidence.

The expert lowers confidence when habit history, summaries, or cross-domain signals are sparse instead of inferring certainty.

---

## 11. Recommendation Model

The expert emits deterministic structured recommendations only.

Examples:

- Maintain current routine.
- Improve daily consistency.
- Reduce skipped days.
- Rebuild workout routine.
- Re-establish nutrition consistency.
- Focus on one habit at a time.
- Reduce inactivity periods.
- Maintain current streak.
- Recover consistency before increasing workload.

No motivational language is generated.
No conversational language is generated.

---

## 12. Runtime Integration

When selected, the internal flow is:

```txt
Runtime
↓
Habit Expert
↓
Structured Contribution
↓
Composition Engine (future)
```

The expert contributes internal structured intelligence only.

It never composes the final coach response.

---

## 13. Related Docs

- [AI Specs Index](../../README.md)
- [Create Coach Chat](../../create-coach-chat/README.md)
- [Workout Expert](../workout/README.md)
- [Nutrition Expert](../nutrition/README.md)
- [Recovery Expert](../recovery/README.md)
- [Goal Expert](../goals/README.md)
- [Progress Expert](../progress/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../../adr/adr-011-coach-intelligence-architecture.md)
