# Release 2.2 — Epic P1 Observability Foundation Runbook

## 1. Purpose

Operate the vendor-neutral API observability foundation added by Prompt 2. This runbook covers configuration, the optional local Collector and failure-safe behavior. It does not cover dashboards, metrics, structured logging or domain tracing.

## 2. Local setup

The API remains usable with observability disabled. To start the optional Collector:

```bash
docker compose --profile observability up otel-collector
```

For the API container, use `OBSERVABILITY_OTLP_ENDPOINT=http://otel-collector:4318`. For an API running on the host, use `http://localhost:4318`.

## 3. Environment variables

| Variable                             | Default                        | Notes                                          |
| ------------------------------------ | ------------------------------ | ---------------------------------------------- |
| `OBSERVABILITY_ENABLED`              | `false`                        | Must be explicitly `true` to initialize OTel   |
| `OBSERVABILITY_SERVICE_NAME`         | `elev9-api`                    | Safe static name                               |
| `OBSERVABILITY_SERVICE_VERSION`      | package/build fallback         | No Git command at runtime                      |
| `OBSERVABILITY_ENVIRONMENT`          | `local`                        | `local`, `test`, `ci`, `staging`, `production` |
| `OBSERVABILITY_OTLP_ENDPOINT`        | local HTTP endpoint in example | Used only when enabled                         |
| `OBSERVABILITY_EXPORT_PROTOCOL`      | `http`                         | `http` or `grpc`                               |
| `OBSERVABILITY_EXPORT_TIMEOUT_MS`    | `3000`                         | Bounded 100–30000 ms                           |
| `OBSERVABILITY_SHUTDOWN_TIMEOUT_MS`  | `5000`                         | Bounded 100–30000 ms                           |
| `OBSERVABILITY_RESOURCE_ATTRIBUTES`  | empty                          | Only `service.namespace=...` is allowlisted    |
| `OBSERVABILITY_DIAGNOSTIC_LOG_LEVEL` | `error`                        | Allowlisted diagnostic level                   |

## 4. Enabled and disabled modes

`false` selects the noop provider and makes no exporter/network call. `true` without an endpoint selects `enabled_without_exporter` for controlled tests. `true` with a valid endpoint selects `enabled_with_otlp`. Invalid values fail configuration explicitly without echoing secrets. Collector unavailability is not a startup dependency.

## 5. Collector startup

The Collector receives OTLP HTTP on `127.0.0.1:4318` and gRPC on `127.0.0.1:4317`, applies memory limiting and batching, exposes health on `127.0.0.1:13133`, and exports only to a local debug exporter. No external backend or credential is configured.

## 6. Health validation

```bash
docker compose --profile observability config --quiet
curl -fsS http://127.0.0.1:13133/
```

The Collector health state is diagnostic only. API readiness must not depend on Collector readiness.

## 7. Troubleshooting

- API starts with `OBSERVABILITY_ENABLED=false`: expected baseline.
- API starts but telemetry state is degraded: inspect configuration and Collector reachability; product behavior remains available.
- Invalid endpoint: correct scheme/host/path; credentials, query strings and fragments are rejected.
- No traces in local debug output: confirm enabled mode, container/host endpoint distinction and Collector profile.
- Shutdown log reports timeout: telemetry flush was bounded; investigate only after preserving API shutdown.

## 8. Export failures

Export errors are bounded and non-critical. There are no infinite retries. Do not increase diagnostic logging to include payloads, headers, prompts or responses.

## 9. Shutdown

Nest shutdown hooks invoke provider shutdown. The SDK is given the configured bounded timeout; timeout or exporter failure does not block process termination indefinitely.

## 10. Privacy constraints

Allowed resource attributes: `service.name`, `service.version`, `deployment.environment`, and optional `service.namespace`. W3C trace context is allowed as context, not as a resource or metric label. Baggage is not registered by the current propagator.

## 11. Allowed attributes

Static service/environment/release metadata only. Prompt 3+ must add separate allowlists for logs, metrics and spans before adding attributes.

## 12. Forbidden attributes

User, tenant and profile IDs; request/trace/span IDs as resource attributes; email, tokens, authorization, cookies, prompts, messages, Coach content, nutrition/health facts, payloads, secrets and arbitrary environment variables.

## 13. CI usage

Unit tests use fake exporters and do not require a Collector or credentials. CI must not export telemetry externally. Compose config validation is safe to run without starting services.

## 14. Rollback

Set `OBSERVABILITY_ENABLED=false` and stop the optional profile. Remove only the Prompt 2 module/configuration changes if a code rollback is required; do not alter business modules or public API contracts.

## 15. Known limitations

No structured logging, metrics, domain spans, dashboards, alerts, SLOs, Mobile provider, Web provider or production backend is implemented. Collector validation may be environment-blocked if Docker image pull/daemon access is unavailable.
