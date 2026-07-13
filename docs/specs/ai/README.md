# AI Specs Index

## 1. Overview

O módulo `ai` do Elev9 Coach atualmente cobre a camada de coaching contextual para:

- coach decision generation
- coach feedback generation
- conversational coaching
- internal agent runtime foundation
- daily briefing
- memory timeline
- explainability
- debugging
- replay

Além disso, o módulo já inclui governança interna para:

- registry de versões de prompt
- rollout canário determinístico
- rollback por configuração
- evaluation runner interno
- metadata de experimento/rollout para requests de LLM

O estado atual do sistema continua `deterministic-first`, mas o fluxo principal de chat já possui integração opcional com OpenAI por meio de uma camada de segurança, confiabilidade e observabilidade. Quando o LLM está desabilitado, indisponível ou falha, o sistema retorna ao fallback determinístico já existente. A integração OpenAI atual usa o Responses API, structured outputs e um parser centralizado para validar a resposta antes de expô-la ao restante da aplicação. O chat também possui um transporte de streaming aditivo que reutiliza o mesmo use-case e a mesma persistência do fluxo síncrono. As versões de prompt são rastreadas em um registry interno com canary rollout determinístico e rollback por configuração. A camada conversacional também ganhou uma base interna de `AgentRuntime`, com intent classification e context orchestration determinísticos, mas ela permanece desabilitada por padrão e não altera a resposta pública.

A documentação deste módulo segue [Documentation Governance](../GOVERNANCE.md), que define as regras de navegação, placeholders, `Related Specs` e limites de documentação de debug.

---

## 2. Architecture Overview

```txt
User data
→ CoachDecision
→ CoachFeedback
→ Conversational Chat
→ Policy Engine / Governance
→ Intent Classification
→ Context Orchestration
→ Working / Session / Conversation Memory
→ Internal Agent Runtime Foundation
→ Coach Expert Registry
→ Internal Tool Registry
→ Planning Engine
→ Multi-Step Execution Engine
→ Validated Plan
→ Coach Persona Engine
→ Explainability Layer
→ Prompt Safety Layer
→ LLM Reliability Layer
→ LLM Observability & Cost Control
→ Streaming Transport (aditivo, quando habilitado)
→ Coach Home / Briefing / Memory / Insights / Ask Coach / Weekly Review / Goal Guidance
→ Explainability Layer
→ Replay & Debug
```

Hoje, a arquitetura interna do módulo `ai` se apoia principalmente em:

- `GET /ai/context`
- `GET /ai/coach-decision/today`
- `GET /ai/coach-decision/current`
- `CoachFeedbackGenerator`
- `CoachFeedback` persistido com metadata interna
- `CoachConversation` e `CoachMessage` persistidos para chat
- endpoints internos de debug e replay
- provider OpenAI moderno baseado no Responses API com capability metadata e structured outputs
- prompt registry interno com versões ativa e anterior
- evaluation dataset e runner internos para golden prompts
- deterministic intent classification and centralized context selection policy for the agent runtime
- centralized policy governance for context, tool, memory, and LLM decisions
- internal tool registry for agent execution planning
- deterministic planning engine and validator for immutable execution snapshots
- read-only internal tool execution pipeline behind `AI_AGENT_TOOLS_ENABLED=false` by default
- ordered execution steps and execution strategy metadata for the agent runtime
- policy engine as the single source of truth for authorization and deterministic fallback decisions
- internal coach expert registry for specialist routing metadata only
- internal expert router for deterministic primary/complementary selection and ordered expert execution metadata
- internal expert observability layer for deterministic contribution, conflict, health, and retention metadata
- internal expert composition engine for deterministic unified intelligence metadata
- internal coach persona engine for deterministic communication guidance metadata
- internal explainability layer for deterministic evidence-based explanation metadata
- mobile surfaces consume unified coach intelligence, persona guidance, and explanation summaries through existing contracts
- deterministic coach expert selection metadata for policy, planning, and observability
- internal `WorkoutExpert` deterministic contribution for training state and goal alignment
- internal `NutritionExpert` deterministic contribution for nutrition, recovery, and goal alignment
- internal `RecoveryExpert` deterministic contribution for recovery state, training impact, and nutrition support
- internal `GoalExpert` deterministic contribution for goal progression, forecast, milestones, and cross-domain consistency
- internal `HabitExpert` deterministic contribution for behavioral consistency, patterns, streaks, and cross-domain habit interpretation
- internal `ProgressExpert` deterministic contribution for longitudinal evolution, momentum, plateau, regression, and progress consistency
- internal `MotivationExpert` deterministic contribution for behavioral engagement, opportunity, strategy, risk, and motivational routing

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
- [agent-planning](./agent-planning/README.md)
- [agent-execution](./agent-execution/README.md)
- [agent-memory](./agent-memory/README.md)
- [experts/router](./experts/router/README.md)
- [experts/observability](./experts/observability/README.md)
- [experts/workout](./experts/workout/README.md)
- [experts/nutrition](./experts/nutrition/README.md)
- [experts/recovery](./experts/recovery/README.md)
- [experts/goals](./experts/goals/README.md)
- [experts/habits](./experts/habits/README.md)
- [experts/progress](./experts/progress/README.md)
- [experts/composition](./experts/composition/README.md)
- [persona](./persona/README.md)
- [explainability](./explainability/README.md)
- [prompt-builder](./prompt-builder/README.md)
- [get-coach-chat-history](./get-coach-chat-history/README.md)

