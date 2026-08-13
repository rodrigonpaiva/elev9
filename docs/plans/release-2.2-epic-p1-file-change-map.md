# Release 2.2 — Epic P1 Observability Platform File Change Map

This map records Prompt 2 implementation and future changes. Prompt 1 documents remain preserved.

| Prompt | Expected files/areas                                                                                                                                                                                                      | Change type      | Guardrail                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------- |
| 2      | `apps/api/src/observability/`; `apps/api/src/app.module.ts`; `apps/api/src/main.ts`; `package.json`; `package-lock.json`; `.env.example`; `docker-compose.yml`; `infra/observability/otel-collector/config.yaml`; runbook | created/modified | No default export; no sensitive attributes; Collector optional |
| 3      | `apps/api/src/common/`; `apps/api/src/main.ts`; API tests                                                                                                                                                                 | Modify/add       | No payloads, IDs or secrets; preserve fail-open                |
| 4      | API telemetry module; domain adapters; tests                                                                                                                                                                              | Add/modify       | Fixed labels and bounded buckets only                          |
| 5      | API bootstrap/context; HTTP/Mongo/AI adapters; tests                                                                                                                                                                      | Modify/add       | No prompt/body attributes; W3C propagation                     |
| 6      | `docs/dashboards/` or provisioning assets                                                                                                                                                                                 | Add              | Safe panels, owner/runbook links                               |
| 7      | `docs/alerts/`, SLO contracts, runbooks                                                                                                                                                                                   | Add              | Baseline before thresholds; no raw data                        |
| 8      | `apps/api/src/modules/health/`; runtime/Mongo adapters; tests                                                                                                                                                             | Modify/add       | Stable contracts and timeouts                                  |
| 9      | `apps/mobile/` app config/provider adapter/tests; EAS release metadata                                                                                                                                                    | Modify/add       | Provider/consent/source-map approval first                     |
| 10     | `apps/api/src/modules/ai/` telemetry adapters/tests                                                                                                                                                                       | Modify/add       | LLM remains disabled unless separately authorized              |
| 11     | `docs/security/`, `docs/operations/`, retention/access/runbooks                                                                                                                                                           | Add              | Legal/privacy and owner review                                 |
| 12     | validation/certification documents and CI checks                                                                                                                                                                          | Add/modify       | Certify actual environment evidence only                       |

## Explicitly protected files for Prompt 1

No changes to Mobile, Web, domain calculations, public API contracts, dashboards, alerts, workflows, feature flags, `.vscode/settings.json`, branches or commits. Prompt 2 intentionally changes API foundation, package manifests, lockfile, env example and optional Collector Docker configuration.

## Prompt 2 file register

| File/area                                        | Status   | Layer                | Responsibility                                         | Privacy impact                                  | Tests/rollback                             |
| ------------------------------------------------ | -------- | -------------------- | ------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------ |
| `apps/api/src/observability/`                    | created  | API foundation       | Config, providers, resources, lifecycle and tests      | Blocks unsafe resource keys; no payload capture | API targeted tests; remove module/provider |
| `apps/api/src/app.module.ts`                     | modified | API bootstrap        | Imports global observability module                    | No public contract change                       | API build; remove import                   |
| `apps/api/src/main.ts`                           | modified | API lifecycle        | Enables Nest shutdown hooks                            | Preserves request middleware                    | API build; remove hook                     |
| `package.json` / `package-lock.json`             | modified | Dependencies         | Official OTel API/core/sdk/exporters                   | No vendor SDK                                   | npm/Nx builds; revert dependency change    |
| `.env.example`                                   | modified | Configuration        | Disabled-safe OTel variables                           | No credentials                                  | Config tests; restore example              |
| `docker-compose.yml`                             | modified | Local infrastructure | Optional Collector profile and API env bridge          | Loopback ports, no backend                      | Compose config; disable profile            |
| `infra/observability/otel-collector/config.yaml` | created  | Local infrastructure | OTLP receivers, limiter, batch, debug exporter, health | No external exporter                            | Collector validation; remove profile       |
| `docs/operations/...runbook.md`                  | created  | Operations docs      | Setup and troubleshooting                              | Documents forbidden fields                      | Documentation-only rollback                |

## Dependency order

```text
Contracts/governance
  -> local/provider boundary
  -> logs
  -> metrics
  -> traces
  -> dashboards
  -> alerts/SLOs
  -> health/runtime
  -> mobile and AI adapters
  -> security/retention/operations
  -> certification
```

## Review gates

Every implementation prompt must include: privacy negative tests, cardinality review, failure-open behavior, environment-specific configuration, rollback instructions, documentation update, Nx validation and `git diff --check`.
