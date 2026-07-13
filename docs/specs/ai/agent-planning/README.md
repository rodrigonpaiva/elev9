# Internal Spec - Agent Planning Layer

## 1. Overview

The `AgentPlanningEngine` is the deterministic internal layer that converts intent, selected context, policy decisions, and routed coach experts into a validated immutable plan.

It exists to keep the agent bounded and debuggable while preserving the existing public chat contract.

The planning layer does not compose the final coach response, does not call OpenAI directly, and does not mutate domain data.

---

## 2. Planning Model

The planner consumes:

- detected intent
- selected context domains
- candidate coach experts
- routed coach experts
- candidate tools
- selected tools
- policy evaluation

It emits a frozen plan containing:

- execution strategy
- ordered planning steps
- expert routing metadata
- expert priorities
- expert capabilities
- selected tools
- validation status

---

## 3. Expert Routing Metadata

The plan carries the routed expert snapshot forward as immutable metadata:

- `candidateExperts`
- `selectedExperts`
- `expertRouting.primaryExpert`
- `expertRouting.complementaryExperts`
- `expertRouting.orderedExperts`
- `expertRouting.blockedExperts`
- `expertRouting.skippedExperts`
- `compositionHints`
- `compositionPolicy`

This keeps routing, planning, execution, and observability aligned without re-running routing logic.

---

## 4. Validation Model

The validator normalizes and freezes the plan, then rejects invalid plans when:

- the plan has no intent
- the plan has no required context
- the plan has no selected tools
- the plan has no planning steps
- the execution depth is invalid
- routed experts and selected experts are inconsistent

---

## 5. Execution Integration

The validated plan becomes the execution snapshot for the runtime.

The execution engine consumes the plan in order and never re-plans recursively.

---

## 6. Related Docs

- [AI Specs Index](../README.md)
- [Expert Router](../experts/router/README.md)
- [Expert Composition](../experts/composition/README.md)
- [Agent Execution](../agent-execution/README.md)
- [Create Coach Chat](../create-coach-chat/README.md)
- [ADR-010 — AI Agent Platform Core Architecture](../../../adr/adr-010-ai-agent-platform-core-architecture.md)
- [ADR-011 — Coach Intelligence Architecture](../../../adr/adr-011-coach-intelligence-architecture.md)
