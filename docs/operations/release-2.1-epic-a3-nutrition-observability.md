# Release 2.1 — Epic A3 Nutrition Observability Specification

## 1. Scope and current state

This document defines the minimum safe operational surface for Nutrition broad rollout. It does not create a new telemetry platform or alter Nutrition behavior.

| Capability                | Provider                             | Initial state          | Final state               | Evidence                                         |
| ------------------------- | ------------------------------------ | ---------------------- | ------------------------- | ------------------------------------------------ |
| Application logs          | Nest `Logger` and request middleware | `PARTIALLY_CONFIGURED` | `PARTIALLY_CONFIGURED`    | Existing API source                              |
| Nutrition counters/events | `NutritionObservabilityService`      | `PARTIALLY_CONFIGURED` | `PARTIALLY_CONFIGURED`    | Allowlisted in-memory counters                   |
| Mobile analytics          | Product analytics noop boundary      | `PARTIALLY_CONFIGURED` | `PARTIALLY_CONFIGURED`    | Existing mobile provider                         |
| Coach traces              | In-memory Coach observability        | `PARTIALLY_CONFIGURED` | `PARTIALLY_CONFIGURED`    | Retained bounded traces; no exporter             |
| Request metrics backend   | None                                 | `NOT_CONFIGURED`       | `NOT_CONFIGURED`          | No metrics exporter found                        |
| OpenTelemetry tracing     | None                                 | `NOT_CONFIGURED`       | `NOT_CONFIGURED`          | No exporter/dependency found                     |
| Health/readiness          | `HealthController`                   | `CONFIGURED`           | `CONFIGURED`              | `/health`, `/health/ready`                       |
| Dashboards                | None versioned                       | `NOT_CONFIGURED`       | `DEFINED_NOT_PROVISIONED` | Dashboard specifications below                   |
| Alerting                  | None versioned                       | `NOT_CONFIGURED`       | `DEFINED_NOT_PROVISIONED` | Alert specifications below                       |
| Feature flag telemetry    | Existing AI flags only               | `PARTIALLY_CONFIGURED` | `PARTIALLY_CONFIGURED`    | `AI_LLM_ENABLED=false`; no Nutrition remote flag |
| CI validation             | GitHub Actions                       | `PARTIALLY_CONFIGURED` | `PARTIALLY_CONFIGURED`    | E2E gate added to existing workflow              |

## 2. Safe metric inventory

The current Nutrition service emits bounded event names and counters for Today, Coach context, History and Trends. Safe dimensions are:

```text
operation, outcome, availability, freshness, contract_version,
duration_bucket, safe_error_code, consumer, feature_flag_state
```

Required conceptual signals map to existing event/counter boundaries:

```text
nutrition_request_total             → operation/outcome counter
nutrition_request_duration          → durationBucket
nutrition_request_failure_total     → outcome=failure
nutrition_availability_total        → availability
nutrition_processing_failure_total  → safeErrorCode
nutrition_stale_total               → freshness=stale
```

No user, tenant, plan, log, food, meal, macro, calorie, restriction, allergy, free-text, exact-date, or exact-timestamp label is permitted.

## 3. Structured logs and redaction

The allowlist is limited to timestamp, level, service, environment, release, module, consumer, operation, outcome, availability, freshness, duration bucket, safe error code, contract version and feature-flag state. Request IDs may remain correlation metadata in logs but are forbidden as metric labels.

Authorization headers, cookies, tokens, request/response bodies, raw exceptions, Nutrition read models and Coach context must be redacted or omitted. Existing request logging is classified `PARTIALLY_CONFIGURED` because it is a safe plain-text logger, not a centralized structured sink.

## 4. Dashboard definitions

| Dashboard            | Status                    | Signals                                                                                             | Owner                  | Evidence      |
| -------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------- | ------------- |
| Nutrition API Health | `DEFINED_NOT_PROVISIONED` | volume, success, 4xx/5xx, latency buckets, processing, availability                                 | Backend Platform Owner | This document |
| Consumer Health      | `DEFINED_NOT_PROVISIONED` | Dashboard, Coach, Recovery, Training, Goals, Notifications, Health Context success/failure/fallback | Backend Platform Owner | This document |
| History and Trends   | `DEFINED_NOT_PROVISIONED` | volume, latency, empty-result bucket, pagination/processing failures                                | Backend Platform Owner | This document |
| Cache and Offline    | `DEFINED_NOT_PROVISIONED` | hit/miss/stale/read-write/invalidation categories                                                   | Mobile Platform Owner  | This document |
| Rollout Overview     | `DEFINED_NOT_PROVISIONED` | release, stage, flag state, error/fallback/alert state                                              | Release Owner          | This document |

No dashboard URL is claimed because no external dashboard provider is connected to the repository.

## 5. Alert definitions

