# ADR — Personalization & Learning Engine

## Status

Proposed

## Context

Elev9 already has canonical deterministic engines for:

- recovery
- adaptive training
- goals
- coach decisions
- notifications
- habits

Those bounded contexts own their own read models and formulas. What is still missing is a long-horizon personalization layer that adapts how the product speaks, reminds, and intervenes based on observed user behavior patterns.

This capability must not become machine learning, autonomous AI, or a second owner of upstream domains. It should remain deterministic-first, replayable, explainable, and provider-independent.

## Decision

Create a new bounded context:

```ts
personalization
```

This engine will own:

- `UserBehaviorProfile`
- `BehavioralPattern`
- `PersonalizationSnapshot`
- `PersonalizationSummary`
- deterministic personalization formulas
- replay/debug support
- pattern derivation and responsiveness scoring

It will consume read models from existing engines only. It will not own recovery, adaptive training, goals, coach decision, notifications, or habits.

## Ownership Rules

- Upstream engines remain canonical for their own formulas and persistence.
- Personalization reads reduced upstream models only.
- Personalization may derive behavioral adaptations, but it may not rewrite upstream state.
- Personalization never reinterprets raw logs, prompts, or session payloads directly.

## Deterministic Adaptation Philosophy

Personalization must be:

- explainable
- deterministic
- idempotent
- replayable
- safe under retries and reads
- stable without provider availability

This is not ML. The engine infers stable user tendencies from persisted read models and engagement history. The output should describe behavior patterns such as style preference, responsiveness, and disengagement risk.

## Replay Strategy

Replay follows the Epic 6 governance pattern:

- use persisted reduced `sourceContext` only
- never query live signals
- never query external providers
- never mutate persisted state
- compare deterministic fields through the shared replay comparator

Replay is an inspection surface, not a recomputation shortcut from raw upstream signals.

## Platform Reuse

The engine should inherit the existing hardening conventions already present in the repository:

- `PlatformDateService`
- canonical latest ordering
- replay comparator
- sourceContext governance
- shared mappers
- concurrency helpers

## Risks

- The personalization layer can drift into duplicated logic if it starts mirroring upstream formulas.
- Overlapping semantics with coach decision and notifications can create contradictory interventions if boundaries are not enforced.
- Behavioral inference can become noisy if source context is too sparse.
- Replay fidelity is limited by the reduced snapshot context by design.

## Future Evolution

Future phases may add:

- channel-specific adaptation
- message tone selection
- reminder timing adaptation
- intervention pacing
- personalization confidence scoring

Any expansion must remain deterministic-first, read-model-first, and provider-independent.

## Related Specs

- [build-personalization-snapshot](../specs/personalization/build-personalization-snapshot/README.md)
- [build-behavioral-patterns](../specs/personalization/build-behavioral-patterns/README.md)
- [build-user-behavior-profile](../specs/personalization/build-user-behavior-profile/README.md)
- [get-current-personalization](../specs/personalization/get-current-personalization/README.md)
- [get-today-personalization](../specs/personalization/get-today-personalization/README.md)
- [get-personalization-history](../specs/personalization/get-personalization-history/README.md)
- [get-behavioral-patterns](../specs/personalization/get-behavioral-patterns/README.md)
- [get-user-behavior-profile](../specs/personalization/get-user-behavior-profile/README.md)
- [replay-personalization-snapshot](../specs/personalization/replay-personalization-snapshot/README.md)
