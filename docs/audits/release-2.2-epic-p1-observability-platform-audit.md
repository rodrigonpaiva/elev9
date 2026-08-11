# Release 2.2 — Epic P1 Observability Platform Audit

**Audit date:** 2026-08-05  
**Scope:** audit, inventory, gap analysis, architecture decision and implementation planning only  
**Runtime changes:** none

## 1. Executive summary

The repository has real but local-only observability primitives. The API emits an `x-request-id`, records request completion through a `console.log` middleware, exposes `/health` and Mongo-aware `/health/ready`, and uses Nest `Logger` for domain and AI signals. Nutrition and Recovery signals are allowlisted and bounded; AI has in-memory lifecycle/report/agent/expert traces, safety redaction, retry/fallback/circuit-breaker metadata and retention pruning. Mobile has a typed product-analytics taxonomy with a safe allowlist, but the default provider is disabled noop. Web has no proportional observability integration.

No OpenTelemetry SDK/exporter, OTLP transport, Collector, Prometheus scrape endpoint, Grafana, Loki, Tempo, Alertmanager, Sentry, centralized log sink, external metrics backend, distributed trace backend, dashboard, active alert or incident routing is present. Docker provisions MongoDB and the API only. Production runtime and cloud provider are undecided.

The proposed target is vendor-neutral and incremental: OpenTelemetry instrumentation and OTLP boundary for API/server-side signals; an optional local Collector plus Prometheus/Grafana/Loki/Tempo/Alertmanager profile; a managed backend selected later for staging/production; and a separately governed Sentry-class mobile error adapter only after privacy, consent and cost decisions. The decision is `ARCHITECTURE_DECISION_PROPOSED`.

## 2. Repository state

| Item              | Evidence                                                                        |
| ----------------- | ------------------------------------------------------------------------------- |
| Branch            | `feat/dashboard-v1`                                                             |
| Commit            | `7a088680537d95939b55cd4a4c2bbcc8f5a208ea`                                      |
| Working tree      | Clean at audit start; branch was 32 commits ahead of `origin/feat/dashboard-v1` |
| Nx projects       | `api`, `mobile`, `web`, `api-client`, `types`, `ui`                             |
| Package manager   | npm (`package-lock.json`, `npm exec nx`)                                        |
| Runtime           | Node 22 Docker image; Nest API; Expo mobile; Next.js web surface                |
| Docker            | MongoDB 7 plus API; no observability services                                   |
| CI                | `.github/workflows/ci.yml`, one `validate` job                                  |
| Production target | `RUNTIME_TARGET_UNDECIDED`                                                      |

Relevant Nx targets: API `build`, `start`, `start:dev`, `test`, `test:e2e`; Mobile inferred `start`, `serve`, `build`, `export`, `test`, EAS and platform targets; Web `build`, `dev`, `start`, `serve-static`; `types` and `api-client` `build`/`lint`; UI `build` only.

## 3. Audit method

Read-only inspection covered the mandatory root/configuration files, all workflows, Docker and env examples, all files under `docs/` related to architecture, operations, analytics, observability, AI, privacy, security, release and runbooks, plus source searches for logging, correlation, metrics, traces, health, analytics, Mongo, AI, redaction, retention and providers. The Fitness AI blueprint was treated as product reference only, not implementation evidence.

Every capability was classified as `NOT_PRESENT`, `DOCUMENTED_ONLY`, `SCAFFOLDED`, `IMPLEMENTED_LOCAL_ONLY`, `IMPLEMENTED_NOT_EXPORTED`, `EXPORTED_NOT_PROVISIONED`, `PROVISIONED_NOT_VALIDATED`, `INTEGRATED_NOT_VALIDATED`, `PRODUCTION_CANDIDATE` or `PRODUCTION_READY`.

## 4. Current architecture

```text
API request
  -> correlation middleware (incoming or generated x-request-id)
  -> request console log on finish/close
  -> Nest domain/AI logs and in-memory bounded services
  -> no transport/exporter/backend

Mobile product events
  -> typed allowlist + forbidden-property guard
  -> disabled NoopProductAnalytics
  -> no provider/transport

Health
  -> /health process response
  -> /health/ready Mongo ping

Docker
  -> mongo + api only
CI
  -> format, lint, API tests/E2E, builds, mobile export
```

