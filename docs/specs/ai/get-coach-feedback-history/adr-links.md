# ADR Links — Get Coach Feedback History

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `get-coach-feedback-history`.

---

## 2. Related ADRs

### Official ADRs In Repository

- [ADR-002 — Recovery & Adaptive Coaching System](../../../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../../../adr/adr-003-coach-feedback-explainability.md)

### ADR-001 — Modular Monolith for MVP

Decision:

```txt
Modular Monolith
```

Impact:

- o use-case roda dentro do backend principal
- comunicação entre contextos continua direta e explícita

### ADR-002 — NestJS Backend

Decision:

```txt
NestJS
```

Impact:

- organização por módulos
- controller e DI padronizados

### ADR-003 — MongoDB as Primary Database

Decision:

```txt
MongoDB
```

Impact:

- persistência simples de `CoachFeedback`
- ordenação por `createdAt`

### ADR-004 — Session-Protected AI Coach History

Decision:

```txt
Use JWT-validated session
```

Impact:

- `authUserId` vem da sessão/JWT
- o endpoint é protegido

### ADR-005 — Persist Generated Coach Feedback

Decision:

```txt
Store feedback after successful POST /ai/coach-feedback
```

Impact:

- cria memória mínima de coach
- permite histórico sem recalcular feedback antigo

### ADR-006 — User-Scoped History Only

Decision:

```txt
Read history by userProfileId only
```

Impact:

- isola dados por usuário
- evita vazamento de histórico

### ADR-007 — Keep Nutrition Out of AI Coach History MVP

Decision:

```txt
Do not read Nutrition
```

Impact:

- reduz acoplamento entre contextos
- mantém o MVP focado em coach feedback

### ADR-008 — Future Evolution to Timeline and Chat

Decision:

```txt
Persist now, enrich later
```

Impact:

- a entidade `CoachFeedback` prepara timeline de coach
- no futuro pode haver chat, ranking de recomendações e continuidade conversacional

---

## 3. Suggested Future ADRs

### FUTURE-ADR-001 — Coach Timeline UI

Tema:

- transformar histórico em timeline navegável

### FUTURE-ADR-002 — Chat Memory Integration

Tema:

- reutilizar `CoachFeedback` em conversas com AI coach

### FUTURE-ADR-003 — Recommendation Ranking

Tema:

- priorizar recomendações por recência, aderência e resultado

---

## 4. Summary

As decisões principais que impactam `get-coach-feedback-history` são:

- ADR-002 recovery system
- ADR-003 explainability and replay system
- modular monolith
- NestJS
- MongoDB com persistência simples
- proteção por sessão JWT
- persistência de feedback gerado
- isolamento por `userProfileId`
- evolução futura para timeline e chat
