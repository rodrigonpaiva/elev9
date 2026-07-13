# Explainability Specification

## 1. Overview

`CoachExplainabilityService` is the deterministic internal layer that turns unified coach intelligence and persona guidance into structured evidence for the prompt builder.

It explains evidence, not reasoning. It does not expose chain-of-thought, hidden prompts, internal planning, LLM traces, or hidden policy rules.

---

## 2. Responsibilities

The explainability layer consumes:

- `UnifiedCoachIntelligence`
- `CoachPersonaGuidance`
- expert routing metadata
- expert composition metadata
- runtime metadata
- policy metadata

It produces deterministic structured explanation objects containing:

- evidence
- decision reasons
- recommendation reasons
- risk explanations
- confidence explanation
- conflict explanations
- missing evidence
- metadata

---

## 3. Evidence Model

Evidence is structured, traceable, and immutable.

Evidence fields:

- `type`
- `source`
- `expert`
- `importance`
- `confidence`
- `availability`
- `metadata`

Evidence availability:

- `AVAILABLE`
- `PARTIAL`
- `MISSING`

Evidence importance:

- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`

---

## 4. Recommendation Explanation

Recommendation explanations preserve deterministic recommendation codes and attach evidence and expert attribution.

Each explanation contains:

- `recommendationCode`
- `supportingEvidence`
- `supportingExperts`
- `priority`
- `reasonCategory`

Reason categories are code-only:

- `SAFETY`
- `RECOVERY`
- `PERFORMANCE`
- `CONSISTENCY`
- `PROGRESS`
- `GOALS`
- `NUTRITION`
- `WORKOUT`

Blocked recommendations are filtered out and never resurrected.

---

## 5. Risk Explanation

Risk explanations remain deterministic and preserve source experts.

Risk levels:

- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`
- `UNKNOWN`

Each risk explanation contains:

- `riskLevel`
- `supportingEvidence`
- `supportingExperts`
- `severity`
- `metadata`

The unified risk level follows the highest applicable level across evidence and composition inputs.

---

## 6. Confidence Explanation

Confidence is derived from deterministic inputs only:

- supporting evidence count
- supporting expert count
- policy restrictions
- missing evidence

Returned levels:

- `LOW`
- `MEDIUM`
- `HIGH`

The layer never averages or invents confidence.

---

## 7. Conflict Explanation

Conflicts are surfaced as structured deterministic outcomes.

Each conflict contains:

- `conflictType`
- `experts`
- `resolution`
- `resolvedBy`
- `severity`
- `metadata`

Conflicts are not hidden and are not auto-resolved by an LLM.

---

## 8. Missing Evidence

The layer identifies missing or incomplete data without fabricating it.

Examples include:

- recovery check-in missing
- workout history unavailable
- nutrition logs unavailable
- goal history missing
- progress history incomplete

Missing evidence is returned as structured objects only.

---

## 9. Runtime Integration

The internal flow is:

```txt
Experts
↓
Composition Engine
↓
UnifiedCoachIntelligence
↓
Coach Persona Engine
↓
Explainability Layer
↓
Structured Explanation
↓
Prompt Builder
↓
LLM
```

The prompt builder consumes:

- `UnifiedCoachIntelligence`
- `CoachPersonaGuidance`
- `CoachExplanation`

---

## 10. Safety Guarantees

The explainability layer must never expose:

- chain-of-thought
- hidden prompts
- internal planning steps
- hidden policy details
- LLM reasoning

It respects blocked experts, blocked recommendations, blocked domains, and safety restrictions without revealing blocked information.

---

## 11. Related Docs

- [AI Specs Index](../README.md)
- [Coach Persona](../persona/README.md)
- [Expert Composition](../experts/composition/README.md)
- [Expert Observability](../experts/observability/README.md)
- [Prompt Builder](../prompt-builder/README.md)
- [Create Coach Chat](../create-coach-chat/README.md)
- [ADR-011 — Coach Intelligence Architecture](../../../adr/adr-011-coach-intelligence-architecture.md)
