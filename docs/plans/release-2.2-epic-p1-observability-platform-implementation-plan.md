# Release 2.2 — Epic P1 Observability Platform Implementation Plan

## Plan status

Architecture status: foundation accepted; production provider deferred  
Readiness: `READY_FOR_PROMPT_3`  
Prompt 2 implementation is complete; Prompt 3 is the next scope.

## Phase 0 — Architecture and governance

Approve ADR-012, establish safe signal contracts, classify data, nominate role owners, define the retention categories and confirm the optional local profile.

## Phase 1 — Telemetry foundation

Add provider-neutral structured logging, correlation context, OTel SDK boundaries and safe metric/trace schemas. Preserve fail-open behavior and existing domain boundaries.

## Phase 2 — Local observability stack

Add an optional Docker Compose profile for Collector, Prometheus, Loki, Tempo, Grafana and Alertmanager. Use synthetic data and short retention. Keep Mongo/API development independent.

## Phase 3 — Application integrations

Integrate API lifecycle, Mongo dependency, runtime, Recovery/Nutrition/domain signals, mobile error adapter, proportional Web signals and AI safe stages. Do not capture content.

## Phase 4 — Operations

Provision versioned dashboards, baseline SLIs, provisional SLOs, alerts, runbooks and role-based escalation. Validate queries and alert noise before staging.

## Phase 5 — Production backend

Select a managed backend/provider only after runtime, residency, budget, access, retention and incident-routing decisions. Route through OTLP/Collector and run a synthetic staging rollout.

## Phase 6 — Certification

Prove local, CI and staging delivery; test privacy/cardinality/redaction; verify dashboard/alert/runbook links; validate rollback, retention and deletion; certify production readiness.

## Prompt plan

| Prompt | Scope                                 | Dependencies                         | Acceptance                                                                                        |
| ------ | ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 2      | Base infrastructure/provider boundary | Prompt 1 architecture                | typed config, noop/OTLP providers, safe resources, W3C propagation, lifecycle, optional Collector | API remains independent of Collector; tests pass; no default export |
| 3      | Structured logging                    | 2                                    | JSON schema, redaction and correlation tests                                                      |
| 4      | Metrics                               | 2–3                                  | HTTP/domain/runtime instruments; cardinality checks                                               |
| 5      | Distributed tracing                   | 2–3                                  | W3C propagation; safe HTTP/Mongo/AI spans                                                         |
| 6      | Dashboards                            | 4–5                                  | eight safe dashboards with owners/runbooks                                                        |
| 7      | Alerting/SLOs/error budgets           | 4–6; baseline                        | thresholds marked provisional; routed test alerts                                                 |
| 8      | Health/runtime                        | 3–5                                  | safe dependency/runtime signals and deployment contracts                                          |
| 9      | Mobile                                | provider/privacy decision            | crash/release/source-map/error validation                                                         |
| 10     | AI                                    | 3–5; LLM remains disabled by default | safe stage signals, cost/latency and forbidden-field tests                                        |
| 11     | Security/retention/operations         | all prior; governance                | retention/access/delete/runbooks/roles                                                            |
| 12     | Certification                         | all prior; staging/provider          | end-to-end evidence and final verdict                                                             |

## Completion criteria for Epic P1

- All signals have an owner, schema, privacy classification and retention category.
- API logs, metrics and traces are externally queryable in the approved environment.
- Local profile is optional, credential-free and synthetic-data only.
- Mobile crash/release visibility is approved and validated or explicitly deferred.
- AI telemetry contains no content or sensitive facts.
- Dashboards and alerts are provisioned, tested and linked to runbooks.
- SLOs are baselined and error-budget ownership is explicit.
- CI validates telemetry contracts and privacy.
- Rollback, retention, access and deletion procedures are evidenced.

## Prompt status

| Prompt | Status    | Evidence                                                  |
| ------ | --------- | --------------------------------------------------------- |
| 1      | completed | Audit, architecture, ADR and planning documents           |
| 2      | completed | API foundation, Collector config, tests and runbook       |
| 3      | next      | Structured logging, redaction and correlation integration |

Remaining Prompt 2 conditions: production backend, mobile provider, retention, budget, residency and named ownership remain deferred by design. Collector runtime validation depends on Docker image availability in the execution environment.

## Risks and mitigations

| Risk                    | Mitigation                                            |
| ----------------------- | ----------------------------------------------------- |
| Runtime undecided       | Keep OTLP/provider boundary neutral                   |
| Team capacity           | Use optional local profile and role-based ownership   |
| Sensitive data          | Allowlist before serialization/export; negative tests |
| Cardinality/cost        | Fixed labels, buckets, sampling and volume review     |
| Mobile provider lock-in | Separate adapter and formal approval                  |
| Noisy alerts            | Baseline first; non-paging P3 defaults                |

## Suggested commits

Prompt 2: `chore(observability): add telemetry foundation boundary`  
Prompt 3: `feat(observability): standardize structured logging`  
Prompt 4: `feat(observability): add operational metrics`  
Prompt 5: `feat(observability): add distributed tracing`  
Prompt 6: `docs(observability): provision dashboards`  
Prompt 7: `feat(observability): add alerts and slo contracts`  
Prompt 8: `feat(observability): add runtime health signals`  
Prompt 9: `feat(mobile): add approved error reporting boundary`  
Prompt 10: `feat(ai): add safe ai telemetry`  
Prompt 11: `docs(operations): define observability governance`  
Prompt 12: `docs(observability): certify platform`
