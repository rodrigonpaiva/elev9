# Progress Expert Specification

## 1. Overview

`ProgressExpert` is the longitudinal evolution specialist in the Elev9 Coach Intelligence layer.

It interprets trusted backend progress history over time and produces deterministic structured intelligence about improvement, stagnation, regression, momentum, plateau state, consistency evolution, and long-term risk.

The expert does not generate prompts, does not call OpenAI directly, does not mutate progress data, and does not produce the final coach reply.

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

## 3. Longitudinal Analysis Lifecycle

The expert deterministically evaluates:

- overall progress history
- progress snapshots
- weekly evolution
- monthly evolution
- body metric evolution when available
- workout evolution
- workout frequency trend
- training volume trend
- nutrition adherence trend
- recovery trend
- habit trend
- goal progression
- consistency evolution
- inactivity periods
- regression periods
- plateau periods

It reuses trusted backend context and existing domain expert output instead of duplicating domain logic.

The analysis is intentionally conservative:

- it never fabricates historical information
- it never invents unseen patterns
- it never modifies progress state
- it only reasons from trusted backend context

---

## 4. Trend Model

Trend is classified as:

- `STRONGLY_IMPROVING`
- `IMPROVING`
- `STABLE`
- `DECLINING`
- `REGRESSING`
- `UNKNOWN`

The expert reuses existing progress history signals when available and falls back to trusted summary metadata when necessary.

Trend is used to interpret whether the athlete is building momentum, stagnating, or regressing over time.

---

## 5. Momentum Model

Momentum is classified as:

- `HIGH`
- `POSITIVE`
- `NEUTRAL`
- `NEGATIVE`
- `VERY_NEGATIVE`
- `UNKNOWN`

Momentum is derived only from backend evidence such as recent rate change, consistency, inactivity, and cross-domain signals.

---

## 6. Plateau Detection

Plateau is classified as:

- `NONE`
- `SHORT`
- `MODERATE`
- `LONG`
- `UNKNOWN`

The expert detects plateau situations deterministically using rules such as:

- no measurable evolution
- same training load
- stagnant adherence
- stagnant recovery
- stagnant goal progression

No AI prediction is used.

---

## 7. Regression Detection

Regression is classified as:

- `NONE`
- `MINOR`
- `MODERATE`
- `SEVERE`
- `UNKNOWN`

The expert evaluates regression across:

- performance
- consistency
- recovery
- nutrition

Regression is inferred from trusted history, inactivity windows, and cross-domain signals.

---

## 8. Cross-Domain Integration

The expert interprets structured outputs from existing experts:

- Workout Expert for execution quality and workout trend
- Nutrition Expert for adherence trend and macro consistency
- Recovery Expert for recovery evolution and fatigue trend
- Goal Expert for milestone evolution and forecast
- Habit Expert for routine consistency and behavioral evolution

It does not recalculate those analyses.

It only interprets their published structured contributions and runtime metadata.

---

## 9. Risk Model

Progress risk is classified as:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

Examples:

- `LOW` for improving trend, positive momentum, and consistent evolution
- `HIGH` for long plateau, declining adherence, or recurring regression
- `CRITICAL` for severe regression, complete inactivity, prolonged plateau, or negative momentum

The risk model remains deterministic and reads only trusted backend data.

---

## 10. Confidence Model

Confidence is classified as:

- `LOW`
- `MEDIUM`
- `HIGH`

Confidence depends exclusively on available backend evidence.

The expert lowers confidence when progress history, summaries, or cross-domain signals are sparse instead of inferring certainty.

---

## 11. Recommendation Model

The expert emits deterministic structured recommendations only.

Examples:

- Maintain current progression.
- Increase progressive overload.
- Review training progression.
- Improve weekly consistency.
- Reduce inactivity.
- Improve recovery consistency.
- Break the current plateau.
- Maintain current momentum.
- Focus on long-term consistency.

No motivational language is generated.
No conversational language is generated.

---

## 12. Runtime Integration

When selected, the internal flow is:

```txt
Runtime
↓
Progress Expert
↓
Structured Contribution
↓
Composition Engine (future)
```

The expert contributes internal structured intelligence only.

It never composes the final coach response.

---

## 13. Related Specs

- [Create Coach Chat](../../create-coach-chat/README.md)
- [Habit Expert](../habits/README.md)
- [Workout Expert](../workout/README.md)
- [Nutrition Expert](../nutrition/README.md)
- [Recovery Expert](../recovery/README.md)
- [Goal Expert](../goals/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../../adr/adr-011-coach-intelligence-architecture.md)