The internal AI trace objects are diagnostic application state, not distributed tracing. No trace context propagation or parent/child spans were found.

## 5. Logging assessment

| Area          | Mechanism                                             | State                                 | External sink            | Privacy                                                                          | Gap                                                            |
| ------------- | ----------------------------------------------------- | ------------------------------------- | ------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| API requests  | `request-logging.middleware.ts`, `console.log` text   | `IMPLEMENTED_LOCAL_ONLY`              | None                     | Path query removed; no headers/body                                              | Structured format, release metadata, sink, retention           |
| Correlation   | `request-correlation.middleware.ts`, `x-request-id`   | `IMPLEMENTED_LOCAL_ONLY`              | None                     | Request ID is potentially high-cardinality and untrusted                         | Bind to logger/context and propagate downstream                |
| Nest/domain   | `Logger` in use cases/services                        | `IMPLEMENTED_LOCAL_ONLY`              | stdout only              | Mixed quality; concrete tests show some `userProfileId`, dates, timezone in logs | Repository-wide allowlist/redaction and structured transport   |
| Recovery      | `RecoveryObservabilityService`                        | `IMPLEMENTED_LOCAL_ONLY`              | None                     | Designed to exclude account/health/response data; duration is raw number         | Standard schema, bounded duration and export                   |
| Nutrition     | `NutritionObservabilityService`                       | `IMPLEMENTED_LOCAL_ONLY`              | None                     | Allowlisted safe codes/buckets; no payloads                                      | Export and central retention                                   |
| AI safety/LLM | Nest logs for provider/model/fallback/safety outcomes | `IMPLEMENTED_LOCAL_ONLY`              | None                     | Some safe metadata; tests exercise redaction, but logger policy is not global    | Enforce no prompt/message/response/body and standardize fields |
| Mongo         | Mongoose connection exists; no query logger           | `NOT_PRESENT` for operational logging | None                     | Safer default; no documents/query params observed                                | Add safe pool/slow-query signals later, never raw documents    |
| Mobile        | No app-wide crash/error logger found                  | `NOT_PRESENT`                         | None                     | Local console/provider not configured                                            | Crash, release, native stack and network visibility            |
| Web           | No dedicated client/server logger found               | `NOT_PRESENT`                         | None                     | Surface appears limited                                                          | Add only if web becomes operationally significant              |
| CI            | GitHub Actions step output                            | `IMPLEMENTED_LOCAL_ONLY`              | GitHub Actions retention | May include build/test diagnostics                                               | Add release/artifact metadata and telemetry validation only    |

Concrete privacy risk: existing test/runtime logs demonstrate that some domain logs can include direct profile identifiers, local dates and timezone. These are not reproduced here; they are a P1 remediation target before centralized export. No evidence of authorization headers, cookies, tokens, prompts, complete Coach messages, complete LLM responses or nutrition payloads being emitted by the audited observability adapters was found.

## 6. Metrics assessment

| Area                 | Producer                                              | State                      | Export                     | Cardinality risk                                                                             | Gap                                                            |
| -------------------- | ----------------------------------------------------- | -------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Nutrition counters   | `NutritionObservabilityService` `Map<string, number>` | `IMPLEMENTED_LOCAL_ONLY`   | None; snapshot method only | Low bounded dimensions in key; process-local reset                                           | Prometheus/OTel instruments, aggregation and restart semantics |
| Recovery signals     | `RecoveryObservabilityService` logs only              | `IMPLEMENTED_NOT_EXPORTED` | None                       | Raw `durationMs` in log; no metric labels                                                    | Histograms/counters with buckets                               |
| AI lifecycle/reports | AI observability services in memory                   | `IMPLEMENTED_LOCAL_ONLY`   | None                       | Risk depends on future dimensions; trace IDs must not become labels                          | Safe counters, latency/token/cost buckets and export           |
| HTTP                 | No server metric instrument found                     | `NOT_PRESENT`              | None                       | N/A                                                                                          | Request count, duration histogram, status and route template   |
| Mongo/runtime        | No metrics instrument found                           | `NOT_PRESENT`              | None                       | N/A                                                                                          | Pool, errors, operation duration, event-loop/memory signals    |
| Product analytics    | Typed mobile events                                   | `SCAFFOLDED`               | Noop                       | `flowSessionId` is high-cardinality if exported; keep event correlation out of metric labels | Separate consent/provider decision                             |

