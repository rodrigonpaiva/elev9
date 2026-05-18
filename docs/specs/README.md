# Specs Index

## 1. Overview

O Elev9 Coach usa uma arquitetura `spec-driven` para documentar bounded contexts, workflows, contratos, regras, tarefas e testes de forma incremental.

Nesta organização:

- `docs/specs/` documenta os fluxos por contexto de negócio
- `docs/adr/` registra decisões arquiteturais mais estáveis
- os módulos evoluem por entregas incrementais
- o estado atual do sistema, especialmente no módulo `ai`, segue uma abordagem `deterministic-first`
- o bounded context `dashboard` documenta a superfície adaptativa da home e seus debug surfaces internos

Este índice funciona como ponto central de navegação da arquitetura documental do projeto.

---

## 2. Documentation Governance

- [Documentation Governance](./GOVERNANCE.md)

---

## 3. System Contexts

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

## 4. AI Architecture

O módulo `ai` documentado em [docs/specs/ai/README.md](./ai/README.md) atualmente se organiza em torno do seguinte fluxo:

```txt
UserHealthContext
→ Recovery System
→ Coach Feedback
→ Explainability
→ Replay
```

Hoje, o módulo cobre principalmente:

- context aggregation
- recovery heuristics
- nutrition awareness
- coach feedback generation
- debug history
- replay

O bounded context `dashboard` documentado em [docs/specs/dashboard/README.md](./dashboard/README.md) reutiliza o mesmo `UserHealthContext` e compartilha heurísticas determinísticas com essa camada contextual.

Importante:

- o loop principal atual continua determinístico
- integração com LLM ainda não faz parte do fluxo implementado principal
- a explicabilidade do dashboard alinha-se à arquitetura de explainability do módulo `ai`

---

## 5. ADRs

- [ADR-002 — Recovery & Adaptive Coaching System](../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../adr/adr-003-coach-feedback-explainability.md)

---

## 6. Current Architecture Characteristics

O estado atual da arquitetura pode ser resumido por:

- modular monolith
- spec-driven workflow
- deterministic-first AI
- heuristic recovery system
- safe reduced contexts
- replay/debug infrastructure
- internal explainability metadata

Essas características descrevem o sistema atual e não devem ser lidas como capacidades avançadas de IA generativa.

---

## 7. Future Directions

Possíveis direções arquiteturais futuras, ainda não implementadas:

- LLM orchestration
- semantic memory
- adaptive recommendation engine
- wearable integrations
- nutrition intelligence
- evaluation engine

Esses itens devem ser tratados como roadmap técnico, não como comportamento atual do sistema.

---

## 8. Summary

`docs/specs/README.md` organiza a navegação da arquitetura spec-driven do projeto por bounded context e destaca o módulo `ai` como uma camada contextual determinística já preparada para explainability e replay, mas ainda sem depender de LLM no fluxo principal.
