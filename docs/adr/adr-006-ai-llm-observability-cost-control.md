# ADR-006 — AI LLM Observability & Cost Control

## Status

Accepted

## Context

The Elev9 Coach backend already had a deterministic coach layer, optional OpenAI integration, safety controls, and a reliability layer. That was sufficient for product behavior, but not yet sufficient for operating the system in production.

The team needed to answer operational questions such as:

- how many LLM requests were made
- how often the system fell back to deterministic responses
- what the average latency was
- how many tokens were used
- what the estimated cost was
- how often safety or circuit breaker controls intervened

This had to be added without changing the public API, mobile contracts, or user-visible behavior.

## Decision

Introduce an internal observability and cost-control layer between the reliability layer and the provider.

The layer is responsible for:

- request lifecycle tracing
- token accounting using provider usage when available
- estimated cost calculation from configurable pricing
- structured operational logs
- per-day usage aggregation
- cost guardrails for prompt size, completion size, and estimated request cost
- bounded in-memory retention for lifecycle traces and usage reports
- extension points for future metrics backends

The layer does not:

- store raw prompts
- store user messages
- expose internal operational metadata to mobile
- alter the deterministic fallback path
- change any public endpoint or contract

## Pipeline Position

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

## Consequences

### Positive

- production operators can inspect request volume, latency, token usage, and estimated cost
- cost guardrails reduce the risk of uncontrolled spend
- metrics interfaces can later be wired to OpenTelemetry, Datadog, Prometheus, or another backend without reworking the request flow
- structured logs improve incident triage while preserving privacy boundaries
- observability state remains bounded in memory through configurable trace and report retention limits

### Negative

- the LLM path now has more internal bookkeeping
- request handling includes one more internal boundary
- operational state must stay carefully separated from user-facing state
- older trace and report snapshots are pruned instead of retained indefinitely

## Trade-offs

The implementation favors a small internal aggregation layer over external telemetry dependencies.

That keeps the architecture simple today while preserving a clear integration point for production observability platforms later.

## Future Extensions

This ADR leaves room for:

- OpenTelemetry exporters
- Datadog or Prometheus sinks
- request tracing across services
- richer usage reporting
- per-model budget policies
- alerting and SLO monitoring

These are future operational enhancements, not current product behavior.
