# AI Release Readiness

## 1. Purpose

This checklist defines the internal readiness gate for enabling the AI Agent Platform behind feature flags.

It is intentionally operational, not product-facing.

The goal is to prevent partial activation, preserve deterministic fallback behavior, and make rollout and rollback explicit.

Final certification evidence for the current platform release is recorded in [final-certification](./final-certification.md).

---

## 2. Feature Flags

Verify the following before enabling the agent runtime in production:

- `AI_AGENT_RUNTIME_ENABLED`
- `AI_AGENT_TOOLS_ENABLED`
- `AI_LLM_ENABLED`
- `AI_LLM_STREAMING_ENABLED`

Rules:

- disabled mode must continue to behave like the current production chat path
- no partial activation is allowed
- tool execution must remain off unless both runtime and tool flags are enabled
- streaming must remain additive and optional

---

## 3. Rollout Order

Recommended rollout order:

1. keep agent runtime disabled
2. validate deterministic config parsing and fallback paths
3. enable agent runtime in a small internal environment
4. validate policy evaluation and planning snapshots
5. enable read-only tools for a controlled slice
6. validate observability, retention, and memory cleanup
7. expand rollout gradually with canary checks

---

## 4. Rollback Strategy

Rollback must be configuration-only.

Steps:

- disable `AI_AGENT_TOOLS_ENABLED` first if tool behavior is suspect
- disable `AI_AGENT_RUNTIME_ENABLED` to return fully to the existing chat flow
- disable `AI_LLM_ENABLED` if provider-backed responses require isolation
- leave fallback paths intact during rollback

Rollback should not require database migrations or public contract changes.

---

## 5. Monitoring

Monitor the following internal signals:

- policy rejections
- fallback usage
- tool execution failures
- execution step failures
- expert observability failures
- trace retention pruning
- memory expiration events
- LLM timeout and retry behavior

No external observability dependency is introduced in this phase.

---

## 6. Verification

Before enabling broader traffic, verify:

- safety still rejects unsafe requests
- evaluation runner baselines remain stable
- deterministic fallback still works when LLM is disabled or unavailable
- planning remains bounded and deterministic
- execution does not recurse or loop
- traces and memory stores stay bounded
- expert observability traces stay bounded and privacy-safe
- tool execution remains read-only

---

## 7. Performance and Cost

Check:

- planning duration
- execution duration
- tool execution duration
- LLM duration when enabled
- estimated tool cost
- estimated tool latency

The runtime should stay within configured limits and fail closed when thresholds are exceeded.

---

## 8. Manual Smoke Tests

Minimum smoke tests:

- disabled runtime returns the existing chat behavior
- enabled runtime still returns the same public response shape
- tools remain skipped when disabled
- fallback still works when provider-backed generation is unavailable
- traces are created and retained within bounds
- memory cleanup occurs after execution

---

## 9. Related Docs

- [AI Specs Index](../README.md)
- [Create Coach Chat](../create-coach-chat/README.md)
- [Agent Execution](../agent-execution/README.md)
- [Agent Memory](../agent-memory/README.md)
- [ADR-010 — AI Agent Platform Core Architecture](../../../adr/adr-010-ai-agent-platform-core-architecture.md)