No metric is scraped, pushed, persisted or externally queryable. IDs, request IDs, dynamic prompt versions, free-form error strings, resource IDs and message text must never be metric labels.

## 7. Tracing assessment

AI and agent services contain bounded in-memory diagnostic trace objects, request-scoped lifecycle state, expert routing and retention tests. They are `IMPLEMENTED_LOCAL_ONLY`, not OpenTelemetry. No SDK, `traceparent`, AsyncLocalStorage trace context, parent span, exporter, collector, backend, sampling or metric/log correlation was found. The target is server-side OTel spans for HTTP, Mongo and safe AI pipeline stages, with body/prompt/response exclusion and trace IDs available only in logs/correlation views, never as metric labels.

## 8. Health assessment

| Endpoint                    | Current checks                                          | Contract/consumer                                                               | State                    |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------ |
| `/health`                   | Process/controller response only; timestamp             | Public stable liveness-style response; CI/runtime can call it                   | `IMPLEMENTED_LOCAL_ONLY` |
| `/health/ready`             | Mongoose `readyState` and `db.admin().ping()`; 200/503  | Readiness response; Docker currently depends on Mongo health, not API readiness | `IMPLEMENTED_LOCAL_ONLY` |
| Startup                     | Nest bootstrap and Mongoose module setup                | Docker process startup                                                          | `IMPLEMENTED_LOCAL_ONLY` |
| Shutdown                    | No explicit graceful-shutdown signal/telemetry found    | Not wired to deployment                                                         | `NOT_PRESENT`            |
| AI/cache/storage/background | No health endpoints found; LLM disabled by env/defaults | Not consumed by deployment                                                      | `NOT_PRESENT`            |

Checks are safe and intentionally public, but readiness has no explicit timeout beyond Mongo driver behavior, no event-loop/memory pressure signal and no deployment integration evidence. No health changes are proposed in this prompt.

## 9. Product analytics assessment

Mobile owns a typed taxonomy for Nutrition, Recovery and Daily Check-in interaction events. The safe boundary rejects forbidden fields, enforces event allowlists, swallows provider errors and defaults to `NoopProductAnalytics` with `enabled=false`. Events are emitted by mobile code and tested, but not transported, persisted or externally queryable. There is no consent/opt-out implementation and no active provider. Domain engagement records in Notifications are application data, not analytics transport. Technical logs remain separate.

## 10. Mobile assessment

Expo export/build and Jest tests are available. Offline/cache/sync behavior and product analytics are implemented and tested. No Sentry, Crashlytics, Expo error reporting, OTel mobile, Datadog or New Relic integration was found. No app-wide error boundary, crash reporting, native symbol/source-map upload, release health, startup/screen performance, API latency or unhandled rejection backend was evidenced. Recommendation: evaluate a provider-specific crash/error adapter, preferably Sentry-class for Expo/native release visibility, independently of server OTel and only after privacy/consent/cost approval.

## 11. Web assessment

The Web project is a small Next.js surface with build/dev/start targets and no observed observability provider, web-vitals integration, error reporting, CSP report sink or server tracing. Keep the target proportional: reuse safe server boundary if the web gains server behavior; add client error/release visibility only when it becomes a production surface.

## 12. API assessment

The Nest monolith has request correlation before request logging, global validation, modular controllers/use cases, Mongo-backed repositories, authentication/validation/controller/domain failure paths and AI retry/fallback/circuit-breaker code. There is no global exception telemetry contract, HTTP server metrics, route-template normalization, runtime metrics, trace context or external sink. Domain signals should remain domain-specific; HTTP lifecycle, errors, Mongo and runtime should be global.

## 13. MongoDB assessment

Mongoose is configured through `MongooseModule.forRoot(MONGODB_URI)`. Readiness pings Mongo admin. Repository schemas include indexes in domain infrastructure, but no operational index dashboard, pool metrics, retry/connection event export, slow query visibility or transaction visibility was found. Query/document logging is absent, which is the correct privacy-safe default. Future visibility must use operation class, collection allowlist, outcome and duration buckets only.

