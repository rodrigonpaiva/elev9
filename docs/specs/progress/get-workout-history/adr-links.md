# ADR Links — Get Workout History

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `get-workout-history`.

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

- `WorkoutLog` é lido de `workout_logs`
- modelagem via Mongoose

### ADR-004 — Session-Protected Progress Access

Decision:

```txt
Use JWT-validated session
```

Impact:

- `authUserId` vem da sessão/JWT
- o endpoint é protegido

### ADR-005 — Resolve Progress Through Active Fitness Scope

Decision:

```txt
AuthUser -> UserProfile -> active FitnessProfile -> active TrainingPlans -> WorkoutLogs
```

Impact:

- evita aceitar ids vindos do cliente
- mantém leitura restrita ao usuário autenticado

### ADR-006 — UTC-Based Progress Data

Decision:

```txt
Use UTC for workout log dates
```

Impact:

- evita ambiguidade temporal
- torna ordenação e leitura previsíveis

### ADR-007 — No Cross-Context Access

Decision:

```txt
No Nutrition access
No AI access
```

Impact:

- fluxo simples
- leitura restrita ao contexto `Progress`

---

## 3. Summary

As decisões principais que impactam `get-workout-history` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- JWT como proteção de endpoint
- resolução do escopo via sessão
- ordenação segura por `date` e `createdAt`
- ausência de ids externos e de acessos a `Nutrition` e `AI`
