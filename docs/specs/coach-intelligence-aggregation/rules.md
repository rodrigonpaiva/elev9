# Coach Intelligence Aggregation - Implementation Rules

## 1. Purpose

This document defines the implementation rules that all engineers MUST follow when building the Coach Intelligence Aggregate.

The rules preserve:

- the modular monolith;
- clean architecture;
- DDD and hexagonal boundaries;
- shared contracts;
- mobile-first delivery;
- deterministic-first AI behavior;
- feature flags;
- observability.

## 2. Backend Rules

| ID | Rule | Why |
|---|---|---|
| B-01 | Controllers MUST remain thin and MUST only handle HTTP concerns, auth, and DTO mapping. | This keeps orchestration out of the transport layer and preserves testability. |
| B-02 | The aggregate MUST be orchestrated by a use case, not by a controller. | Use cases are the correct boundary for coordinating source loading, fallback, and response assembly. |
| B-03 | Context adapters MUST call source module public application services, not UI helpers or raw HTTP clients. | This preserves bounded-context ownership and keeps source logic inside the backend. |
| B-04 | Adapter classes MUST NOT contain business rules. | Business rules belong in policies or existing domain/application services. |
| B-05 | The aggregate MUST be deterministic for the same source snapshot and feature-flag state. | Determinism is required for safe replay, testing, and parity validation. |
| B-06 | The aggregate MUST prefer existing AI services for composition, persona, explainability, and observability. | Reuse prevents duplication and avoids creating a second coach runtime. |
| B-07 | The aggregate MUST NOT call OpenAI directly. | The aggregate is a deterministic backend read model; model calls belong to the existing LLM pipeline if needed elsewhere. |
| B-08 | The aggregate MUST NOT introduce a new persistence model unless the contract explicitly requires durable snapshot storage. | This avoids unnecessary storage coupling and keeps the Epic focused. |

## 3. Mobile Rules

| ID | Rule | Why |
|---|---|---|
| M-01 | Mobile MUST consume the canonical aggregate through one shared hook or one shared data-access path. | Multiple local composition paths reintroduce drift and inconsistent behavior. |
| M-02 | Screens MUST NOT reconstruct coach intelligence, persona, or explanation from raw domain endpoints. | Mobile is a rendering layer, not a domain orchestration layer. |
| M-03 | Mobile MUST preserve loading, empty, error, offline, and retry behavior when migrated to the aggregate. | The Epic is a consolidation change, not a UX regression. |
| M-04 | Mobile MUST keep accessibility labels, hints, and semantic roles intact. | The canonical aggregate must not degrade the existing mobile accessibility contract. |
| M-05 | Mobile MUST keep the legacy path available behind a rollback flag until parity is proven. | Safe rollout requires immediate reversion to the current path. |
| M-06 | Mobile MUST NOT duplicate fallback logic that already exists in the backend aggregate. | Fallback belongs to the canonical backend owner. |

## 4. Contract Rules

| ID | Rule | Why |
|---|---|---|
| C-01 | The aggregate contract MUST live in `packages/types` and MUST be exported through the shared package entrypoint. | Shared contracts are the single source of truth for backend and mobile. |
| C-02 | The API client MUST expose exactly one canonical aggregate operation for migrated Coach surfaces. | One operation prevents drift and reduces HTTP chatter. |
| C-03 | The contract MUST remain backward-compatible during rollout. | Older mobile builds MUST continue to function. |
| C-04 | The contract MUST use explicit optionality and availability metadata rather than implicit null semantics. | Section-level state must be machine-readable and stable. |
| C-05 | The contract MUST NOT expose prompts, chain-of-thought, internal policy details, or raw execution traces. | These are internal AI concerns and are not safe for public consumption. |
| C-06 | New fields SHOULD be added as optional before they become required. | This prevents contract drift from becoming a breaking change. |

## 5. Observability Rules

| ID | Rule | Why |
|---|---|---|
| O-01 | The aggregate MUST emit internal telemetry for request count, latency, fallback, partial failure, and contract validation. | Operations need visibility into correctness and rollout health. |
| O-02 | Observability MUST be internal-only by default. | Public exposure of debug internals would create safety and privacy risk. |
| O-03 | Traces MUST be bounded by retention policy. | Internal replay and diagnostics must not become unbounded storage growth. |
| O-04 | Observability MUST correlate request, source loading, composition, persona, explainability, and mapping. | End-to-end visibility is needed to debug cross-context aggregation. |
| O-05 | Logs MUST be redacted and MUST NOT contain raw prompts, authentication tokens, or sensitive health details. | The aggregate handles health-adjacent user data and coach intelligence. |

