# Specs Index

## 1. Overview

O Elev9 Coach usa uma arquitetura `spec-driven` para documentar bounded contexts, workflows, contratos, regras, tarefas e testes de forma incremental.

Nesta organização:

- `docs/specs/` documenta os fluxos por contexto de negócio
- `docs/adr/` registra decisões arquiteturais mais estáveis
- os módulos evoluem por entregas incrementais
- o estado atual do sistema inclui os contextos de recovery, training, nutrition, goals, habits, personalization, notifications e AI / Coach
- o módulo `ai` já inclui governança de prompt, rollout canário determinístico, rollback por configuração e avaliação interna
- o bounded context `dashboard` documenta a superfície adaptativa da home e seus debug surfaces internos

Este índice funciona como ponto central de navegação da arquitetura documental do projeto.

---

## 2. Documentation Governance

- [Documentation Governance](./GOVERNANCE.md)

## 3. CI Validation

- [CI Validation Flow](../ci.md)

Repository CI validation flow, quality gates and deterministic validation policy.

---

## 4. System Contexts

## Core Platform

- [auth](./auth/)
- [users](./users/)

## Fitness & Training

- [fitness](./fitness/)
- [training](./training/)
- [progress](./progress/)
- [nutrition](./nutrition/)

## Adaptive Experience

- [dashboard](./dashboard/README.md)

## AI & Adaptive Coaching

- [ai](./ai/README.md)

## Exploratory Agent Specs

- [ai-agent](./ai-agent/README.md)

`ai-agent` existe hoje como uma trilha documental exploratória separada para agentes e capacidades futuras. Ele não representa o mesmo nível de implementação do módulo `ai` atual.

---

## 5. AI Architecture

O módulo `ai` documentado em [docs/specs/ai/README.md](./ai/README.md) atualmente se organiza em torno do seguinte fluxo:

```txt
CoachDecision
→ CoachFeedback
→ Conversational Coach
→ Coach Home / Daily Briefing / Memory / Insights / Ask Coach / Weekly Review / Goal Guidance / Smart Notifications
→ Safety / Reliability / Observability layers
→ Prompt registry / evaluation / canary rollout / rollback governance
→ Replay / Explainability
```

Hoje, o módulo cobre principalmente:

- context aggregation
- coach decision generation
- coach feedback generation
- conversational coaching
- explainability
- replay
- cross-surface coach reads
- optional LLM-assisted chat behind safety, reliability, and observability layers
- request tracing, token accounting, bounded retention, and cost guardrails for LLM requests
- prompt version registry with deterministic canary rollout and config-driven rollback
- internal evaluation runner and golden prompt dataset

O bounded context `dashboard` documentado em [docs/specs/dashboard/README.md](./dashboard/README.md) reutiliza o mesmo contexto contextual e compartilha read models com a camada coach.

Importante:

- o loop principal atual continua deterministic-first
- o produto usa read models já implementados para coach, habits, goals, personalization e notifications
- a explicabilidade do dashboard e do coach alinha-se à mesma arquitetura de explainability

---

## 6. ADRs

- [ADR-002 — Recovery & Adaptive Coaching System](../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../adr/adr-003-coach-feedback-explainability.md)
- [ADR-004 — Conversational Coach Architecture](../adr/adr-004-conversational-coach-architecture.md)
- [ADR-005 — AI Coach Experience](../adr/adr-005-ai-coach-experience.md)
- [ADR-006 — AI LLM Observability & Cost Control](../adr/adr-006-ai-llm-observability-cost-control.md)

---

## 7. Current Architecture Characteristics

O estado atual da arquitetura pode ser resumido por:

- modular monolith
- spec-driven workflow
- deterministic-first read models
- safe reduced contexts
- replay/debug infrastructure
- internal explainability metadata
- coach-centric mobile surfaces
- optional LLM-assisted chat with safety, reliability, and observability controls

Essas características descrevem o sistema atual e não devem ser lidas como capacidades avançadas de IA generativa.

---

## 8. Future Directions

Possíveis direções arquiteturais futuras, ainda não implementadas:

- LLM orchestration
- semantic memory
- adaptive recommendation engine
- wearable integrations
- richer telemetry pipelines

Esses itens devem ser tratados como roadmap técnico, não como comportamento atual do sistema.

---

## 9. Summary

`docs/specs/README.md` organiza a navegação da arquitetura spec-driven do projeto por bounded context e destaca o módulo `ai` como uma camada contextual determinística já preparada para explainability e replay, mas ainda sem depender de LLM no fluxo principal.