## 14. AI observability assessment

The AI module includes deterministic Coach paths and guarded LLM/agent paths. The repository contains prompt/version registries, model/provider metadata, token/cost-oriented observability contracts, retry/timeout/fallback/circuit-breaker behavior, expert routing/composition, tool execution, safety redaction and bounded in-memory traces/reports with configurable/default retention. Tests cover safety, redaction, retention, provider failure and observability behavior. `AI_AGENT_RUNTIME_ENABLED=false`, tools disabled and no production LLM activation was performed.

Safe future signals: intent, context-load outcome, policy decision, expert route, composition result, LLM invocation outcome, allowlisted model/provider, prompt version, retry/timeout/fallback/circuit state, token/cost buckets, safety outcome, tool outcome, structured validation and memory operation result. Forbidden: prompt, user message, response, memory payload, fitness/nutrition facts, secrets and request/response bodies.

## 15. CI/CD assessment

The single CI job installs dependencies, format-checks, lints `types`/`api-client`, runs API unit tests and API E2E, builds API/shared packages/mobile and exports mobile. There are no coverage publishing, security scans, Docker smoke, telemetry contract tests, artifact promotion, deployment, release marker, environment promotion or incident hooks. Future CI should validate telemetry schemas/privacy and publish build/release metadata without exporting user data.

## 16. Runtime and deployment assessment

Local Docker is defined for MongoDB and API. Dockerfile builds with Node 22 and runs the API. No Kubernetes, serverless, VM, reverse proxy, TLS, cloud monitoring, secrets manager or deployment automation is confirmed. `RUNTIME_TARGET_UNDECIDED` is therefore the official status.

## 17. Security and privacy assessment

| Signal                 |                    PUBLIC |                     INTERNAL |                       CONFIDENTIAL |               SENSITIVE_PERSONAL | HEALTH_SENSITIVE |    SECRET |
| ---------------------- | ------------------------: | ---------------------------: | ---------------------------------: | -------------------------------: | ---------------: | --------: |
| Logs                   |      health contract only |       safe operation/outcome | operational errors after redaction | aggregated/never direct identity |        forbidden | forbidden |
| Metrics                |       health availability | low-cardinality service data |              safe error categories |                  aggregated only |  aggregated only | forbidden |
| Traces                 |     endpoint names/status |           component/duration |                    safe attributes |         no payload; redacted IDs |        forbidden | forbidden |
| Analytics              | event names after consent |             bounded UX enums |                  provider metadata |            consent + aggregation |        forbidden | forbidden |
| Alerts/dashboards      |            generic status |       operational dimensions |                    safe codes only |                      no identity |  no health facts | forbidden |
| Incident notifications |            generic impact |   safe correlation reference |           minimal redacted context |               no direct identity |        forbidden | forbidden |

Allowed: operation, outcome, environment, release, service, module, bounded duration bucket, safe error code and request correlation reference. Allowed aggregated only: tenant/user population counts and product funnels. Allowed with redaction: exception class, provider/model identifiers and deployment metadata. Forbidden: tokens, authorization headers, cookies, emails, names, direct IDs, prompts, messages, Coach responses, nutrition/health payloads, secrets, full stack context with sensitive values.

Existing allowlists/redaction are useful but not a repository-wide enforcement boundary. No formal GDPR export/delete linkage, consent store or telemetry access-control policy was found.

## 18. Retention assessment

No external retention is configured. AI internal services do have bounded in-memory retention/configuration and tests; this is not a durable policy. Formal categories are required: debug local, CI artifacts, operational logs, metrics, sampled traces, mobile crash/error events, product analytics, AI diagnostic metadata and audit/security records. Final periods, deletion linkage and legal basis remain open decisions.

## 19. Cost and cardinality assessment