## 6. Error Handling Rules

| ID | Rule | Why |
|---|---|---|
| E-01 | Auth failures MUST stop the request before aggregation. | User isolation is a hard boundary, not a fallback case. |
| E-02 | User-profile-not-found MUST be treated as a terminal not-found result. | The aggregate has no safe way to synthesize a user-scoped coach response without a user profile. |
| E-03 | Optional source failures SHOULD degrade to partial sections instead of failing the whole aggregate. | The Epic is designed to centralize partial-failure semantics. |
| E-04 | Primary-insight failure without a safe fallback MUST fail the request. | The aggregate must not invent a primary coach conclusion. |
| E-05 | Timeouts SHOULD be converted to section-level fallback when possible. | This keeps the aggregate available under partial pressure. |
| E-06 | Internal exceptions MUST be normalized before they reach the client. | The client must never see stack traces or internal class names. |
| E-07 | Fallback MUST be deterministic and data-driven. | Non-deterministic fallback would break replay and parity validation. |

## 7. AI Rules

| ID | Rule | Why |
|---|---|---|
| A-01 | The aggregate MUST be deterministic before any LLM-assisted capability is considered. | Deterministic aggregation is safer, testable, and replayable. |
| A-02 | The aggregate MUST NOT expand the AI module into a general-purpose reasoning layer. | The AI module already has a large responsibility surface. |
| A-03 | The aggregate MUST reuse existing expert composition, persona, explainability, and observability services. | Reuse avoids duplication and keeps a single coach runtime source of truth. |
| A-04 | The aggregate MUST NOT depend on prompt construction. | Prompt building is a separate concern and must remain isolated. |
| A-05 | The aggregate MUST NOT expose hidden policies or raw expert internals to clients. | Internal coach behavior must remain safe and controlled. |
| A-06 | Any future LLM dependency MUST be introduced only through the existing AI architecture and feature flags. | This preserves deterministic-first evolution. |

## 8. Compatibility Rules

| ID | Rule | Why |
|---|---|---|
| K-01 | Existing endpoints MUST stay available during the first rollout. | Compatibility for current mobile versions is mandatory. |
| K-02 | Rollout MUST support immediate rollback to the current mobile composition path. | Release safety requires a fast revert path. |
| K-03 | Legacy code MUST only be removed after parity is demonstrated. | Premature cleanup would create avoidable regressions. |
| K-04 | No breaking DTO change MAY be introduced without a separate architectural decision. | This Epic is a consolidation Epic, not a contract break. |
| K-05 | Compatibility checks SHOULD be automated at contract, backend, API-client, and mobile layers. | Compatibility failures are easiest to catch close to the boundary. |

## 9. Performance Rules

| ID | Rule | Why |
|---|---|---|
| P-01 | Source-context reads SHOULD be parallelized when they are independent. | This reduces aggregate latency without changing semantics. |
| P-02 | The aggregate MUST NOT duplicate raw source payloads into the public response. | Payload bloat harms mobile performance and bandwidth. |
| P-03 | The aggregate SHOULD prefer normalized, minimal, user-visible fields. | The client needs meaning, not every internal source attribute. |
| P-04 | Repeated normalization and sorting SHOULD be done once in the backend, not per screen. | Centralized processing reduces duplicated mobile work and rerenders. |
| P-05 | Any caching strategy MUST preserve user isolation and freshness metadata. | Caching without freshness would create coach inconsistencies. |

## 10. Testing Rules

| ID | Rule | Why |
|---|---|---|
| T-01 | Every new contract field MUST be covered by contract tests. | Shared types and API-client typing must remain aligned. |
| T-02 | The aggregate MUST have unit tests for composition, fallback, confidence, risk, and explainability. | These are the core deterministic behaviors. |
| T-03 | The aggregate MUST have integration tests for controller, guard, and module wiring. | Wiring regressions are common in modular NestJS systems. |
| T-04 | The mobile migration MUST have regression tests for Coach Home, Insights, Daily Briefing, Conversation, and Ask Coach. | The highest-risk user surfaces must be protected. |
| T-05 | Replay or parity validation SHOULD be covered before rollout activation. | Replay is the safety net for deterministic coach logic. |

