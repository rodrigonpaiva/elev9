# Release 2.2 — Epic P1 Observability Platform Architecture

## 1. Context

Elev9 is an Nx monorepo with a NestJS/Mongoose API, Expo mobile client, small Next.js web surface and AI/agent capabilities. Current telemetry is local-only, provider-neutral and partly documented. Production runtime is not chosen. Health and nutrition data require minimization and strict separation of technical observability from product analytics.

## 2. Goals

- Establish one safe, vendor-neutral server telemetry contract.
- Support metrics, logs and traces for API, Mongo and AI without payload leakage.
- Make local observability optional, reproducible and credential-free.
- Leave production backend/cloud choice behind OTLP.
- Provide a separate, governed mobile crash/error boundary.
- Enable later dashboards, alerts, SLOs, runbooks and incident response.

## 3. Non-goals

No provider installation, runtime instrumentation, Docker Compose service, dashboard, alert, SLO target, mobile SDK, consent system, cloud deployment or LLM activation is part of this decision.

## 4. Principles

Privacy by construction; fail-open telemetry; low cardinality; instrument once/export many; local-first without cloud dependency; domain signals remain domain-owned; product analytics remains separate; no raw health/fitness/nutrition/AI content; gradual rollout; explicit ownership.

## 5. Architecture decision

Use OpenTelemetry as the server instrumentation standard and OTLP as the provider boundary. Route through an optional OpenTelemetry Collector. Use Grafana OSS components locally (Prometheus, Grafana, Loki, Tempo, Alertmanager) as a reference stack. Select a managed production backend later. Evaluate Sentry-class tooling separately for mobile/web errors and releases; it is not the API standard.

Status: foundation accepted; production provider remains deferred.

Implemented in Prompt 2: `apps/api/src/observability/` contains typed configuration, noop/OTLP providers, a safe resource builder, W3C context propagation, Nest lifecycle integration and bounded shutdown. The SDK is not instantiated when disabled.

## 6. Components

| Component                 | Role                                         | Boundary                          |
| ------------------------- | -------------------------------------------- | --------------------------------- |
| Safe telemetry contracts  | allowlists, redaction, bounded enums/buckets | application                       |
| OTel SDK                  | API HTTP/Mongo/AI instrumentation            | API                               |
| Structured logger         | JSON logs and correlation                    | API                               |
| OTLP                      | transport contract                           | application-to-collector/provider |
| Collector                 | routing, filtering, batching, sampling       | local/staging/production          |
| Prometheus                | local metrics backend                        | local only initially              |
| Loki                      | local logs backend                           | local only initially              |
| Tempo                     | local traces backend                         | local only initially              |
| Grafana                   | local visualization                          | local only initially              |
| Alertmanager              | local alert routing test                     | local/staging reference           |
| Mobile error adapter      | crash/native stack/release                   | separate provider decision        |
| Product analytics adapter | consented product events                     | separate system                   |

## 7. Signal model

Every signal includes service, environment, release, module, operation, outcome and safe error category where applicable. Duration uses histograms/buckets. Logs may carry a correlation reference. Metrics never carry IDs. Traces carry safe attributes and sampled timing, never bodies or content.

## 8. Logging architecture

Replace ad-hoc text output incrementally with a structured logger contract. Fields: timestamp, severity, service, environment, release, module, operation, outcome, duration bucket, safe error code and request/trace correlation reference. Header/body/query allowlists are mandatory. Logger errors cannot break request/domain behavior.

## 9. Metrics architecture

Global: HTTP request counter, duration histogram, status class, dependency health, runtime/event loop and process gauges. Domain: bounded operation/outcome counters for Recovery/Nutrition/Coach. AI: invocation, retry, fallback, safety, tool, token and cost buckets. Labels are fixed enums and route templates only. Export via OTLP; local Collector may expose Prometheus-compatible output.

## 10. Tracing architecture

Create server spans for request, controller/use-case boundary where valuable, Mongo dependency and safe AI pipeline stages. Use W3C trace context and AsyncLocalStorage/context APIs as appropriate. Exclude request/response bodies, prompts, messages, memory, health facts and secrets. Sample more heavily in local/staging and use tail/parent-based policy later after baseline.

## 11. Mobile architecture

Keep product analytics noop by default. Add a separately injected crash/error adapter after approval, with Expo/native stack traces, source maps, release/environment and offline buffering. Do not send health answers, Coach content, direct identity or API bodies. OTel mobile is deferred until mobile performance/tracing needs exceed crash/release needs.

## 12. Web architecture

The current web surface receives only proportional treatment. Reuse server-side contracts if it becomes operational; add client error/release visibility when it is a production dependency. No session replay or broad RUM now.

## 13. AI architecture

AI spans/events cover intent, context load, policy, expert route, composition, provider call, tools, safety, validation, fallback and memory operation. Attributes are allowlisted provider/model/prompt version, result type, safety outcome, retry/timeout/circuit state and bounded token/cost/latency. All payload content is forbidden.

## 14. Context propagation

Accept or generate `x-request-id`; propagate a safe correlation reference through API logs and downstream client calls. Use W3C `traceparent` for distributed traces. Never use request/trace IDs as metric labels or expose identity through them. Incoming IDs must be normalized, bounded and treated as untrusted.

## 15. Collector/provider boundary

