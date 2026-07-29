# Nutrition Observability Runbook

## Objective

Diagnose Nutrition availability, latency, contract and integration failures without querying Nutrition payloads or individual user behavior.

## Safe signals

Use only `operation`, `outcome`, `availability`, `freshness`, `contractVersion`, `durationBucket`, `safeErrorCode`, `environment`, `releaseChannel` and `platform`. Never query calories, macros, meals, foods, targets, focus, insight, adherence, restrictions or identifiers.

## Processing failures

1. Check `nutrition_today_load_failure` by safe error code.
2. Compare API release channel and contract version.
3. Check latency buckets and database health.
4. Run deterministic engine and contract tests.
5. Roll back the Nutrition application release if the failure is release-correlated.

## Contract failures

Confirm contract version and consumer, compare API/shared type versions, stop rollout, patch the mapper and run contract/privacy tests. Do not inspect or export response payloads.

## Stale or legacy increase

Compare aggregate freshness by release channel and review read-model compatibility deployments. Do not alert on isolated legacy records without an approved baseline.

## Dashboard failures

Check safe mobile load and retry events, compare platform/release channel, then check endpoint success and latency. Analytics provider failure must not affect the UI.

## Coach failures

Check `nutrition_coach_context_failure` and `NUTRITION_CONTEXT_UNAVAILABLE`. Confirm other Health Context domains remain independent and deterministic fallback remains active. Do not inspect conversation or Nutrition context content.

## Privacy incident response

```text
detect
→ stop affected export/instrumentation
→ preserve minimal safe evidence
→ assess scope
→ notify incident commander, security owner and privacy owner
→ delete improperly collected data
→ rotate credentials if applicable
→ patch and add allowlist tests
→ validate
→ document post-incident review
```

Check logs, traces, analytics, errors, dashboards, exports and backups for prohibited fields. Never copy suspected payloads into tickets.

## Rollback, retention and escalation

Disable telemetry at its provider/configuration boundary if necessary; product behavior must continue. Do not enable LLM as mitigation. The repository has no unified telemetry retention policy; external collection remains disabled by default until consent, deletion and retention governance are approved. Escalate technical failures to the service owner, privacy concerns to the privacy owner and release regressions to the incident commander.
