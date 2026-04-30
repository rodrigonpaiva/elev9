# ADR Links — Get My Training Plan

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `get-my-training-plan`.

---

## 2. Related ADRs

### ADR-001 — Modular Monolith for MVP

Decision:

```txt
Modular Monolith
```

Impact:

- o use-case roda dentro do backend principal
- comunicação é direta entre módulos

### ADR-002 — NestJS Backend

Decision:

```txt
NestJS
```

Impact:

- organização por módulos
- controllers, providers e DI padronizados

### ADR-003 — MongoDB as Primary Database

Decision:

```txt
MongoDB
```

Impact:

- `TrainingPlan` é lido de `training_plans`
- modelagem via Mongoose

### ADR-004 — Session-Protected Training Access

Decision:

```txt
Use JWT-validated session
```

Impact:

- `authUserId` vem da sessão/JWT
- o endpoint é protegido

### ADR-005 — Resolve TrainingPlan Through Session Chain

Decision:

```txt
AuthUser -> UserProfile -> active FitnessProfile -> active TrainingPlan
```

Impact:

- evita aceitar ids vindos do cliente
- mantém leitura restrita ao usuário autenticado

### ADR-006 — Read-Only Training Plan Retrieval

Decision:

```txt
Do not create or mutate TrainingPlan
```

Impact:

- este use-case é apenas de leitura
- nenhuma lógica de geração é executada

### ADR-007 — No Cross-Context Access

Decision:

```txt
No Nutrition access
No AI access
```

Impact:

- fluxo simples
- leitura restrita ao contexto `Training`

---

## 3. Summary

As decisões principais que impactam `get-my-training-plan` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- JWT como proteção de endpoint
- resolução do plano via sessão
- leitura somente do plano ativo
- ausência de ids externos e de acessos a `Nutrition` e `AI`