| Risk                        | Rating  | Driver                                                                                       |
| --------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| Logs                        | MEDIUM  | current volume is stdout-only; central export plus verbose Nest/domain logs can grow quickly |
| Metrics                     | HIGH    | future IDs/free text/dynamic route labels could multiply series; strict schema required      |
| Traces                      | MEDIUM  | AI/HTTP/Mongo spans are valuable but payloads and unsampled high volume are costly           |
| AI telemetry                | HIGH    | token/cost/latency volume and accidental payload capture have both cost and privacy impact   |
| Mobile events/crashes       | MEDIUM  | disabled now; provider, offline queue and release volume unknown                             |
| Retention/dashboard queries | UNKNOWN | no backend, volume baseline or retention policy exists                                       |

## 20. Ownership assessment

No `CODEOWNERS`, on-call roster, incident commander, security contact or release owner was found in the audited repository. Roles are `OWNER_UNRESOLVED`: Platform/Backend for API telemetry; Mobile for crash/release; Product for analytics; AI owner for AI signals; Security/Privacy role for policy; Release owner for promotion; Incident Commander role for P1/P0 response.

## 21. Capability scorecard

| Capability         | Current state                        | Target state                  | Gap                            | Risk | Prompt |
| ------------------ | ------------------------------------ | ----------------------------- | ------------------------------ | ---- | ------ |
| Structured logging | `IMPLEMENTED_LOCAL_ONLY`             | `PRODUCTION_CANDIDATE`        | text/console and mixed fields  | P1   | 3      |
| Correlation        | `IMPLEMENTED_LOCAL_ONLY`             | exported safe context         | no propagation/trace link      | P1   | 3/5    |
| Metrics            | `IMPLEMENTED_LOCAL_ONLY` for domains | OTLP/Prometheus-compatible    | no HTTP/runtime/export         | P1   | 4      |
| Tracing            | internal only                        | OTel spans                    | no context/export/backend      | P1   | 5      |
| Health             | Mongo readiness                      | deployment-consumed contracts | no runtime/deployment wiring   | P2   | 8      |
| Mongo visibility   | readiness only                       | safe pool/query/error signals | no operational metrics         | P1   | 8      |
| Mobile crash       | not present                          | provider adapter              | no crash/release visibility    | P1   | 9      |
| Web visibility     | not present                          | proportional web errors       | no integration                 | P2   | 9      |
| AI observability   | bounded in-memory                    | safe exported metadata        | no external query path         | P1   | 10     |
| Dashboards         | documented only                      | provisioned minimum set       | no backend/provisioning        | P1   | 6      |
| Alerting           | documented only                      | routed and tested             | no Alertmanager/provider       | P1   | 7      |
| SLOs               | candidate SLIs only                  | baselined SLOs                | no baseline/owner              | P1   | 7      |
| Incident response  | not found                            | role/runbooks/escalation      | no on-call                     | P1   | 11     |
| Retention          | AI local TTL only                    | approved categories           | no global policy               | P1   | 11     |
| Privacy            | local allowlists                     | enforced telemetry governance | no consent/access/delete proof | P1   | 11     |
| CI                 | tests/builds present                 | telemetry/privacy validation  | no observability gates         | P2   | 2/12   |
| Production backend | none                                 | selected behind OTLP          | runtime/provider undecided     | P1   | 2/11   |
| Ownership          | unresolved                           | role-based ownership          | no on-call/CODEOWNERS          | P1   | 11     |

## 22. Architecture options

| Option                               | Compatibility/DX                                                       | Operations/privacy                               | Lock-in/cost                                        | Decision                                          |
| ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------- |
| A Grafana OSS local-first            | Strong API/Node/local fit; mobile weak                                 | High local burden; privacy controllable          | Low lock-in, infra cost/maintenance                 | Good local profile, not sole production answer    |
| B OTel vendor-neutral, managed later | Best with runtime uncertainty and Nx/Node                              | Collector boundary; provider operations deferred | Low lock-in; cost depends on later provider         | Recommended foundation                            |
| C Sentry-centered                    | Strong Mobile/Web errors and releases; API metrics/traces less neutral | Simple app UX; provider privacy review required  | Higher vendor lock-in and event cost                | Separate mobile evaluation, not platform standard |
| D cloud-native                       | Could be operationally simple after runtime decision                   | Cloud-specific controls and residency            | Highest lock-in; impossible to choose evidence-free | Defer                                             |
| E hybrid                             | Best practical coverage if governed                                    | Two control planes and policy complexity         | Moderate cost/lock-in                               | Recommended deployment shape: B + optional C      |

