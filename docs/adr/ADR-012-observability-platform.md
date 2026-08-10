# ADR-012 — Observability Platform

## Title

Vendor-neutral, OTLP-based observability foundation for Elev9 Coach.

## Status

Foundation: `Accepted`  
Production backend and deferred governance choices: `Proposed` / deferred

## Date

2026-08-05

## Context

Elev9 has local request correlation, stdout/Nest logging, health/readiness, bounded domain metrics/logs, internal AI traces and a disabled mobile analytics provider. It has no exporter, collector, external backend, dashboard, alerting or incident routing. Production runtime is undecided and the product handles health/nutrition-sensitive data.

## Problem

The project needs API metrics, logs and traces; mobile crash visibility; safe AI operational signals; local development without cloud credentials; and a path to staging/production without premature vendor lock-in or payload leakage.

## Decision drivers

- Runtime and cloud provider are not selected.
- Local development must be independent of cloud credentials.
- Mobile needs native crash/release visibility.
- AI requires safe latency/reliability/cost signals without content capture.
- The team has no confirmed SRE/on-call capacity.
- Health-data minimization and GDPR governance are mandatory.
- Incremental adoption is more important than a large first deployment.

## Considered options

1. Grafana OSS stack as the full platform: excellent local control, high operational burden and no mobile crash solution.
2. OpenTelemetry + OTLP with managed backend later: best neutral foundation and runtime fit.
3. Sentry-centered: strong app errors/releases, incomplete as the sole API platform and provider lock-in.
4. Cloud-vendor-native: deferred because the runtime/cloud is not decided.
5. Hybrid: OTel server platform, local Grafana stack and separate mobile error provider.

## Decision

Adopt the architecture described by Option 2 as the server foundation, with Option 5 as the eventual deployment shape. OpenTelemetry is the instrumentation standard; OTLP is the application/provider boundary; Collector is the routing layer; Grafana OSS components are local reference backends. Do not select a production vendor in this ADR. The foundation decision is accepted; a Sentry-class mobile provider remains a separate evaluation.

## Architecture

```text
API instrumentation and safe logger
        -> OTLP
        -> optional Collector
        -> local OSS backends or future managed backend
        -> dashboards/alerts/incident response

Mobile/Web errors -> separately approved provider adapter
Product events   -> separately governed consented analytics adapter
```

## Security implications

Allowlist fields, redact before export, prohibit secrets/headers/cookies/payloads and enforce bounded labels. Central backends require role-based access, auditability and environment separation. Collector/provider configuration must not weaken application privacy boundaries.

## Privacy implications

Prompts, user messages, Coach responses, memory, fitness/nutrition/health facts and direct identity are forbidden from logs, metrics, traces, analytics, alerts and incident notifications. Product analytics remains separate and noop until consent/provider/retention approval. Final GDPR deletion and retention policy is a follow-up decision.

## Operational implications

The local stack adds optional operational burden. Collector failure must be fail-open. Production operations require named roles, dashboards, alerts, runbooks and on-call decisions that do not yet exist.

## Cost implications

No financial estimate is justified without volume. Main drivers are log volume, metric series/cardinality, trace sampling, AI metadata, mobile error events, query load and retention. Provider selection must include budget controls.

## Consequences

Positive: provider portability, local credential-free development, incremental delivery and safe separation of signals. Negative: a Collector/local stack to maintain, separate mobile provider governance and unresolved production choices.

## Risks

- Mixed legacy logs may leak direct profile context if centralized unchanged.
- Future metric labels may create high cardinality.
- AI diagnostics may accidentally capture content.
- No formal owner/on-call may leave alerts unactioned.
- Runtime/provider uncertainty may delay production rollout.

## Migration

Prompt 2 implements the safe API foundation, OTLP boundary and optional local Collector. Continue with structured logging, metrics, traces, dashboards, alerts/SLOs, health/runtime, mobile, AI, governance and certification.

## Rollback

Disable exporter/provider and optional Compose profile; preserve safe local logging and product behavior. Revert configuration/provisioning only. Never bypass redaction or activate payload capture as a rollback.

## Follow-up decisions

Production runtime/backend, mobile provider, retention periods, consent/opt-out, budget, data residency, named owners/on-call and numeric SLO targets remain deferred. They do not block the accepted vendor-neutral foundation.
