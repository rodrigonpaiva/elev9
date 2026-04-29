# ADR Links — Create Fitness Profile

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `create-fitness-profile`.

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

- `FitnessProfile` será armazenado em `fitness_profiles`
- modelagem via Mongoose

### ADR-004 — Session-Protected Fitness Profile Creation

Decision:

```txt
Use JWT-validated session
```

Impact:

- `authUserId` vem da sessão/JWT
- o endpoint é protegido

### ADR-005 — FitnessProfile Belongs to UserProfile

Decision:

```txt
FitnessProfile -> UserProfile
```

Impact:

- o vínculo persistido é `userProfileId`
- evita acoplamento direto do `FitnessProfile` com `AuthUser`

### ADR-006 — One Active FitnessProfile Per UserProfile

Decision:

```txt
One active FitnessProfile per UserProfile
```

Impact:

- exige checagem de duplicidade
- exige índice único em `userProfileId`

### ADR-007 — No Cascading Plan Creation

Decision:

Não criar automaticamente:

- `TrainingPlan`

Impact:

- onboarding permanece modular
- reduz acoplamento entre `Fitness` e `Training`

### ADR-008 — No Nutrition or AI Access

Decision:

```txt
No Nutrition access
No AI access
```

Impact:

- fluxo determinístico
- sem dependência de outros contexts

---

## 3. Summary

As decisões principais que impactam `create-fitness-profile` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- JWT como proteção de endpoint
- vínculo de `FitnessProfile` com `UserProfile`
- unicidade de perfil fitness ativo
