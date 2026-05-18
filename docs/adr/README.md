# ADR Index

## 1. Overview

Os ADRs (`Architecture Decision Records`) registram decisões arquiteturais relevantes do Elev9 Coach.

No projeto atual:

- os `specs` descrevem workflows, contratos, regras, tarefas e testes
- os `ADRs` descrevem decisões arquiteturais mais estáveis
- a arquitetura evolui de forma incremental e spec-driven
- a evolução arquitetural atual segue a linha `adaptive coaching → explainability → conversational coaching`
- os ADRs funcionam como registro histórico das escolhas técnicas que estruturam o sistema

Este índice centraliza a navegação das decisões arquiteturais atualmente formalizadas no repositório.

---

## 2. Current ADRs

- [ADR-002 — Recovery & Adaptive Coaching System](./adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](./adr-003-coach-feedback-explainability.md)
- [ADR-004 — Conversational Coach Architecture](./adr-004-conversational-coach-architecture.md)

---

## 3. Decision Domains

## Recovery & Coaching

- [ADR-002 — Recovery & Adaptive Coaching System](./adr-002-recovery-system.md)

## Explainability & Replay

- [ADR-003 — Coach Feedback Explainability & Replay System](./adr-003-coach-feedback-explainability.md)

## Conversational Coaching

- [ADR-004 — Conversational Coach Architecture](./adr-004-conversational-coach-architecture.md)

## Conversational Explainability Surfaces

- [ADR-003 — Coach Feedback Explainability & Replay System](./adr-003-coach-feedback-explainability.md)
- [ADR-004 — Conversational Coach Architecture](./adr-004-conversational-coach-architecture.md)

---

## 4. Current Architectural Themes

Os ADRs atuais convergem nos seguintes temas:

- deterministic-first systems
- recovery heuristics
- context aggregation
- explainability
- replay infrastructure
- conversational coaching
- conversational explainability surfaces
- spec-driven evolution

Esses temas descrevem o estado atual do sistema e não devem ser interpretados como uma plataforma de IA avançada ou como uma camada clínica.

Em particular, a evolução arquitetural atual pode ser lida como:

```txt
ADR-003 → conversational explainability → ADR-004 → unified conversational debug surfaces
```

As superfícies internas de debug conversacional atualmente documentadas são:

- `GET /ai/chat/debug`
- `GET /ai/chat/debug/prompt`
- `GET /ai/chat/debug/reply-path`
- `GET /ai/chat/debug/history`

Essas rotas são superfícies internas determinísticas de inspeção. Elas não expõem prompt bruto, `UserHealthContext` bruto, tokens, sessão ou payloads OpenAI internos completos.

---

## 5. Relationship With Specs

No modelo documental atual:

- `docs/specs/` descreve fluxos, contratos e comportamento por bounded context
- `docs/adr/` descreve as decisões arquiteturais que sustentam esses fluxos

Índice principal dos specs:

- [docs/specs/README.md](../specs/README.md)

Em termos práticos:

- specs explicam `como` um fluxo deve funcionar
- ADRs explicam `por que` a arquitetura foi organizada daquela forma

---

## 6. Future ADR Areas

Temas prováveis para ADRs futuros, ainda não implementados:

- LLM orchestration
- semantic memory
- evaluation engine
- prompt versioning
- wearable integrations
- adaptive recommendations
- LangGraph orchestration
- streaming
- voice interface
- multi-agent routing

Esses itens devem ser tratados como áreas potenciais de decisão arquitetural futura, não como capacidades já entregues.

---

## 7. Summary

`docs/adr/README.md` organiza a navegação das decisões arquiteturais do projeto e deixa explícita a relação entre a camada spec-driven e as escolhas estruturais atualmente formalizadas no Elev9 Coach.
