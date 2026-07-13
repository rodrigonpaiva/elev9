# Internal Spec - Agent Multi-Step Execution Engine

## 1. Overview

The `AgentExecutionEngine` is the deterministic internal layer that runs a validated plan through ordered execution steps.

It exists to keep the agent bounded and debuggable while preserving the existing public chat contract.

This layer is internal-only and does not introduce recursive planning, autonomous reasoning, parallel execution, or tool-calling protocols.

The engine consumes policy decisions produced by the centralized governance layer before any step can be executed.

---

## 2. Execution Model

The engine runs a fixed, ordered sequence of steps derived from the validated plan:

- `LOAD_CONTEXT`
- `EXECUTE_TOOL`
- `UPDATE_MEMORY`
- `BUILD_PROMPT`
- `CALL_LLM`
- `GENERATE_FALLBACK`
- `PERSIST_MESSAGES`
- `UPDATE_CONVERSATION_MEMORY`
- `COMPLETE`

Steps are explicit and sequential.

The engine:

- updates working memory after each step
- stops on critical failure
- keeps the current runtime state internal
- preserves the existing public response payload
- respects the policy engine's allow/deny decisions for tools, LLM usage, fallback, cost, and latency
- passes unified coach intelligence and persona guidance to the prompt builder when available

## 3. Agent Trace Model

Every execution emits an internal trace that records:

- detected intent
- candidate and selected coach experts as metadata-only routing context
- routed primary expert, complementary experts, ordered experts, blocked experts, and skipped experts
- composition metadata, unified recommendations, unified risks, unified confidence, and conflict summaries
- persona guidance metadata for tone, focus, verbosity, urgency, and safety
- selected context domains
- policy evaluation snapshots
- plan creation and validation
- tool selection and tool results summaries
- step start, completion, and failure events
- memory snapshot metadata
- fallback usage and final execution status

The trace is bounded by count and TTL, stores sanitized metadata only, and is not exposed to mobile clients.

Release gating for the agent runtime is documented in the internal release-readiness checklist:

- [Release Readiness](../release-readiness/README.md)

---

## 4. Execution Lifecycle

Tracked lifecycle events:

- `START`
- `STEP_START`
- `STEP_COMPLETE`
- `STEP_SKIP`
- `STEP_FAIL`
- `MEMORY_UPDATE`
- `SNAPSHOT`
- `COMPLETE`
- `ABORT`

These are internal observability signals only.

---

## 5. Deterministic Boundaries

The engine is intentionally not:

- recursive
- self-modifying
- autonomous
- parallel
- public API facing

It only executes the already validated plan snapshot.

---

## 6. Related Docs

- [AI Specs Index](../README.md)
- [Create Coach Chat](../create-coach-chat/README.md)
- [Agent Planning](../agent-planning/README.md)
- [Expert Router](../experts/router/README.md)
- [Expert Composition](../experts/composition/README.md)
- [Coach Persona](../persona/README.md)
- [Prompt Builder](../prompt-builder/README.md)
- [Agent Memory Layer](../agent-memory/README.md)
- [Release Readiness](../release-readiness/README.md)
- [ADR-010 — AI Agent Platform Core Architecture](../../../adr/adr-010-ai-agent-platform-core-architecture.md)
