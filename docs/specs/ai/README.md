# AI Specs Index

## 1. Overview

O módulo `ai` do Elev9 Coach atualmente cobre uma arquitetura determinística e orientada por contexto para:

- context aggregation
- recovery heuristics
- nutrition awareness
- coach feedback generation
- conversational chat
- explainability
- debugging
- replay

O estado atual do sistema é `deterministic-first`. Não existe integração ativa com LLM no fluxo principal atual. Qualquer evolução para providers externos, prompt orchestration ou memória semântica continua sendo futura.

---

## 2. Architecture Overview

```txt
User data
→ UserHealthContext
→ CoachFeedbackGenerator
→ Recovery & Nutrition Awareness
→ Conversational Chat
→ Conversational Explainability Surfaces
→ Explainability Layer
→ Replay & Debug
```

Hoje, a arquitetura interna do módulo `ai` se apoia principalmente em:

- `BuildUserHealthContextService`
- `GET /ai/context`
- `CoachFeedbackGenerator`
- `CoachFeedback` persistido com metadata interna
- `CoachConversation` e `CoachMessage` persistidos para chat
- endpoints internos de debug e replay

---

## 3. Spec Index

## Core Context

- [build-user-health-context](./build-user-health-context/README.md)
- [get-ai-context](./get-ai-context/README.md)

## Coach Feedback

- [generate-coach-feedback](./generate-coach-feedback/README.md)
- [get-coach-feedback-history](./get-coach-feedback-history/README.md)

## Explainability & Replay

- [get-coach-feedback-debug-history](./get-coach-feedback-debug-history/README.md)
- [replay-coach-feedback](./replay-coach-feedback/README.md)

## Conversational Coaching

- [create-coach-chat](./create-coach-chat/README.md)
- [get-coach-chat-history](./get-coach-chat-history/README.md)

## Conversational Explainability Surfaces

- [get-coach-chat-debug](./get-coach-chat-debug/README.md)
- [get-coach-chat-debug-index](./get-coach-chat-debug-index/README.md)
- [get-coach-chat-debug-history](./get-coach-chat-debug-history/README.md)
- [get-coach-chat-prompt-debug](./get-coach-chat-prompt-debug/README.md)
- [get-coach-chat-reply-path-debug](./get-coach-chat-reply-path-debug/README.md)

---

## 4. ADRs

- [ADR-002 — Recovery & Adaptive Coaching System](../../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../../adr/adr-003-coach-feedback-explainability.md)
- [ADR-004 — Conversational Coach Architecture](../../adr/adr-004-conversational-coach-architecture.md)

---

## 5. Current System Characteristics

O sistema atual do módulo `ai` possui as seguintes características:

- deterministic heuristics instead of probabilistic generation
- safe reduced context for internal orchestration
- no medical claims in recovery interpretation
- internal debug endpoints separated from public coach history
- generator versioning through `COACH_FEEDBACK_GENERATOR_VERSION`
- persisted `influences` for explainability
- persisted `contextSnapshot` for replay compatibility
- conversational chat persistence with deterministic replies
- authenticated, user-scoped internal debug and replay flows
- conversational explainability surfaces for deterministic inspection only

Importante:

- `recoveryTrend` existe em partes internas do sistema, mas não é um campo público de `GET /ai/context`
- `hasTrainingPlan` não é um campo real do `UserHealthContext` atual; a presença de treino ativo é inferida por `activeTrainingPlanId`
- a camada conversacional ainda não usa LLM, streaming, LangGraph, memória semântica, multi-agent routing, replay ou voz
- as superfícies internas de debug conversacional são inspection-only e não expõem raw prompts, raw context ou payloads OpenAI internos completos

---

## 6. Future Directions

Possíveis evoluções arquiteturais futuras, ainda não implementadas:

- LLM orchestration
- prompt versioning
- semantic memory
- evaluation engine
- adaptive recommendations
- wearable integrations
- nutrition intelligence
- conversation replay
- streaming
- voice interface
- multi-agent routing

Esses itens devem ser tratados como roadmap técnico, não como capacidades atuais do sistema.

---

## 7. Summary

`docs/specs/ai/` agora documenta a base atual do módulo `ai` como uma arquitetura contextual, determinística e preparada para explainability e replay, sem depender ainda de LLM para o loop principal de coaching.
