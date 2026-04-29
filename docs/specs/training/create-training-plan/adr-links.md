# ADR Links — Create Training Plan

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `create-training-plan`.

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

- `TrainingPlan` será armazenado em `training_plans`
- modelagem via Mongoose

### ADR-004 — Session-Protected Training Plan Creation

Decision:

```txt
Use JWT-validated session
```

Impact:

- o endpoint é protegido
- a criação do plano exige sessão válida

### ADR-005 — TrainingPlan Belongs to FitnessProfile

Decision:

```txt
TrainingPlan -> FitnessProfile
```

Impact:

- o vínculo persistido é `fitnessProfileId`
- o plano depende do contexto fitness para geração

### ADR-006 — One Active TrainingPlan Per FitnessProfile

Decision:

```txt
One active TrainingPlan per FitnessProfile
```

Impact:

- exige checagem de duplicidade
- exige índice único em `fitnessProfileId`

### ADR-007 — Rule-Based Plan Generation for MVP

Decision:

```txt
Generate plans using deterministic rules
```

Impact:

- comportamento previsível
- sem dependência de IA
- fácil de testar

### ADR-008 — No Nutrition or AI Access

Decision:

```txt
No Nutrition access
No AI access
```

Impact:

- fluxo permanece isolado
- reduz acoplamento entre contexts

---

## 3. Summary

As decisões principais que impactam `create-training-plan` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- JWT como proteção de endpoint
- vínculo de `TrainingPlan` com `FitnessProfile`
- unicidade de plano ativo
- geração determinística por regras
