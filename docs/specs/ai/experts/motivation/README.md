# Motivation Expert Specification

## 1. Overview

`MotivationExpert` is the behavioral engagement and motivational strategy specialist in the Elev9 Coach Intelligence layer.

It interprets trusted backend evidence about recent achievement, comeback behavior, streaks, plateaus, regression, progress momentum, and cross-domain consistency, then produces deterministic structured intelligence about the most appropriate internal motivational strategy.

The expert does not generate motivational text, does not infer emotions, does not diagnose psychological conditions, does not mutate data, and does not produce the final coach reply.

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

- recent achievements
- recent failures
- workout completion trend
- nutrition adherence trend
- recovery consistency
- goal progression
- habit consistency
- progress evolution
- inactivity periods
- comeback situations
- streaks
- milestone completion
- plateau situations
- regression periods

It reuses trusted backend context and existing domain expert output instead of duplicating domain logic.

The analysis is intentionally conservative:

- it never fabricates achievements or failures
- it never infers feelings or mental state
- it never invents unseen opportunities
- it never modifies user data
- it only reasons from trusted backend context

---

## 4. Motivation State Model

Motivation state is classified as:

- `HIGHLY_ENGAGED`
- `ENGAGED`
- `STABLE`
- `NEEDS_SUPPORT`
- `DISENGAGING`
- `UNKNOWN`

This is a behavioral engagement signal, not an emotional or psychological diagnosis.

The state reflects whether the athlete is currently building, maintaining, or losing behavioral momentum.

---

## 5. Motivation Opportunity Model

Motivation opportunity is classified as:

- `RECENT_ACHIEVEMENT`
- `STREAK_EXTENSION`
- `MILESTONE_CLOSE`
- `GOAL_PROGRESS`
- `COMEBACK`
- `CONSISTENCY`
- `PLATEAU_BREAK`
- `RECOVERY_SUCCESS`
- `NONE`

The expert only emits an opportunity when backend evidence supports it.

Opportunity detection is deterministic and based on trusted history, cross-domain signals, and current snapshots.

---

## 6. Strategy Selection Model

The expert selects one primary internal strategy:

- `REINFORCE_PROGRESS`
- `CELEBRATE_CONSISTENCY`
- `FOCUS_NEXT_STEP`
- `REBUILD_ROUTINE`
- `ENCOURAGE_COMEBACK`
- `HIGHLIGHT_IMPROVEMENT`
- `PROMOTE_RECOVERY`
- `REDUCE_OVERLOAD`
- `MAINTAIN_MOMENTUM`

Strategy selection is rule-based only.

It does not generate language.

It does not manipulate the athlete.

It does not infer hidden intent.

---

## 7. Cross-Domain Integration

The expert interprets structured outputs from existing experts:

- Workout Expert for completion and execution quality
- Nutrition Expert for adherence and meal consistency
- Recovery Expert for recovery quality and readiness trend
- Goal Expert for milestones and forecast
- Habit Expert for streaks and routine quality
- Progress Expert for momentum, evolution, plateau, and regression

It does not recalculate those analyses.

It only interprets their published structured contributions and runtime metadata.

---

## 8. Risk Model

Motivation risk is classified as:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

Examples:

- `LOW` for consistent progress, strong adherence, and positive momentum
- `HIGH` for repeated inactivity, regression, or broken routines
- `CRITICAL` for prolonged inactivity, multiple declining domains, or abandoned progression

The risk model remains deterministic and reads only trusted backend data.

---

## 9. Confidence Model

Confidence is classified as:

- `LOW`
- `MEDIUM`
- `HIGH`

Confidence depends exclusively on available backend evidence.

The expert lowers confidence when evidence is sparse instead of inferring certainty.

---

## 10. Recommendation Model

The expert emits deterministic structured recommendation codes only.

Examples:

- `ACKNOWLEDGE_RECENT_PROGRESS`
- `HIGHLIGHT_NEXT_MILESTONE`
- `REINFORCE_DAILY_ROUTINE`
- `ENCOURAGE_SMALL_WINS`
- `FOCUS_ON_RECOVERY`
- `PROMOTE_CONSISTENCY`
- `REDUCE_EXPECTATIONS`
- `MAINTAIN_CURRENT_PATH`
- `REBUILD_FOUNDATION`

No motivational text is generated.
No conversational language is generated.

---

## 11. Runtime Integration

When selected, the internal flow is:

```txt
Runtime
↓
Motivation Expert
↓
Structured Contribution
↓
Composition Engine (future)
```

The expert contributes internal structured intelligence only.

It never composes the final coach response.

---

## 12. Related Docs

- [AI Specs Index](../../README.md)
- [Create Coach Chat](../../create-coach-chat/README.md)
- [Habit Expert](../habits/README.md)
- [Progress Expert](../progress/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../../adr/adr-011-coach-intelligence-architecture.md)
