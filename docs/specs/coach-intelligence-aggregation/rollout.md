# Coach Intelligence Aggregation - Rollout Strategy

## 1. Purpose

This document defines the controlled rollout strategy for the Coach Intelligence Aggregate. The rollout MUST protect current mobile versions, preserve existing endpoints, and make rollback immediate.

## 2. Rollout Principles

- rollout MUST be feature-flagged;
- rollout MUST be incremental;
- rollout MUST preserve legacy compatibility during the first release;
- rollout MUST be observable;
- rollout MUST have a tested rollback path;
- rollout SHOULD prefer backend validation before mobile activation.

## 3. Rollout Decision Records

### Decision Record DR-8 - Use a phased backend-first rollout

**Context**

The aggregate changes where Coach intelligence is assembled. That is a release-sensitive change because mobile currently recomposes the experience locally.

**Options considered**

1. Ship backend and mobile changes together.
2. Ship backend aggregate first, then client migration.
3. Keep legacy composition forever.

**Decision**

Use option 2: backend aggregate first, client migration second.

**Trade-offs**

- Pros: safer validation, easier rollback, easier observability.
- Cons: temporary dual-path maintenance.

**Consequences**

- the canonical contract can be validated before mobile flips;
- legacy endpoints remain available during rollout;
- parity can be measured before removing local recomposition.

**Future evolution**

Later Epics MAY reduce the rollout complexity once the aggregate path is stable across releases.

### Decision Record DR-9 - Shadow mode is optional, replay validation is the default fallback

**Context**

Shadow mode can be expensive if it duplicates source reads and introduces extra latency or operational complexity.

**Options considered**

1. Mandatory shadow mode.
2. Optional shadow mode.
3. Replay validation only.

**Decision**

Use option 2. Shadow mode MAY be enabled if the team can support it without disproportionate complexity; otherwise replay validation is the default.

**Trade-offs**

- Pros: flexible and realistic for the current repository shape.
- Cons: less live comparison data if shadow mode is skipped.

**Consequences**

- rollout remains practical;
- internal replay and trace parity remain mandatory;
- the team avoids introducing a heavyweight temporary path.

**Future evolution**

If aggregate parity needs more runtime comparison, shadow mode MAY be enabled later behind a dedicated flag.

## 4. Rollout Phases

### Phase 0 - No code

| Item | Definition |
|---|---|
| Entry criteria | Specification and technical design approved |
| Exit criteria | Implementation starts only after the contract and architecture are signed off |
| Rollback | N/A |
| Metrics | N/A |
| Risks | None beyond design disagreement |

### Phase 1 - Contracts

| Item | Definition |
|---|---|
| Entry criteria | Design approved |
| Exit criteria | Shared contract exists in `packages/types` and API client can reference it |
| Rollback | Remove or revert the new contract version |
| Metrics | Typecheck, contract tests, schema parity |
| Risks | Contract drift if fields are guessed rather than validated |

### Phase 2 - Backend Aggregate

| Item | Definition |
|---|---|
| Entry criteria | Contract is available |
| Exit criteria | Backend aggregate returns a stable result in internal tests |
| Rollback | Disable the aggregate flag and use the legacy compatibility path |
| Metrics | Backend unit tests, integration tests, deterministic replay parity |
| Risks | New backend latency or coupling |

### Phase 3 - Endpoint

| Item | Definition |
|---|---|
| Entry criteria | Backend aggregate is stable |
| Exit criteria | `GET /ai/coach-intelligence` is exposed behind a backend flag |
| Rollback | Turn off the endpoint flag and preserve the old routes |
| Metrics | Endpoint success rate, latency, partial failure rate |
| Risks | Unauthorized access or incorrect auth gating |

### Phase 4 - API Client

| Item | Definition |
|---|---|
| Entry criteria | Endpoint is available in a safe environment |
| Exit criteria | `packages/api-client` exposes one canonical aggregate operation |
| Rollback | Revert to the previous API-client mapping and legacy calls |
| Metrics | Client tests, request path correctness, typed response usage |
| Risks | Contract mismatch or accidental duplicate calls |

### Phase 5 - Mobile

| Item | Definition |
|---|---|
| Entry criteria | API client is available and tested |
| Exit criteria | Migrated Coach surfaces consume the aggregate path |
| Rollback | Flip the mobile feature flag to the legacy composition path |
| Metrics | Screen-level regression tests, crash/error rate, loading-state parity |
| Risks | Rendering regressions or partial-state mismatch |

### Phase 6 - Cleanup

| Item | Definition |
|---|---|
| Entry criteria | Mobile rollout is stable |
| Exit criteria | Redundant local composition is removed only where proven safe |
| Rollback | Keep the legacy code path until removal is explicitly approved |
| Metrics | Residual legacy usage, bug rate, parity metrics |
| Risks | Premature deletion of fallback behavior |

### Phase 7 - Certification

| Item | Definition |
|---|---|
| Entry criteria | Cleanup completed or explicitly deferred |
| Exit criteria | Final certification document is published and linked |
| Rollback | Roll back to the previous release if certification criteria fail |
| Metrics | Full test suite, observability signals, release readiness checklist |
| Risks | Certification done on incomplete parity evidence |

## 5. Rollout Gates

The following gates MUST be true before promoting to the next phase:

- contract tests pass;
- backend unit and integration tests pass;
- API-client tests pass;
- mobile regression tests pass;
- observability indicates no unexpected fallback surge;
- compatibility with legacy endpoints is preserved;
- rollback path is documented and tested.

## 6. Rollback Rules

- Any phase MAY be rolled back independently.
- Backend and mobile flags MUST be independently reversible.
- If the aggregate path regresses, the team MUST return to the legacy mobile composition path before disabling existing endpoints.
- Rollback MUST preserve user-facing behavior as closely as possible.

## 7. Metrics

The rollout MUST watch:

- aggregate request rate;
- aggregate latency;
- source-context latency;
- partial response rate;
- fallback activation rate;
- timeout rate;
- client error rate;
- parity mismatch rate;
- residual legacy usage;
- mobile loading and screen error rates.

## 8. Risks by Phase

- Phase 1 risk: drift in the contract before implementation.
- Phase 2 risk: aggregate logic accidentally grows beyond coach aggregation.
- Phase 3 risk: endpoint exposure or auth mismatch.
- Phase 4 risk: duplicated client calls or typed-contract mismatch.
- Phase 5 risk: screen regressions and user-visible fallback differences.
- Phase 6 risk: removing code before parity is proven.
- Phase 7 risk: certifying a path that is not fully rolled out.
