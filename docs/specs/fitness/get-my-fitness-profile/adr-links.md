# ADR Links — Get My Fitness Profile

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `get-my-fitness-profile`.

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

- `FitnessProfile` é lido de `fitness_profiles`
- modelagem via Mongoose

### ADR-004 — Session-Protected Profile Access

Decision:

```txt
Use JWT-validated session
```

Impact:

- `authUserId` vem da sessão/JWT
- o endpoint é protegido

### ADR-005 — Resolve FitnessProfile Through UserProfile

Decision:

```txt
AuthUser -> UserProfile -> active FitnessProfile
```

Impact:

- evita aceitar ids vindos do cliente
- mantém leitura restrita ao usuário autenticado

### ADR-006 — No Cross-Context Access

Decision:

```txt
No Training access
No Nutrition access
No AI access
```

Impact:

- fluxo simples
- leitura restrita ao contexto `Fitness`

---

## 3. Summary

As decisões principais que impactam `get-my-fitness-profile` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- JWT como proteção de endpoint
- resolução do perfil via sessão
- ausência de ids externos e de acessos a outros contexts
