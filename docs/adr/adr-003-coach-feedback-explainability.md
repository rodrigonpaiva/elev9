# ADR-003 — Coach Feedback Explainability & Replay System

## Status

Accepted

## Context

The Elev9 Coach MVP started with deterministic coach feedback based on training and recovery context. That was enough to generate useful messages, but it was not enough to support technical auditing of why a feedback was produced or how it could be reproduced later.

As the product evolved, the AI module gained a richer `UserHealthContext` with:

- training signals
- recovery signals
- check-in data
- nutrition context

At that point, persisting only the final feedback text became insufficient. It did not answer important engineering questions such as:

- which signals influenced the feedback
- which context was used at generation time
- whether a feedback could be regenerated deterministically
- whether behavior changed after heuristic updates

The system needed a lightweight explainability and replay layer before any LLM integration. The goal was to keep the current heuristic system:

- deterministic
- testable
- debuggable
- safe
- extensible

This decision documents the current explainability and replay architecture as an internal backend capability. It is intended for debugging, traceability, and future evolution. It is not a public-facing feature and it does not change the public coach feedback contract.

## Decision

The coach feedback pipeline is documented as:

```txt
UserHealthContext
→ CoachFeedbackGenerator
→ influences
→ contextSnapshot
→ generatorVersion
→ debug history
→ replay endpoint
```

The backend remains the source of truth for:

- context composition
- deterministic feedback generation
- explainability metadata
- replay compatibility checks

The public API keeps exposing only the safe coach feedback payload. Internal debug endpoints expose the additional metadata.

## Explainability Layer

The system persists an internal `influences` field for each `CoachFeedback`.

This field records which signals affected the generated result. Current examples include:

- `fatigue:high`
- `fatigue:low`
- `recovery:needs_recovery`
- `recovery:improving`
- `nutrition:muscle_gain`
- `nutrition:fat_loss`
- `nutrition:low_meal_frequency`
- `nutrition:dietary_restrictions`
- `checkin:low_energy`
- `checkin:poor_sleep`
- `checkin:high_soreness`
- `checkin:high_motivation`
- `training:high_consistency`
- `training:low_consistency`

The purpose of `influences` is to:

- trace which signals were used
- support contextual debugging
- enable future observability and evaluation layers

`influences` is internal metadata. It is not part of the public coach feedback response.

## Context Snapshot

The system persists a reduced `contextSnapshot` with each `CoachFeedback`.

The snapshot is intentionally:

- partial
- safe
- serializable
- small enough for debugging and replay

It excludes sensitive or irrelevant data such as:

- auth/session objects
- email
- token data
- full Mongo documents
- raw persistence-specific internals

The current snapshot may include:

- `fatigueLevel`
- `recoveryTrend`
- `weeklyFrequency`
- `currentStreak`
- `averageWorkoutDuration`
- `latestCheckIn`
- `nutritionProfile`
- `activityLevel`
- `goal`
- `hasTrainingPlan`
- `recentWorkoutLogs`

The snapshot exists to preserve the relevant generation context at the time the feedback was created, without persisting the entire health context object.

## Generator Versioning

The system uses an explicit generator version constant:

```txt
COACH_FEEDBACK_GENERATOR_VERSION = "heuristic-v1"
```

Each persisted `CoachFeedback` stores `generatorVersion`.

This supports:

- consistent replay behavior
- future heuristic evolution
- comparison between generation strategies
- future prompt or LLM version tracking

The current implementation is intentionally simple and manual. Versioning is explicit rather than inferred from code changes.

## Replay Architecture

The system provides an internal authenticated replay endpoint:

- `GET /ai/debug/coach-feedback/:id/replay`

Replay works as follows:

1. load the persisted `CoachFeedback`
2. validate user ownership
3. validate `contextSnapshot`
4. validate `generatorVersion`
5. rebuild the minimum generator input from the snapshot
6. reuse the real `CoachFeedbackGenerator`
7. compare persisted and replayed outputs

The replay response compares:

- `message`
- `insights`
- `recommendations`
- `influences`

Replay is:

- deterministic
- computed on demand
- read-only
- non-persistent

The system does not store replay results back into Mongo.

## Security & Privacy

The explainability and replay layer is designed as an internal capability.

Current protections include:

- authenticated debug endpoints
- user-scoped access only
- separate debug routes from public history routes
- reduced snapshots without sensitive fields

The internal endpoints do not expose:

- passwords
- tokens
- session material
- email
- unrelated user data

This keeps debugging capabilities separated from the public API surface.

## Rationale

### Deterministic first

Explainability was introduced while the generator is still heuristic and deterministic. This makes the system easier to reason about and easier to validate through tests before adding any probabilistic generation layer.

### Explainability before LLM

The product needs traceability whether the feedback is heuristic or LLM-based. Building explainability first avoids coupling observability to a future provider choice.

### Replay simplifies debugging

Replay allows engineers to compare:

- what was stored
- what the current generator would produce

This is useful for regression analysis and for validating that heuristics remain stable over time.

### Traceability prepares future systems

Persisted influences, snapshots, and generator versioning create a foundation for:

- recommendation engines
- contextual evaluations
- future semantic memory
- future prompt versioning

### Architecture-first approach

The current system keeps concerns separated:

- `BuildUserHealthContextService` builds context
- `CoachFeedbackGenerator` generates deterministic feedback
- `CoachFeedbackRepository` persists feedback and metadata
- `ReplayCoachFeedbackUseCase` replays on demand

This separation makes the system easier to evolve without changing public API contracts prematurely.

## Consequences

### Positive

- deterministic replay capability
- stronger debugging and auditing
- explicit contextual traceability
- support for future evaluation workflows
- support for future generator evolution
- safer path toward LLM or prompt versioning later

### Negative

- more internal complexity in the AI module
- more metadata persisted with each `CoachFeedback`
- future need for retention strategy or pruning policy
- replay compatibility is limited to supported generator versions

## Future Work

Likely extensions include:

- detailed replay diffing
- evaluation engine
- heuristic benchmarking
- prompt versioning
- LLM replay
- semantic memory integration
- recommendation scoring
- contextual evaluations
- offline analysis pipelines

These are not part of the current implementation. The current system only provides the minimal internal foundation for explainability and replay.

## Technical Notes

### Internal Endpoints

- `GET /ai/debug/coach-feedback`
- `GET /ai/debug/coach-feedback/:id/replay`

### Main Components

- `CoachFeedbackGenerator`
- `BuildUserHealthContextService`
- `ReplayCoachFeedbackUseCase`
- `CoachFeedbackRepository`

### Public Contract Boundary

The public endpoints remain unchanged:

- `POST /ai/coach-feedback`
- `GET /ai/coach-feedback`

`influences`, `contextSnapshot`, and `generatorVersion` are intentionally excluded from the public payload.

### Relevant Documentation

- [Architecture Overview](../architecture/overview.md)
- [ADR-002 — Recovery & Adaptive Coaching System](./adr-002-recovery-system.md)
- [Generate Coach Feedback ADR Links](../specs/ai/generate-coach-feedback/adr-links.md)
- [Get Coach Feedback History ADR Links](../specs/ai/get-coach-feedback-history/adr-links.md)

## Summary

The Coach Feedback Explainability & Replay System establishes a deterministic internal foundation for contextual traceability, debugging, and future generator evolution in Elev9 Coach.
