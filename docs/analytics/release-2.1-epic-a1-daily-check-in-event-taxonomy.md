# Release 2.1 — Epic A1 Daily Check-in Event Taxonomy

## Purpose

Measure adoption, completion, abandonment, reliability, and duration of the Daily Check-in product flow without collecting the user's health answers or personal identity.

The implementation is mobile-owned because the relevant facts are user interactions. Backend logs remain technical/domain evidence and are not duplicated as product conversion events.

## Privacy Principles

- Collect what the user did, never how the user physically felt.
- Do not send `energyLevel`, `sleepQuality`, `muscleSoreness`, `motivationLevel`, notes, Recovery scores, readiness scores, or Coach content.
- Do not send raw `userProfileId`, email, name, token, prompts, stack traces, or raw backend messages.
- Use only the event-specific allowlist in `apps/mobile/src/analytics/product-analytics.ts`.
- Use an ephemeral `flowSessionId` only for correlating one in-memory flow visit; it is not derived from the user and is not persisted.
- The default provider is noop. No commercial SDK or external credential is configured by this change.

## Event Naming Convention

Events use lowercase `snake_case`, are independent of UI copy and component names, and represent stable product behavior. The same behavior is not emitted as both a mobile product event and a backend product event.

## Event Catalog

| Event                              | Trigger                                                         | Owner            | Required properties                                                                | Forbidden properties                            |
| ---------------------------------- | --------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `daily_check_in_cta_viewed`        | Dashboard has resolved data and displays the Daily Check-in CTA | Mobile Dashboard | `completionState`, `entryPoint`                                                    | Health signals, identity, Recovery/Coach values |
| `daily_check_in_cta_selected`      | User selects the Dashboard Daily Check-in CTA                   | Mobile Dashboard | `completionState`, `entryPoint`                                                    | Health signals, identity, Recovery/Coach values |
| `daily_check_in_started`           | Today's state has loaded and create/edit mode is known          | Mobile flow      | `mode`, `entryPoint`, `flowSessionId`                                              | Health signals, dates, timezone, identity       |
| `daily_check_in_step_viewed`       | A flow step becomes visible for the first time in the visit     | Mobile flow      | `mode`, `step`, `stepIndex`, `totalSteps`, `flowSessionId`                         | Selected value, answer, health signal           |
| `daily_check_in_step_completed`    | User advances from a question                                   | Mobile flow      | `mode`, `step`, `stepIndex`, `totalSteps`, `flowSessionId`                         | Selected value, answer, health signal           |
| `daily_check_in_submit_started`    | A submit request begins                                         | Mobile flow      | `mode`, `attemptNumber`, `flowSessionId`                                           | Payload, signal values, IDs                     |
| `daily_check_in_submit_succeeded`  | API submission resolves successfully                            | Mobile flow      | `mode`, `attemptNumber`, `durationMs`, `flowSessionId`                             | Check-in response, Recovery, scores, dates      |
| `daily_check_in_submit_failed`     | API submission rejects                                          | Mobile flow      | `mode`, `attemptNumber`, `durationMs`, `errorCategory`, `flowSessionId`            | Raw error, status, response, stack, payload     |
| `daily_check_in_retry_selected`    | User selects retry after a failed submit                        | Mobile flow      | `mode`, `previousErrorCategory`, `attemptNumber`, `flowSessionId`                  | Raw error, payload, health values               |
| `daily_check_in_success_viewed`    | Success state becomes visible                                   | Mobile flow      | `mode`, `flowSessionId`                                                            | Check-in response, scores, Coach content        |
| `daily_check_in_exited`            | User closes the flow while the lifecycle state is reliable      | Mobile flow      | `mode`, `lastStep`, `completed`, `hadUnsavedChanges`, `elapsedMs`, `flowSessionId` | Draft, answers, payload, identity               |
| `daily_check_in_draft_restored`    | A valid local draft or pending intent is restored               | Mobile flow      | `source`                                                                           | Draft values, payload, storage keys             |
| `daily_check_in_queued`            | A submission intent is persisted locally                        | Mobile flow      | `trigger`                                                                          | Payload, answers, identity                      |
| `daily_check_in_sync_started`      | A pending intent begins a sync attempt                          | Mobile sync      | `trigger`, `attemptNumber`                                                         | Payload, answers, storage keys                  |
| `daily_check_in_sync_succeeded`    | A pending intent is confirmed and reconciled                    | Mobile sync      | `trigger`, `attemptNumber`                                                         | Payload, Recovery, dates                        |
| `daily_check_in_sync_failed`       | A sync attempt remains queued or becomes failed                 | Mobile sync      | `trigger`, `attemptNumber`, `errorCategory`                                        | Raw error, payload, answers                     |
| `daily_check_in_pending_discarded` | User explicitly discards a local item                           | Mobile flow      | `source`                                                                           | Draft values, payload, identity                 |

`stepIndex` is zero-based and `totalSteps` is five: energy, sleep quality, muscle soreness, motivation, and review. Review uses `daily_check_in_step_viewed`; no separate review event is emitted.

## Property Definitions

