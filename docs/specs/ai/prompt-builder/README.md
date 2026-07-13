# Prompt Builder Specification

## 1. Overview

The prompt builder is the deterministic assembly layer that turns internal coach context into the final LLM prompt.

It does not generate responses, does not call OpenAI, and does not perform expert routing, expert composition, or persona selection.

Its job is to assemble the final prompt from canonical internal inputs.

---

## 2. Inputs

The prompt builder consumes:

- `UserHealthContext`
- conversation history
- conversation memory
- coach decision context
- notification context
- habit context
- personalization context
- `UnifiedCoachIntelligence`
- `CoachPersonaGuidance`
- `CoachExplanation`

The prompt builder remains backward compatible with existing composition inputs while supporting the new unified intelligence and persona layers.

---

## 3. Prompt Assembly

The builder assembles the prompt in a fixed order:

1. system instructions
2. user health context
3. unified coach intelligence
4. persona guidance
5. coach explanation
6. canonical notification context
7. conversation memory
8. canonical coach decision context
9. canonical personalization context
10. canonical habit context
11. conversation history
12. current user message

The builder does not rewrite or recalculate expert outputs.

---

## 4. Persona Integration

Persona guidance is rendered as structured system content so the LLM can adapt tone, verbosity, focus, directive level, empathy, encouragement, technical depth, urgency, celebration level, and safety posture.

If persona guidance is absent, the builder falls back to the existing default prompt behavior.

Coach explanation is rendered as canonical evidence context and never as hidden reasoning.

---

## 5. Unified Intelligence Integration

Unified coach intelligence is rendered as canonical structured context.

The builder preserves:

- primary expert
- participating experts
- summary
- key findings
- recommendations
- risks
- confidence
- conflicts
- supporting experts
- metadata

---

## 6. Related Docs

- [AI Specs Index](../README.md)
- [Coach Persona](../persona/README.md)
- [Explainability](../explainability/README.md)
- [Expert Composition](../experts/composition/README.md)
- [Agent Execution](../agent-execution/README.md)
- [Create Coach Chat](../create-coach-chat/README.md)
