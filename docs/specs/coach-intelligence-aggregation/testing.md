# Coach Intelligence Aggregation - Testing Strategy

## 1. Purpose

This document defines the required test strategy for the Coach Intelligence Aggregate. The strategy is intentionally layered so that contract drift, routing issues, fallback bugs, mobile regressions, and rollout mistakes are caught before release.

## 2. Test Strategy Principles

- The aggregate MUST be testable at every boundary.
- Deterministic logic MUST have deterministic tests.
- Compatibility MUST be tested before rollout.
- Mobile migration MUST be protected by regression tests.
- Replay and observability MUST be validated, not assumed.

## 3. Unit Tests

| Purpose                                  | Coverage                                                                                                           | Success criteria                                | Failure criteria                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------- |
| Validate deterministic aggregation logic | composition ordering, recommendation dedupe, risk merge, confidence merge, conflict resolution, fallback selection | same input snapshot always produces same output | non-deterministic output or incorrect merge order     |
| Validate policies                        | routing gate, availability policy, fallback policy, visibility policy                                              | policy decisions are stable and explicit        | policy branches depend on hidden state or random data |
| Validate mappers                         | internal aggregate -> shared contract                                                                              | output shape matches the conceptual contract    | fields are missing, renamed, or exposed incorrectly   |

## 4. Integration Tests

| Purpose                         | Coverage                                                                                                                | Success criteria                                                           | Failure criteria                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Validate backend wiring         | controller, use case, gate, assembler, composition, persona, explainability, observability                              | the module resolves all dependencies and returns the correct HTTP response | dependency wiring fails or controller contains business logic |
| Validate source-context loading | source adapters for goals, habits, nutrition, recovery, progress, training, personalization, notifications, AI decision | each adapter returns normalized context or explicit missing-state metadata | adapter reads the wrong source or leaks raw internals         |
| Validate fallback boundaries    | partial failure, timeout, missing context, feature flag disabled                                                        | partial data is returned when safe and legacy path is used when disabled   | a safe partial failure becomes a hard failure or vice versa   |

## 5. Contract Tests

| Purpose                        | Coverage                                                                           | Success criteria                                                          | Failure criteria                                         |
| ------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| Protect shared contracts       | `packages/types` aggregate contract, `packages/api-client` request/response typing | backend, client, and mobile all compile against the same conceptual shape | contract drift or optionality mismatch                   |
| Protect serialization          | JSON shape, required/optional fields, enum stability, metadata presence            | the wire payload matches the conceptual contract                          | fields are serialized in an incompatible way             |
| Protect backward compatibility | legacy endpoints, old mobile behavior, additive-only changes                       | old clients continue to work while the new aggregate is introduced        | breaking field removal or route removal occurs too early |

## 6. Mobile Tests

| Purpose                             | Coverage                                                                                    | Success criteria                                                                   | Failure criteria                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Validate canonical hook migration   | migrated Coach hooks and screens                                                            | hooks consume the canonical aggregate and no longer recompute intelligence locally | screens still depend on local cross-context composition |
| Validate loading and empty states   | Coach Home, Insights, Daily Briefing, Weekly Review, Goal Guidance, Conversation, Ask Coach | loading/empty/retry states remain stable                                           | screens regress visually or functionally                |
| Validate offline and retry behavior | conversation and data-fetching flows                                                        | offline and retry states remain intact                                             | draft recovery or retry behavior breaks                 |
| Validate accessibility              | labels, hints, roles, dynamic type                                                          | accessibility semantics remain unchanged                                           | any visible coach surface loses accessibility coverage  |

## 7. Regression Tests

| Purpose                          | Coverage                                                                                                                               | Success criteria                                                      | Failure criteria                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| Protect current product behavior | Dashboard, Coach Home, Daily Briefing, Insights, Weekly Review, Goal Guidance, Ask Coach, Conversation, Memory Timeline, Notifications | existing surfaces still render expected content and fallback behavior | a migrated or legacy screen changes behavior unexpectedly |
| Protect legacy path              | legacy composition fallback path                                                                                                       | the app can revert without user-visible breakage                      | rollback produces broken rendering or missing data        |

## 8. End-to-End Tests

| Purpose                        | Coverage                                   | Success criteria                                                           | Failure criteria                                  |
| ------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------- |
| Validate authenticated success | happy-path aggregate request               | authenticated client receives canonical aggregate and renders it correctly | auth is rejected or the response shape is invalid |
| Validate partial failures      | missing optional contexts                  | request still succeeds with explicit missing-state metadata                | optional source failure becomes a hard failure    |
| Validate auth and isolation    | unauthorized request, cross-user isolation | unauthorized requests fail and user data stays isolated                    | user data leaks across sessions                   |
| Validate rollout control       | feature flag on/off, rollback path         | correct path is selected for each flag state                               | the wrong path is used or rollback is impossible  |

## 9. Observability Tests

| Purpose                     | Coverage                                                                                  | Success criteria                                                 | Failure criteria                                 |
| --------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| Validate telemetry emission | request started/completed, source latency, fallback, partial failure, contract validation | the expected metrics/traces are emitted                          | telemetry is missing or contains unsafe payloads |
| Validate retention bounds   | trace retention and pruning                                                               | traces respect the retention policy                              | traces grow without bound                        |
| Validate redaction          | logs and trace metadata                                                                   | no raw prompts, tokens, or sensitive health details are recorded | unsafe internals appear in logs                  |

## 10. Replay Tests

| Purpose                       | Coverage                                  | Success criteria                                 | Failure criteria                                        |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Validate deterministic replay | persisted trace vs recalculated aggregate | replay yields parity or explainable diffs only   | replay is non-deterministic or exposes hidden reasoning |
| Validate safe replay scope    | internal validation only                  | replay stays internal unless explicitly approved | replay data becomes public payload data                 |

## 11. Compatibility Tests

| Purpose                                   | Coverage                                                                               | Success criteria                                    | Failure criteria                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| Preserve existing endpoints               | `/dashboard/home`, `/ai/chat`, `/ai/coach-decision/*`, domain endpoints used by mobile | old paths continue to work during rollout           | a legacy route is removed too early                  |
| Preserve current mobile behavior          | current Coach screens and flows                                                        | users on older app versions remain functional       | older app versions break after rollout               |
| Preserve additive-only contract evolution | shared contract and API client                                                         | new fields are optional before they become required | a breaking contract change is shipped without an ADR |

## 12. Minimum Release Criteria

The Epic is not release-ready unless all of the following are true:

- unit tests pass;
- integration tests pass;
- contract tests pass;
- mobile tests pass;
- regression tests pass;
- E2E tests pass;
- observability tests pass;
- replay tests pass;
- compatibility tests pass.
