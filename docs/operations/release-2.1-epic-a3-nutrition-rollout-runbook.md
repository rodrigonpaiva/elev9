# Release 2.1 — Epic A3 Nutrition Intelligence Rollout Runbook

## 1. Purpose

Operate the controlled rollout of the certified canonical Nutrition runtime. This runbook does not introduce Nutrition semantics, contracts, or LLM activation.

## 2. Preconditions

- API and Mobile suites, builds, configured lints, architecture boundaries, and API E2E are green.
- P0 = 0 and P1 = 0.
- Nutrition defaults are safe and `AI_LLM_ENABLED=false`.
- Runtime, release, and monitoring owners are named.

## 3. Environment requirements

Use the repository lockfile and a host/CI runner that permits loopback process binding. API E2E uses `mongodb-memory-server@10.1.4`, synthetic isolated data, serial Jest execution, controlled clocks where needed, and teardown cleanup. Never use development or production MongoDB.

## 4. E2E execution

```bash
npm exec nx test:e2e api --skip-nx-cache --outputStyle=stream
```

The command must run in the compatible host/CI context. The sandbox-only `listen EPERM: operation not permitted 0.0.0.0` result is an environment classification, not a functional pass.

## 5. Test data isolation

Factories use synthetic users and tenants. Each suite owns its MongoMemoryServer lifecycle, disconnects Mongoose, and stops the server. Tests do not use real payloads, production secrets, internet, or LLM services.

## 6. Feature flags

Keep Nutrition disabled by default outside the controlled cohort. Enable only for internal accounts, then the approved cohort. Keep `AI_LLM_ENABLED=false` and verify no mixed contract state.

## 7. Rollout stages

| Stage | Entry | Observe | Advance / rollback |
| --- | --- | --- | --- |
| 0 — internal | Green release gate and owner sign-off | One observation window | Advance if stable; otherwise disable flag |
| 1 — controlled cohort | Stage 0 stable | One business window | Advance on stable signals; rollback on trigger |
| 2 — expanded cohort | Stage 1 stable and support briefed | One full window | Advance or disable flag |
| 3 — broad | Stage 2 stable and alerts active | Continuous | Roll back flag/configuration on trigger |

Do not invent percentage cohorts where the real flag system has no percentage primitive.

## 8. Monitoring

Monitor low-cardinality success rate, latency buckets, unavailable/not-configured/insufficient-data rates, processing failures, stale state, Coach fallback, cache hit/miss, History/Trends errors, notification failures, authorization failures, and safe error codes. Never emit foods, meals, calories, macros, restrictions, allergies, raw context, or user payloads.

## 9. Alerts

Before broad rollout, verify alerts for 5xx, Nutrition port failures, abnormal processing failures, authorization anomalies, cache isolation failures, latency, Coach fallback, and History/Trends failures. Missing external dashboards/alert rules are a P2 follow-up and block broad rollout until configured.

## 10. Rollback

Disable the Nutrition feature flag and invalidate only the versioned owner-scoped cache when required. Preserve public contracts; do not run destructive migrations. Confirm old Mobile/API Client compatibility, no new legacy-field writes, and LLM disabled.

## 11. Incident triggers

Rollback on sustained 5xx/latency regression, authorization or cache isolation failure, raw-payload telemetry, abnormal processing failure, unsafe Coach response/fallback, or History/Trends contract errors.

## 12. Ownership

Release owner, API/runtime owner, Mobile owner, and monitoring/incident owner must be named in the release ticket before Stage 0.

## 13. TodayNutrition compatibility

`TodayNutrition` is compatibility-only, deprecated, and has zero internal consumers. Remove only after external consumers are inventoried and migrated, with a deprecation window and boundary test.

## 14. Historical field lifecycle

Old documents may contain historical persisted fields. The current runtime does not write or expose them through projections or telemetry. Any cleanup requires a separate reversible lifecycle migration.

## 15. Sign-off checklist

- [ ] Compatible-host API E2E evidence attached.
- [ ] API/Mobile suites and builds green.
- [ ] Feature defaults and `AI_LLM_ENABLED=false` verified.
- [ ] Monitoring and alert owners named.
- [ ] Rollback checklist completed.
- [ ] Cohort entry/exit decision recorded.
- [ ] Privacy review confirms no raw Nutrition telemetry.

## 16. Observability inventory

The repository has allowlisted in-memory Nutrition counters/events, Nest/request logs, bounded in-memory Coach traces, Mobile noop analytics, and `/health` plus `/health/ready`. It has no configured metrics exporter, tracing exporter, external dashboard, or alert backend. The authoritative operational definitions are in [release-2.1-epic-a3-nutrition-observability.md](release-2.1-epic-a3-nutrition-observability.md).

## 17. Required dashboards and alerts

Provision the five dashboards and P1/P2 alert definitions in the observability specification. `DEFINED_NOT_PROVISIONED` is sufficient for internal planning only; broad rollout requires external provisioning, owner assignment and safe synthetic trigger validation.

## 18. Incident response

For API failure, Coach fallback spike, privacy signal, cache isolation failure, or History/Trends degradation: freeze expansion, record release/stage, inspect only safe signals, apply the approved rollback, validate recovery, and document the incident. Never copy payloads into tickets.

## 19. CI/CD gate

The versioned GitHub Actions workflow runs API E2E in addition to existing suites/builds. The overall gate remains `PARTIAL_GATE` until an external operational system supplies dashboards and alerts. Stage 0 requires manual release approval with named owners; Stage 3 is prohibited until the external gate is complete.

## 20. Prompt 12 external provisioning gate

The repository discovery for Prompt 12 found no production provider, deployment target, IaC, external metrics/logging backend, dashboard service, alert service or incident-routing integration. Docker/local Mongo and GitHub Actions are not an external observability provider.

No dashboards, alerts, owners, routing destinations or synthetic alert results may be marked provisioned without provider resource IDs and execution evidence. The sign-off is recorded in [release-2.1-epic-a3-broad-rollout-signoff.md](release-2.1-epic-a3-broad-rollout-signoff.md).

Required before broad rollout:

- select the already-authorized production provider;
- provision five dashboards and six P1 alerts;
- expose only safe bounded metrics and redacted logs;
- resolve role owners to teams, aliases or on-call rotations;
- validate routing and safe synthetic alert recovery;
- obtain named rollback approval.

Current decision: `CONTROLLED_ROLLOUT_ONLY`.
