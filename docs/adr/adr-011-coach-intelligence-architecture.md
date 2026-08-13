# ADR-011 — Coach Intelligence Architecture

## Status

Accepted

## Context

The AI platform already exposes an internal deterministic `AgentRuntime`, with centralized policy, context orchestration, planning, execution, memory, and observability. That runtime is intentionally internal-first and remains behind feature flags so the public chat contract and mobile contracts stay stable.

The next architectural step is to specialize the coach into domain experts without introducing autonomous reasoning, LLM planning, or tool execution changes.

The next deterministic step after persona is an explainability layer that turns unified coach intelligence into evidence-only structured metadata for prompt assembly. It must not expose hidden reasoning, prompts, or internal policy logic.

## Decision

We introduce an internal `CoachExpert` architecture composed of:

- a common expert contract
- a metadata-first expert registry
- deterministic lookup by intent, domain, and capability
- a deterministic expert router for primary/complementary selection and execution order
- expert selection metadata that feeds policy, planning, and observability
- empty placeholder expert implementations for the initial specialist domains

The initial experts are:

- Workout
- Nutrition
- Recovery
- Goal
- Habit
- Progress
- Motivation

These experts are cataloged for routing and planning only. The first specialists to produce deterministic contributions are the Workout Expert, Nutrition Expert, Recovery Expert, Goal Expert, Habit Expert, Progress Expert, and Motivation Expert. The deterministic Expert Composition Engine then reconciles those structured contributions into unified internal intelligence without changing the public chat contract. The deterministic Coach Persona Engine then translates that unified intelligence into communication guidance for the prompt builder without changing the public chat contract.
The deterministic Explainability Layer then converts unified intelligence and persona guidance into structured evidence for the prompt builder without changing the public chat contract.
The deterministic Expert Observability layer records routing, execution, conflict, health, and retention metadata for the expert pipeline without exposing prompts, replies, or hidden reasoning.

## Rationale

This approach keeps the platform deterministic and safe while reserving room for a multi-expert answer pipeline.

Key reasons:

- internal-first keeps the public API unchanged
- metadata-only experts avoid premature behavior coupling
- deterministic registry and selection logic preserve reproducibility
- policy and planning can reason about specialist coverage without changing the chat response contract
- execution can be introduced later without reworking the routing layer again
- observability can report specialist contribution, conflict, and health metadata without exposing hidden reasoning
- the Workout Expert can contribute deterministic training analysis without changing the public chat contract
- the Nutrition Expert can contribute deterministic nutrition analysis without changing the public chat contract
- the Recovery Expert can contribute deterministic recovery analysis without changing the public chat contract
- the Goal Expert can contribute deterministic goal progression analysis without changing the public chat contract
- the Habit Expert can contribute deterministic behavioral consistency analysis without changing the public chat contract
- the Progress Expert can contribute deterministic longitudinal progress analysis without changing the public chat contract
- the Motivation Expert can contribute deterministic motivational intelligence without changing the public chat contract

## Consequences

### Positive

- the runtime can identify specialist candidates before planning
- the runtime can derive primary, complementary, blocked, and skipped experts before planning
- policy evaluation can authorize or block expert participation deterministically
- planning metadata can describe candidate, selected, and rejected experts
- planning metadata can also carry routed execution order and route validation result
- observability can answer which experts were considered during a run
- the coach platform is ready for expert execution without changing the external chat contract
- the coach platform already has deterministic expert contributions for workout, nutrition, recovery, goal progression, behavioral consistency, longitudinal evolution, and motivational intelligence without changing the external chat contract
- the coach platform can now compose those deterministic contributions into unified internal intelligence without changing the external chat contract
- the coach platform can now translate unified intelligence into deterministic persona guidance without changing the external chat contract
- the coach platform can now produce deterministic evidence-based explanations without changing the external chat contract
- the coach platform can now produce bounded internal observability for expert routing and execution without changing the external chat contract

### Tradeoffs

- the first version adds architectural surface area without changing end-user behavior
- expert routing remains metadata-only until execution support is explicitly introduced in the public surface

## Out of Scope

This ADR does not introduce:

- multi-agent execution
- autonomous reasoning
- recursive planning
- prompt rewriting
- persona simulation
- chain-of-thought exposure
- external tool calling
- mobile-facing expert surfaces

## Relationship to Other ADRs

- [ADR-010 — AI Agent Platform Core Architecture](./adr-010-ai-agent-platform-core-architecture.md)
- [ADR-009 — AI Evaluation Framework, Canary Rollout & Rollback](./adr-009-ai-evaluation-rollout-framework.md)
