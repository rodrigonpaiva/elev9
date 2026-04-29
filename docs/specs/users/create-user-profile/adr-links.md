# ADR Links — Create User Profile

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `create-user-profile`.

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

- `UserProfile` será armazenado em `user_profiles`
- modelagem via Mongoose

### ADR-004 — Separation of Auth and Users Context

Decision:

```txt
Auth Context != Users Context
```

Impact:

- autenticação continua em `Auth`
- perfil funcional é criado em `Users`
- `authUserId` vem da sessão, mas o perfil pertence a `Users`

### ADR-005 — Session-Protected Profile Creation

Decision:

```txt
Use JWT-validated session
```

Impact:

- `authUserId` vem da sessão/JWT
- body não informa identidade do usuário

### ADR-006 — One Profile Per AuthUser

Decision:

```txt
One UserProfile per AuthUser
```

Impact:

- evita duplicidade de perfil funcional
- exige checagem por `authUserId`

### ADR-007 — No Cascading Profile Creation

Decision:

Não criar automaticamente:

- `FitnessProfile`
- `NutritionProfile`

Impact:

- onboarding permanece modular
- reduz acoplamento entre contexts

### ADR-008 — No AI in Users Profile Creation

Decision:

```txt
No AI access in create-user-profile
```

Impact:

- fluxo determinístico
- sem dependência de providers externos de IA

---

## 3. Summary

As decisões principais que impactam `create-user-profile` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- separação entre `Auth` e `Users`
- JWT como proteção de endpoint
- unicidade de `UserProfile` por `AuthUser`