| Property          | Meaning                                           | Allowed values                                                                                               |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `completionState` | State represented by the Dashboard CTA            | `pending`, `completed`                                                                                       |
| `entryPoint`      | Product surface that opened the flow              | `dashboard`, `other`                                                                                         |
| `mode`            | Canonical mode after today's state resolution     | `create`, `edit`                                                                                             |
| `step`            | Stable semantic step identifier                   | `energy`, `sleep_quality`, `muscle_soreness`, `motivation`, `review`                                         |
| `stepIndex`       | Zero-based step position                          | `0`–`4`                                                                                                      |
| `totalSteps`      | Current flow size                                 | `5`                                                                                                          |
| `attemptNumber`   | Submit attempt within the ephemeral flow visit    | Positive integer                                                                                             |
| `durationMs`      | Monotonic client duration for submit              | Non-negative integer                                                                                         |
| `elapsedMs`       | Monotonic client duration from flow start to exit | Non-negative integer                                                                                         |
| `errorCategory`   | Safe UI-level error class                         | `network`, `authentication`, `profile_unavailable`, `validation`, `recovery_processing`, `server`, `unknown` |
| `flowSessionId`   | Ephemeral visit correlation key                   | Random client-generated string                                                                               |
| `source`          | Local item restored or discarded                  | `draft`, `pending`                                                                                           |
| `trigger`         | Safe sync trigger                                 | `manual`, `foreground`, `connectivity`, `initial_load`                                                       |

## Event Owners

Mobile owns interaction and funnel events. The backend continues to own technical logs such as persistence, Recovery rebuild, stale snapshot rejection, and request failures. No server-side `submit_succeeded` product event was added, avoiding double counting.

## Deduplication Rules

- Dashboard CTA viewed is guarded by resolved completion state and a ref, so rerenders do not emit duplicates.
- Flow started emits once per mounted flow session, after create/edit resolution.
- Step viewed is keyed by mode, step, and index within the session; revisiting a step may emit once for that distinct visit key.
- Submit attempts are counted in the flow session and concurrent submit protection remains owned by the existing integration hook.
- Success viewed emits once per session.
- Exit is emitted from the explicit close action; system navigation is not fabricated when the last step is unavailable.
- Analytics provider failures are swallowed and never change form or navigation state.

## Flow Duration Rules

The mobile analytics controller uses `performance.now()` when available and falls back to `Date.now()` for test/runtime compatibility.

- Flow duration: resolved `started` → explicit `exited` or successful completion context.
- Submit duration: submit request start → response or failure.
- Retries create a new submit attempt and duration; the original failure remains a separate event.
- Backgrounding does not create completion or exit automatically. No offline persistence or timer survives unmount.

## Offline Extension

Offline events use the same allowlist and noop provider as the online funnel. They describe transport state only; they never contain the four check-in values, local dates, timezone, Recovery, or identity. A queued event is not a successful submission event.

## Error Categories

The existing UI error mapper is translated to a product-safe category. Raw API messages, HTTP status, stack traces, and payloads are never passed to analytics. `unknown` is the safe fallback.

## Consent and Enablement

No consent or analytics opt-out infrastructure was found in the repository. For that reason, the exported default `productAnalytics` is a disabled noop. A future provider must be injected through `createProductAnalytics(provider, enabled)` only after formal consent, regional policy, environment configuration, and retention decisions exist. This change does not activate external collection.

## Provider Strategy

```text
ProductAnalytics interface
        ↓
SafeProductAnalytics (allowlist + failure isolation)
        ↓
NoopProductAnalytics by default
        ↓
Future provider adapter after privacy approval
```

No Mixpanel, Amplitude, PostHog, Firebase, Segment, advertising ID, session replay, or external credential was added.

## Analytics versus Observability

| Concern                              | System                              | Example                                         |
| ------------------------------------ | ----------------------------------- | ----------------------------------------------- |
| User started check-in                | Product Analytics                   | `daily_check_in_started`                        |
| HTTP request failed                  | Technical Observability             | Existing mobile/API error logs                  |
| Daily check-in persisted             | Domain/Application                  | Existing Progress use-case result/log           |
| Recovery stale detected              | Technical Observability             | Existing `recovery_stale_snapshot_rejected` log |
| Coach deterministic decision rebuilt | Technical Observability/Application | Existing Coach use-case path                    |

## Validation Queries

These are provider-neutral definitions for a future analytics warehouse or dashboard:

- CTA conversion: `count(daily_check_in_cta_selected) / count(daily_check_in_cta_viewed)` grouped by `completionState`.
- Flow completion: `count(daily_check_in_submit_succeeded) / count(daily_check_in_started)` grouped by `mode` and `entryPoint`.
- Step abandonment: sessions with `step_viewed` and no subsequent `step_completed` or successful submit, grouped by `step`.
- Submit reliability: `count(submit_succeeded) / count(submit_started)`.
- Retry rate: `count(retry_selected) / count(submit_failed)`.
- Edit rate: `count(started where mode=edit) / count(all started)`.
- Median completion time: median `durationMs` for successful submits, grouped by app version after provider metadata is available.

No external dashboard or warehouse was created in this prompt.

## Retention Recommendations

- Keep raw interaction events for the shortest period necessary to diagnose adoption and reliability, subject to formal privacy policy.
- Prefer aggregated funnel and duration metrics for longer-term product decisions.
- Keep technical logs under their existing operational retention and never merge them with product event payloads.
- Do not retain health answers through analytics; they are excluded at event construction and runtime allowlist validation.
- Obtain formal legal/privacy review before enabling any external provider for a health and wellness product.

## Rollout Checklist

- Define consent and opt-out behavior.
- Define regional and environment enablement.
- Select and review a provider adapter.
- Confirm retention/deletion policy.
- Validate event volume and duplicate rates in a non-production environment.
- Run privacy tests and payload inspection before activation.
- Add provider-specific app-version metadata without adding identity or health data.
