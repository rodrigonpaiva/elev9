# ADR Links — Get Home Dashboard

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `get-home-dashboard`.

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

- leitura agregada de múltiplas coleções
- modelagem via Mongoose

### ADR-004 — Session-Protected Dashboard Access

Decision:

```txt
Use JWT-validated session
```

Impact:

- `authUserId` vem da sessão/JWT
- o endpoint é protegido

### ADR-005 — Dashboard Built From Read Models

Decision:

```txt
UserProfile -> FitnessProfile -> TrainingPlan -> ProgressSummary
```

Impact:

- resposta consolidada sem aceitar ids externos
- composição orientada à home do app

### ADR-006 — UTC-Based Home Logic

Decision:

```txt
Use UTC for todayWorkout and weekly summary
```

Impact:

- evita ambiguidade temporal
- mantém comportamento previsível entre cliente e backend

### ADR-007 — No Cross-Context Access

Decision:

```txt
No Nutrition access
No AI access
```

Impact:

- fluxo simples
- dashboard focado no MVP fitness/training/progress

---

## 3. Summary

As decisões principais que impactam `get-home-dashboard` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- JWT como proteção de endpoint
- composição do dashboard via leitura de múltiplos contexts
- uso de UTC
- ausência de acessos a `Nutrition` e `AI`