```text
Application SDK/logger
  -> OTLP
  -> local Collector or staging/production Collector
  -> selected metrics/logs/traces backend
```

The application must not import a managed vendor SDK for server telemetry. Provider-specific transforms belong at the boundary.

The local Collector is versioned at `infra/observability/otel-collector/config.yaml`. It accepts OTLP gRPC on `4317` and HTTP on `4318`, applies memory limiting and batching, exposes health on `13133`, and exports only to a local `debug` exporter. No external backend is configured.

## 16. Local environment

Prompt 2 adds an optional Compose `observability` profile containing only the Collector. Start it with `docker compose --profile observability up otel-collector`. Prometheus, Grafana, Loki, Tempo and Alertmanager remain deferred to later prompts. The basic API/Mongo workflow remains valid with the profile off.

## 17. CI environment

Prompt 2 adds no CI job and no external export. Unit tests exercise configuration, resources, noop mode, SDK startup with a fake exporter and bounded shutdown. Collector config validation is an environment-level command.

## 18. Staging environment

Staging uses synthetic accounts, an approved Collector/provider and lower retention. It validates end-to-end signal delivery, dashboards, alert routing, source maps, access control and deletion procedures before production.

## 19. Production environment

Still `RUNTIME_TARGET_UNDECIDED`. A provider must be selected later based on runtime, residency, access control, retention, cost and incident integration. The OTLP contract prevents application migration when the backend changes.

## 20. Security and privacy

Logs/metrics/traces/analytics/alerts may carry only safe operational metadata. Direct identity, health/nutrition data, AI content, secrets and payloads are forbidden. Aggregates are allowed only where they cannot reconstruct a person. Central access must be role-based and audited.

## 21. Cardinality policy

Allowed: service, environment, release channel, module, route template, method, status class, outcome, safe error category, allowlisted provider/model/prompt version and bounded buckets. Forbidden: user/tenant/profile/request IDs, dynamic route values, free text, message/error text, resource IDs, exact timestamps and payloads.

## 22. Retention categories

Define separate policies for local debug, CI artifacts, logs, metrics, traces, mobile errors, product analytics, AI diagnostic metadata and security audit records. Final periods and deletion linkage require Security/Privacy and business approval; current AI in-memory TTL is not a central retention policy.

## 23. Sampling

Local: permissive but short-lived. CI: synthetic and unsampled only as needed. Staging: moderate baseline sampling. Production: parent-based/error-biased sampling, with rare safe AI diagnostics and no payload capture. Tune from volume/cost data.

## 24. SLO strategy

Baseline first. Candidate SLIs are API availability/latency, dependency readiness, dashboard and domain success, deterministic Coach success, optional LLM success and mobile crash-free sessions. Targets remain provisional until baseline and ownership exist.

## 25. Dashboard strategy

Minimum dashboards: Platform Overview, API Health, MongoDB Health, Mobile Health, AI Coach, Domain Consumers, Release and Rollout, Security and Privacy Signals. Every panel has bounded filters, owner role, linked alert/runbook and no payload or identity query.

## 26. Alert strategy

P0 security/data, P1 availability/integrity, P2 degradation, P3 maintenance. Use baseline-driven windows and ratios. Alerts require owner, escalation, rollback criteria and runbook. Disabled/not-configured AI states are excluded from paging.

## 27. Ownership

Until named, use roles: Platform/Backend, Mobile, Product Analytics, AI, Security/Privacy, Release and Incident Commander. Each future dashboard/alert must name a role and later a person/team. Current repository status is `OWNER_UNRESOLVED`.

## 28. Failure modes

Telemetry backend unavailable: buffer/drop safely and preserve product behavior. Collector unavailable: local exporter fails open. High volume: sampling/batching limits. Cardinality breach: schema validation rejects signal. Sensitive field: redaction/drop and security review. Provider migration: change boundary configuration, not application semantics.

## 29. Rollback

Disable exporter/provider via environment/configuration, retain local stdout/error behavior, turn off optional Compose profile, reduce sampling and revert dashboard/alert provisioning. Never roll back by enabling payload capture or bypassing privacy guards.

## 30. Migration plan

1. Approve this proposal and contracts. 2. Add optional local foundation. 3. Standardize structured logs/correlation. 4. Add metrics. 5. Add tracing. 6. Provision dashboards. 7. Add alerts/SLOs. 8. Add health/runtime signals. 9. Add mobile adapter. 10. Add safe AI exports. 11. Apply governance/retention. 12. Certify staging then production provider.

## 31. Alternatives considered

Grafana OSS alone is strong locally but burdensome as an unchosen production platform. Managed OTel is neutral and fits runtime uncertainty. Sentry-centered is attractive for mobile/Web errors but insufficient as the sole API platform and introduces lock-in. Cloud-native is deferred until infrastructure exists. Hybrid is the practical future shape: OTel server platform plus separately approved mobile error provider.

## 32. Consequences

Positive: low lock-in, local development, incremental rollout, safe AI boundary and provider migration. Negative: Collector/local-stack maintenance, dual mobile/server governance and later provider decision. Cost remains unknown until volume baseline.

## 33. Open questions

Production runtime/provider, residency, budget, retention periods, consent/opt-out, mobile provider, named owners/on-call, baseline period and SLO targets.
