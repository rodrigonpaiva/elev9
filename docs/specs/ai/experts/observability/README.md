# Expert Observability

## 1. Overview

`CoachExpertObservabilityService` is the internal-only observability layer for Coach experts.

It records deterministic metadata about expert routing, execution, conflicts, contribution summaries, health, and retention without exposing prompts, replies, user messages, or hidden reasoning.

This layer exists for engineering, monitoring, debugging, and production operations only.

---

## 2. Responsibilities

The service captures:

- candidate experts
- routed experts
- executed experts
- skipped experts
- blocked experts
- failed experts
- per-expert execution summaries
- aggregated contribution summaries
- conflict summaries
- health summaries
- bounded latency summaries
- bounded retention metadata

It does not capture:

- prompts
- chain-of-thought
- LLM replies
- user messages
- policy internals
- routing internals exposed to the public

---

## 3. Trace Model

The trace is immutable once published and stores:

- `traceId`
- `requestId`
- `intent`
- `selectedDomains`
- `candidateExpertIds`
- `routedExpertIds`
- `executedExpertIds`
- `skippedExpertIds`
- `blockedExpertIds`
- `failedExpertIds`
- `primaryExpert`
- `participatingExperts`
- `supportingExperts`
- `executionSummaries`
- `contributionSummary`
- `latencySummary`
- `conflicts`
- `metrics`
- `metadata`
- `status`
- `createdAt`
- `updatedAt`

---

## 4. Metrics Model

Per expert, the trace records:

- `expertId`
- `executionStatus`
- `selected`
- `executed`
- `duration`
- `contributionCount`
- `recommendationCount`
- `riskCount`
- `confidence`
- `conflicts`
- `missingEvidence`
- `timestamp`

Aggregated metrics include:

- total / selected / executed / skipped / blocked / failed expert counts
- average and total expert latency
- highest risk expert
- highest confidence expert
- primary expert
- composition, persona, and explainability durations

---

## 5. Retention

Retention is bounded by:

- `AI_EXPERT_TRACE_MAX_ITEMS`
- `AI_EXPERT_TRACE_RETENTION_MS`

Defaults:

- `1000`
- `86400000`

Traces are pruned by TTL first, then by max count.

---

## 6. Runtime Integration

The runtime starts the expert trace after routing and completes it after the expert pipeline finishes.

The trace is internal only and never changes public APIs or mobile contracts.

---

## 7. Privacy Guarantees

The layer never persists:

- prompts
- replies
- user messages
- chain-of-thought
- OpenAI outputs
- hidden policies

It only stores deterministic metadata needed for operations.

---

## 8. Related Docs

- [AI Specs Index](../../README.md)
- [Expert Composition](../composition/README.md)
- [Coach Persona](../../persona/README.md)
- [Explainability](../../explainability/README.md)
- [Create Coach Chat](../../create-coach-chat/README.md)
- [Release Readiness](../../release-readiness/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../../adr/adr-011-coach-intelligence-architecture.md)