## 23. Recommended architecture

`OpenTelemetry` is the API/server instrumentation standard; `OTLP` is the provider boundary; an optional `OpenTelemetry Collector` routes signals. Local development uses an optional Docker Compose observability profile with Prometheus, Grafana, Loki, Tempo and Alertmanager. Production remains provider-neutral until a runtime/provider decision; the application must not depend directly on Grafana Cloud, Datadog or a cloud vendor. Mobile/Web errors may use a separately approved provider adapter, with Sentry-class tooling evaluated for native crash/release visibility. Product analytics stays a separate consented boundary.

This is a proposed architecture, not an accepted vendor decision.

## 24. Architecture diagram

```text
API / Mobile / Web
        |
        v
Safe telemetry boundaries
(allowlists, redaction, low-cardinality schemas)
        |
        +--> API OTel SDK + structured logger + error adapter
        |          |
        |          +--> OTLP --> optional local Collector --> Prometheus/Loki/Tempo
        |          |                                  \--> Grafana/Alertmanager
        |          |
        |          \--> staging/production Collector/provider boundary
        |
        +--> Mobile/Web error adapter (separate provider decision)
        |
        \--> Product analytics adapter (consent + noop by default)
```

Local is credential-free and optional; CI validates contracts; staging proves the selected boundary with synthetic data; production adds a provider only after privacy, retention, budget and ownership approval.

## 25. Local environment strategy

Add later as an optional Compose profile, not as the default API/Mongo path: Collector, Prometheus, Grafana, Loki, Tempo and Alertmanager with short retention, no real user data and documented ports/credentials. API development must still work when the profile is absent; telemetry must fail open. The stack is not provisioned in this prompt.

## 26. CI strategy

Keep current validation. Prompt 2/12 should add schema/privacy tests, Collector configuration validation and synthetic smoke checks only when the services exist. CI should attach release/environment metadata and retain artifacts by category; no user data or live credentials should be exported.

## 27. Staging and production strategy

Instrument once, export OTLP to a Collector/provider boundary. Staging uses synthetic accounts and tighter sampling/short retention. Production provider selection is open; it must support metrics/logs/traces, GDPR controls, access control, deletion/retention, cost limits and incident routing. `RUNTIME_TARGET_UNDECIDED` remains a blocker for provider-specific deployment work, not for vendor-neutral contracts.

## 28. Mobile strategy

Evaluate Sentry-class mobile error/crash reporting for Expo/native stack traces, source maps, releases and offline buffering. Do not use it as the API observability standard and do not enable it until consent, data processing, release mapping, cost and retention are approved. OTel mobile is deferred because native crash visibility is the first need and the current mobile surface has no provider.

## 29. Web strategy

Keep the current low-complexity surface. Add Next.js server telemetry through the same safe boundary if server behavior becomes operational; add client error/release metadata only when the site is a production dependency. Do not add full RUM/session replay now.

## 30. AI strategy

Instrument stage names and outcomes for intent, context, policy, routing, composition, provider call, tool, safety, validation, fallback and memory. Record allowlisted provider/model/prompt version, bounded token/cost/latency buckets and retry/timeout/circuit states. Never record prompts, messages, responses, context snapshots, memory payloads, health/nutrition facts or secrets. Keep internal traces until exported telemetry is certified.

## 31. Telemetry policy

Allowed logs/traces: operation, outcome, environment, release, service, module, safe error code, bounded duration and correlation reference. Metrics allow only low-cardinality enums, counters, histograms and gauges. Product analytics remains separate and disabled/noop until consent/provider approval. Forbidden everywhere: payloads, tokens, headers/cookies, direct identity, health/nutrition details, prompts, messages, Coach content, secrets and free-form error text.

## 32. Cardinality policy

Allowed labels: service, environment, release channel, module, route template, HTTP method, status class, outcome, error category, provider allowlist, model allowlist, prompt version allowlist and bounded result/duration/cost buckets. Forbidden labels: user/tenant/profile/request IDs, dynamic routes, prompt text/version generated at runtime, resource IDs, timestamps, messages, error messages, stack text and payload fields.

## 33. SLO strategy