## Release Readiness

- [release-readiness](./release-readiness/README.md)

## Conversational Explainability Surfaces

- [get-coach-chat-memory-debug](./get-coach-chat-memory-debug/README.md)
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
- [ADR-005 — AI Coach Experience](../../adr/adr-005-ai-coach-experience.md)
- [ADR-006 — AI LLM Observability & Cost Control](../../adr/adr-006-ai-llm-observability-cost-control.md)
- [ADR-007 — OpenAI Responses API & Structured Outputs](../../adr/adr-007-openai-responses-api-structured-outputs.md)
- [ADR-010 — AI Agent Platform Core Architecture](../../adr/adr-010-ai-agent-platform-core-architecture.md)
- [ADR-011 — Coach Intelligence Architecture](../../adr/adr-011-coach-intelligence-architecture.md)

---

## 5. Current System Characteristics

O sistema atual do módulo `ai` possui as seguintes características:

- deterministic heuristics with optional LLM-assisted chat generation
- safe reduced context for internal orchestration
- no medical claims in recovery interpretation
- internal debug endpoints separated from public coach history
- generator versioning through `COACH_FEEDBACK_GENERATOR_VERSION`
- persisted `influences` for explainability
- persisted `contextSnapshot` for replay compatibility
- conversational chat persistence with deterministic fallback, optional OpenAI replies, and an additive streaming transport
- prompt safety controls for injection detection, PII redaction, context minimization, and output validation
- deterministic conversational memory summarization with inspection-only preview surfaces
- internal agent memory layering with working/session/conversation scopes and immutable snapshots
- LLM reliability controls for timeout, retry, circuit breaking, kill switch, and normalized fallback handling
- LLM observability controls for request traces, token accounting, structured logs, usage aggregation, and cost guardrails
- bounded in-memory retention for observability traces and report state
- OpenAI provider modernized on the Responses API with structured outputs and a centralized response parser
- provider capability metadata for streaming, structured outputs, tool calling, and image input
- prompt version registry, canary rollout, and config-driven rollback
- internal evaluation runner with golden prompts and regression observations
- authenticated, user-scoped internal debug and replay flows
- conversational explainability surfaces for deterministic inspection only
- coach surfaces consume shared read models instead of duplicating domain logic
- internal agent runtime is feature-flagged off by default and only wraps the existing chat flow when enabled
- the policy engine centrally governs context, tools, memory, fallback, cost, and latency decisions
- the orchestrator chooses domains and the context loader performs the actual loading
- the tool registry catalogs capabilities and tool metadata without executing tools yet
- candidate and selected tools are attached to the internal plan as metadata only
- the planning engine converts the request into a validated immutable execution plan without executing tools
- the execution engine consumes the validated plan and runs ordered deterministic steps without recursive planning
- the observability layer records an internal trace per agent run with bounded retention, sanitized metadata, and no public exposure
- the release-readiness checklist documents rollout, monitoring, rollback, and smoke-test expectations for feature-flagged activation

Importante:

- `recoveryTrend` existe em partes internas do sistema, mas não é um campo público de `GET /ai/context`
- `hasTrainingPlan` não é um campo real do `UserHealthContext` atual; a presença de treino ativo é inferida por `activeTrainingPlanId`
- a camada conversacional usa LLM de forma opcional para geração de resposta, e já expõe um transporte de streaming aditivo; ainda não usa LangGraph, memória semântica, multi-agent routing ou voz
- toda entrada do chat passa por uma safety layer antes do provider OpenAI
- as superfícies internas de debug conversacional são inspection-only e não expõem raw prompts, raw context ou payloads OpenAI internos completos
- a integração OpenAI é protegida por timeout, retry, circuit breaker, kill switch e fallback determinístico

---

## 6. Future Directions

Possíveis evoluções arquiteturais futuras, ainda não implementadas:

- LLM orchestration
- semantic memory
- wearable integrations
- voice interface
- multi-agent orchestration beyond the current deterministic router

Esses itens devem ser tratados como roadmap técnico, não como capacidades atuais do sistema.

---

## 7. Summary

`docs/specs/ai/` agora documenta a base atual do módulo `ai` como uma arquitetura contextual, determinística e preparada para explainability e replay, com governança interna de prompt e rollout, sem depender ainda de LLM para o loop principal de coaching.
