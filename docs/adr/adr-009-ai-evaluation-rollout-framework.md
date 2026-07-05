# ADR-009 — AI Evaluation Framework, Canary Rollout & Rollback

## Status

Accepted

## Context

The Elev9 Coach backend already runs with a deterministic-first AI architecture, optional OpenAI-assisted chat, safety controls, reliability controls, observability controls, structured outputs, and streaming infrastructure.

As prompt and model usage matured, the team needed a way to:

- version prompts explicitly
- compare prompt and model behavior before broad rollout
- assign users deterministically to canary buckets
- roll back to previous prompt and provider versions through configuration only
- keep experiment metadata internal to the backend

This had to be added without changing the public API, mobile contracts, or the user-visible coaching flow.

## Decision

Introduce an internal evaluation and rollout framework around the existing AI pipeline.

The framework includes:

- a prompt version registry with current and previous versions
- deterministic canary assignment based on user identity hashing
- a golden-prompt evaluation dataset for internal regression checks
- an evaluation runner that exercises the current chat pipeline and records safety, fallback, latency, token, and cost observations
- rollback-ready provider and model selection through configuration
- centralized feature flags for streaming, structured outputs, prompt selection, provider selection, and future AI capabilities
- experiment metadata attached to internal AI requests for traceability

The framework remains internal. It does not change the public `POST /ai/chat` contract, the mobile experience, or the deterministic fallback behavior.

## Pipeline Position

Request-time execution still follows the normal production chain:

```txt
Controller
→ Use Case
→ Prompt Builder
→ Safety Layer
→ Reliability Layer
→ Observability Layer
→ Provider
→ OpenAI
```

The evaluation runner is an internal operator-facing service that reuses the same prompt, safety, reliability, and observability components to score prompt versions before broader rollout.

## Consequences

### Positive

- prompt versions become explicit and auditable
- canary rollout becomes deterministic and repeatable
- prompt or provider rollback can be done through configuration changes
- internal evaluations can detect regressions before wider exposure
- experiment metadata improves traceability without leaking internal state to mobile

### Negative

- the AI module now has more governance state to maintain
- prompt and provider selection require careful config validation
- evaluation artifacts must stay isolated from user-facing behavior

## Trade-offs

The framework favors internal determinism over dynamic experimentation.

That keeps rollout behavior simple, avoids hidden randomness, and makes rollback safe. The trade-off is that prompt governance is more explicit and must be maintained alongside the codebase.

## Future Extensions

This ADR leaves room for:

- richer evaluation datasets
- automated regression scoring
- experiment comparisons across prompt families
- model A/B analysis
- prompt approval workflows
- operator dashboards for rollout status

These are future governance enhancements, not current product behavior.
