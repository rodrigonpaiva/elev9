# Release 2.1 — Epic A3 Nutrition Intelligence implementation plan

| Prompt | Scope | Status |
| --- | --- | --- |
| Prompt 1 — Domain Audit & Canonical Nutrition Model | Audit ownership and establish the current Nutrition read model | **completed with conditions** |
| Prompt 2 — Deterministic Nutrition Engine | Harden deterministic calculations and rules | **completed with conditions** |
| Prompt 3 — Dashboard Nutrition Experience | Productize Dashboard consumption of canonical Nutrition | **completed with conditions** |
| Prompt 4 — Coach Nutrition Intelligence | Route Health Context and Coach through canonical Nutrition | **completed with conditions** |
| Prompt 5 — Nutrition Analytics & Observability | Add privacy-safe operational/product observability | **completed with conditions** |
| Prompt 6 — Offline Nutrition Cache | Add offline read/cache behavior | **completed with conditions** |
| Prompt 7 — Nutrition History & Trends | Add bounded canonical history, detail and deterministic trends | **completed with conditions** |
| Prompt 8 — Integration Audit | Audit all cross-module Nutrition consumers | **completed with conditions** |
| Prompt 8B — Legacy Runtime Migration | Migrate active legacy consumers to canonical Nutrition application ports | **completed with conditions** |
| Prompt 8B.1 — Runtime Migration Completion Pass | Green critical suites and close remaining runtime migration conditions | **completed with conditions** |
| Prompt 8B.2 — Legacy Cleanup & Certification Readiness | Remove remaining raw Coach/Expert runtime artifacts and enforce boundaries | **completed with conditions** |
| Prompt 8B.3 — Canonical Test Migration & Final Green Suite | Migrate the remaining legacy fixtures/assertions and close the API suite | **completed with conditions** |
| Prompt 9 — Production Certification | Certify release behavior and readiness | **certified with conditions** |
| Prompt 10 — E2E Validation, Rollout Gate & Epic Closure | Validate compatible-host E2E and close operational gate | **completed; certified** |

Prompt 7 is completed with conditions because the repository has no immutable daily snapshot or historical plan-version store. The implementation reconstructs only logged days from the plan referenced by their logs, exposes partial/no-data states, and defers snapshots, backfill and historical guidance fidelity.

Prompt 8 is completed with conditions because the audit and register exist, but runtime violations were found.

Prompt 8B is completed with conditions. Runtime raw fields/helpers and external repository paths were removed; API build and boundary checks pass. The API suite still has 12 stale legacy expectation suites (30 tests), and E2E is environment-blocked by MongoMemoryServer `listen EPERM: operation not permitted 0.0.0.0`. Prompt 9 remains pending.

Prompt 8B.2 was completed with conditions at its checkpoint: P1 active runtime legacy was zero, while stale fixtures/assertions remained for Prompt 8B.3.

Prompt 8B.3 — Canonical Test Migration & Final Green Suite is **completed with conditions**. All twelve remaining API suites were migrated from legacy fixtures/assertions; API tests pass at 215 suites / 1,352 tests. Mobile tests/builds, API/API Client builds and boundary tests pass. E2E remains `ENVIRONMENT_BLOCKED` because MongoMemoryServer cannot bind (`listen EPERM`). Prompt 8 is **completed with conditions** and Prompt 9 remains pending.

Prompt 9 — Production Certification was **certified with conditions** at its checkpoint. Prompt 10 supersedes its E2E condition after compatible-host validation; only the external monitoring/alert ownership condition remains for broad rollout.

Prompt 10 is complete. The sandbox bind limitation was reproduced and classified as `SANDBOX_RESTRICTION`; a compatible-host rerun found and fixed missing Nutrition consumer-port provider registrations. Final evidence is API 215/1,352, Mobile 22/104, API E2E 16/56, builds green, configured lints green, and boundaries green. Epic closure is `EPIC_A3_CLOSED_WITH_OPERATIONAL_CONDITION`; broad rollout still requires the runbook's named alert/dashboard ownership.

Prompt 11 is operationalized with versioned observability definitions, role-based ownership, incident/rollback procedures, and an API E2E CI step. External dashboards and alert backend provisioning are not present in this repository; the unresolved critical alert is P1, so the final decision remains `CONTROLLED_ROLLOUT_ONLY` until that evidence exists.

Prompt 12 completed provider/IaC discovery and found no authorized external observability provider, deployment target, credentials, resource identifiers or incident-routing integration. No external provisioning was performed or claimed. The remaining work is an external platform handoff; the decision remains `CONTROLLED_ROLLOUT_ONLY`.