First establish a baseline period. Candidate services/SLIs: API availability and latency; dashboard home; Daily Check-in; Recovery; Nutrition; deterministic Coach path; LLM path only when enabled; History/Trends; mobile crash-free sessions. Use valid responses, status-class availability, p50/p95/p99 latency, dependency readiness, successful sync and crash-free sessions. Numeric targets are `PROVISIONAL` until baseline, owner and business criticality are approved. Error budgets require an owner and review cadence in Prompt 7/11.

## 34. Dashboard strategy

Plan, do not provision yet: Platform Overview; API Health; MongoDB Health; Mobile Health; AI Coach; Domain Consumers; Release and Rollout; Security and Privacy Signals. Each must use safe filters, bounded labels, owner role, alert links and runbook links. No raw payload panels or identity filters.

## 35. Alert strategy

P0: security/data exposure. P1: availability or integrity. P2: sustained degradation. P3: maintenance/noise. Thresholds require baseline. Triggers should use rate/error ratio, availability, latency windows, dependency health, crash-free trend and telemetry pipeline health. Every routed alert needs owner role, escalation, rollback criteria and runbook; expected disabled/not-configured AI states must not page.

## 36. Prompt execution roadmap

| Prompt | Objective                             | Dependencies                                | Main deliverables                                  | Acceptance criteria                       |
| ------ | ------------------------------------- | ------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| 2      | Base infrastructure/provider boundary | This audit; human approval of local profile | Collector/OTLP contracts, optional Compose profile | local stack optional, no cloud credential |
| 3      | Structured logging                    | 2                                           | logger schema, redaction, correlation              | JSON-safe logs and tests                  |
| 4      | Metrics                               | 2–3                                         | HTTP/domain/runtime instruments                    | scrape/query smoke, cardinality tests     |
| 5      | Distributed tracing                   | 2–3                                         | OTel context, HTTP/Mongo/AI spans                  | trace propagation and redaction tests     |
| 6      | Dashboards                            | 4–5                                         | versioned dashboard specs/provisioning             | eight minimum dashboards validated        |
| 7      | Alerting/SLOs                         | 4–6, baseline                               | alerts, SLO/error budgets                          | no raw data, routed test alerts           |
| 8      | Health/runtime signals                | 3–5                                         | safe runtime/Mongo/deployment signals              | contracts, timeout/graceful behavior      |
| 9      | Mobile observability                  | privacy/provider decision                   | crash/release/network adapter                      | source maps, privacy and offline tests    |
| 10     | AI observability                      | 3–5, AI remains disabled by default         | safe AI metrics/traces                             | forbidden payload tests and cost buckets  |
| 11     | Security/retention/operations         | all prior; owner decision                   | retention, access, runbooks, incident roles        | governance review and deletion evidence   |
| 12     | Certification                         | all prior; environment/provider             | end-to-end certification report                    | local/staging/production gates pass       |

## 37. Files created

- `docs/audits/release-2.2-epic-p1-observability-platform-audit.md`
- `docs/architecture/release-2.2-epic-p1-observability-platform-architecture.md`
- `docs/adr/ADR-012-observability-platform.md`
- `docs/plans/release-2.2-epic-p1-observability-platform-implementation-plan.md`
- `docs/plans/release-2.2-epic-p1-file-change-map.md`

## 38. Tests and validation

| Project           | Command                                                            |              Result |           Suites |           Tests | Notes                                                                                              |
| ----------------- | ------------------------------------------------------------------ | ------------------: | ---------------: | --------------: | -------------------------------------------------------------------------------------------------- |
| api               | `npx nx test api --outputStyle=stream`                             |              PASSED |              215 |            1352 | Nx reported a flaky-task notice despite success                                                    |
| mobile            | `npx nx test mobile --outputStyle=stream`                          |              PASSED |               22 |             104 | All passed                                                                                         |
| api               | `npx nx run api:test:e2e --skip-nx-cache --outputStyle=stream`     | ENVIRONMENT_BLOCKED | 16 failed suites | 56 failed tests | MongoMemoryServer listener failed with sandbox `EPERM`/port conflict; rerun in CI/approved runtime |
| api               | `npx nx build api --outputStyle=stream`                            |              PASSED |              N/A |             N/A | Cache used for dependent types build                                                               |
| types             | `npx nx build types --outputStyle=stream`                          |              PASSED |              N/A |             N/A | Cache hit                                                                                          |
| api-client        | `npx nx build api-client --outputStyle=stream`                     |              PASSED |              N/A |             N/A | Cache hit                                                                                          |
| mobile            | `npx nx build mobile --outputStyle=stream`                         |              PASSED |              N/A |             N/A | Web/Android/iOS export succeeded                                                                   |
| types, api-client | `npx nx run-many -t lint -p types,api-client --outputStyle=stream` |              PASSED |              N/A |             N/A | Configured lint targets                                                                            |
| repository        | `git diff --check`                                                 |              PASSED |              N/A |             N/A | No whitespace errors                                                                               |

