# ADR Links — Log Workout

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `log-workout`.

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

- `WorkoutLog` será armazenado em coleção própria
- modelagem via Mongoose

### ADR-004 — Session-Protected Workout Logging

Decision:

```txt
Use JWT-validated session
```

Impact:

- `authUserId` vem da sessão/JWT
- o endpoint é protegido

### ADR-005 — Ownership Through UserProfile and FitnessProfile

Decision:

```txt
AuthUser -> UserProfile -> active FitnessProfile -> TrainingPlan
```

Impact:

- valida ownership do plano sem aceitar ids sensíveis do cliente
- reduz risco de acesso cruzado

### ADR-006 — Do Not Mutate TrainingPlan

Decision:

```txt
Workout logging does not modify TrainingPlan
```

Impact:

- separa planejamento de execução
- evita efeitos colaterais inesperados

### ADR-007 — No AI or Nutrition Access

Decision:

```txt
No AI access
No Nutrition access
```

Impact:

- fluxo determinístico
- menor acoplamento entre contexts

---

## 3. Summary

As decisões principais que impactam `log-workout` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- JWT como proteção de endpoint
- validação de ownership do `TrainingPlan`
- separação entre execução e planejamento