| Alert                                 | Severity | Status                    | Owner                  | Trigger                                           | Response                                            |
| ------------------------------------- | -------- | ------------------------- | ---------------------- | ------------------------------------------------- | --------------------------------------------------- |
| Nutrition 5xx elevation               | P1       | `DEFINED_NOT_PROVISIONED` | Backend Platform Owner | Sustained relative increase versus prior window   | Page, freeze cohort, rollback if release-correlated |
| Nutrition consumer projection failure | P1       | `DEFINED_NOT_PROVISIONED` | Backend Platform Owner | Sustained failure signal for Coach/consumer ports | Page, inspect safe error code, rollback             |
| Privacy-safe telemetry violation      | P1       | `DEFINED_NOT_PROVISIONED` | Privacy/Security Owner | Any prohibited-field detection                    | Stop rollout immediately, preserve safe evidence    |
| Cache isolation/cleanup failure       | P1       | `DEFINED_NOT_PROVISIONED` | Mobile Platform Owner  | Any owner-scope or logout cleanup anomaly         | Stop rollout, invalidate cache, security review     |
| Nutrition bootstrap failure           | P1       | `DEFINED_NOT_PROVISIONED` | Backend Platform Owner | Readiness/module startup failure                  | Stop rollout, restore prior release                 |
| Latency elevation                     | P2       | `DEFINED_NOT_PROVISIONED` | Backend Platform Owner | Relative degradation versus baseline              | Investigate in business hours; pause expansion      |
| Unavailable/stale elevation           | P2       | `DEFINED_NOT_PROVISIONED` | Backend Platform Owner | Relative increase excluding expected states       | Investigate and hold stage                          |
| History/Trends degradation            | P2       | `DEFINED_NOT_PROVISIONED` | Backend Platform Owner | Sustained query/pagination failures               | Hold affected stage; preserve Today where safe      |

Thresholds require baseline calibration in the controlled stage. No absolute thresholds are invented here.

## 6. Ownership and escalation

| Responsibility   | Primary owner          | Secondary owner        | Escalation                                |
| ---------------- | ---------------------- | ---------------------- | ----------------------------------------- |
| Release decision | Release Owner          | Product Owner          | Incident Commander                        |
| API/runtime      | Backend Platform Owner | Release Owner          | Incident Commander                        |
| Mobile/cache     | Mobile Platform Owner  | Backend Platform Owner | Incident Commander                        |
| Privacy/security | Privacy/Security Owner | Release Owner          | Security incident path                    |
| Incident command | Incident Commander     | Release Owner          | Executive/on-call path defined externally |

These are roles, not invented personal names. The release ticket must replace them with accountable people before Stage 0.

## 7. Incident scenarios

- API failure: confirm release/readiness, inspect safe counters, freeze cohort, disable flag/release exposure, validate recovery.
- Coach fallback spike: inspect Coach context availability and safe failures, confirm LLM remains disabled, hold expansion.
- Privacy signal: stop instrumentation/export, preserve only safe evidence, notify security/privacy, redact and revalidate.
- Cache isolation: stop rollout, invalidate versioned cache, assess exposure, require security sign-off.
- History/Trends degradation: inspect latency/pagination buckets, hold affected surface, preserve Today where safe.

## 8. Rollback approval checklist

- [ ] Freeze cohort expansion.
- [ ] Record release and stage.
- [ ] Disable applicable feature exposure.
- [ ] Confirm compatible API/Mobile behavior.
- [ ] Invalidate versioned owner-scoped cache if required.
- [ ] Confirm no legacy-field writes.
- [ ] Confirm `AI_LLM_ENABLED=false`.
- [ ] Monitor recovery and record incident decision.

Rollback authority: Release Owner or Incident Commander. Destructive migration is never part of rollback.

## 9. Gate classification

```text
PARTIAL_GATE
```

The existing CI validates format, lint, API tests, builds and Mobile export; the API E2E step is now included in the workflow. Operational dashboards/alerts remain external and must be provisioned and tested before broad rollout. Until then, only controlled rollout is approved.

## 10. Privacy and cardinality gate

Any user/tenant identifier, Nutrition payload, Coach prompt/context, exact date/timestamp label, dynamic endpoint label, exception message, token or authorization material is a rollout blocker. Synthetic test failures may be used only in non-production validation.

## 11. Prompt 12 external provisioning result

Infrastructure discovery found `NO_PROVIDER_AVAILABLE`. The repository has Docker/local Mongo configuration and GitHub Actions, but no production deployment target, IaC, metrics exporter, external logging sink, dashboard provider, alert provider or incident-routing integration. No credentials or provider resource identifiers were available.

Therefore this document remains a versioned specification, not proof of provisioning. Dashboards and alerts are `DEFINED_NOT_PROVISIONED`; external metrics/log ingestion is `NOT_PROVISIONED`; owners are `OWNER_NOT_RESOLVED`; synthetic validation is `NOT_EXECUTED`.

The authoritative sign-off is [release-2.1-epic-a3-broad-rollout-signoff.md](release-2.1-epic-a3-broad-rollout-signoff.md). Broad rollout remains blocked and no external provider was introduced by this prompt.