## 39. Findings

| ID         | Severity | Area            | Finding                                                                                              | Required action                                         |
| ---------- | -------- | --------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| OBS-P1-001 | P1       | Platform        | No external metrics/logs/traces backend or exporter                                                  | Implement vendor-neutral OTLP boundary                  |
| OBS-P1-002 | P1       | Logging/privacy | Request/domain logs are mixed text/object stdout and concrete tests show direct profile/date context | Enforce structured allowlist/redaction before export    |
| OBS-P1-003 | P1       | Tracing         | Internal AI traces are not distributed tracing                                                       | Add OTel context/spans in Prompt 5                      |
| OBS-P1-004 | P1       | Operations      | Dashboards, alerts and incident routing are documentation only                                       | Provision and validate after backend decision           |
| OBS-P1-005 | P1       | Mobile          | No crash/error/release provider                                                                      | Approve and implement separate mobile adapter           |
| OBS-P1-006 | P1       | Governance      | Retention, consent, access/delete and ownership are unresolved                                       | Security/Privacy and operational role decisions         |
| OBS-P1-007 | P1       | Runtime         | Production target/cloud provider undecided                                                           | Keep boundary neutral; decide before staging/production |
| OBS-P2-001 | P2       | Health          | Readiness is Mongo-only and not deployment-consumed; no startup/shutdown/runtime checks              | Address in Prompt 8 without changing now                |
| OBS-P2-002 | P2       | CI              | No telemetry contract/privacy/security gates                                                         | Add after foundation exists                             |
| OBS-P2-003 | P2       | Web             | No visibility, though current surface is small                                                       | Reassess when web becomes production-critical           |
| OBS-P2-004 | P2       | E2E             | E2E is blocked by sandbox listener restrictions                                                      | Re-run in a network-capable CI/runtime                  |

## 40. Risk summary

```text
P0: No confirmed active P0 issue; future telemetry must prevent data exposure.
P1: No external observability; privacy-sensitive mixed logs; no mobile crash visibility; no production backend, retention, owner or incident routing.
P2: Limited health/runtime signals, no telemetry CI gates, proportional Web gap, sandbox-blocked E2E.
P3: Dashboard/query cost optimization and maintenance policy are not yet baselined.
```

## 41. Open decisions

- Human approval of this vendor-neutral architecture and ADR status.
- Production runtime/cloud/provider and data residency.
- Managed backend shortlist and budget.
- Mobile crash provider, consent, source-map handling and retention.
- Final retention/deletion/access policy and legal review.
- Role owners, on-call and escalation path.
- Baseline period and provisional SLO targets.

## 42. Architecture decision

```text
ARCHITECTURE_DECISION_PROPOSED
```

## 43. Prompt 2 readiness

```text
READY_FOR_PROMPT_2_WITH_CONDITIONS
```

Conditions: approve the proposed boundary/local profile, keep cloud/vendor choice open, and confirm the initial privacy/retention guardrails before any exporter or Compose observability service is added.

## 44. Scope confirmation

No production code, tests, package manifests, lockfiles, Docker services, exporters, providers, dashboards, alerts, CI jobs, feature flags, LLM activation or branches were changed. No dependency was installed.

## 45. Documentation

Created the five documents listed in section 37. No unrelated documentation or `.vscode/settings.json` was modified.

## 46. Final verdict

```text
ARCHITECTURE_DECISION_PROPOSED
```

## 47. Suggested commit

```bash
git commit -m "docs(observability): audit platform and define architecture"
```
