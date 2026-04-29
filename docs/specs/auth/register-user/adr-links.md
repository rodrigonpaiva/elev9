# ADR Links — Register User

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `register-user`.

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
- não há message broker no MVP

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

- `AuthUser` será armazenado em `auth_users`
- e-mail deve ter índice único
- modelagem via Mongoose

### ADR-004 — Password Hashing Strategy

Decision:

```txt
bcrypt
```

Impact:

- hash gerado no backend
- `RegisterUserUseCase` depende de `PasswordHasher`

### ADR-005 — Separation of Auth and Users Context

Decision:

```txt
Auth Context != Users Context
```

Impact:

- `register-user` cria apenas `AuthUser`
- `UserProfile` será criado em `users/create-user-profile`
- evita acoplamento e transação cruzada no cadastro

### ADR-006 — Email Normalization Strategy

Decision:

```txt
trim + lowercase
```

Impact:

- garante unicidade consistente
- evita duplicação por diferença de casing

### ADR-007 — Explicit Error Codes

Decision:

Erros devem usar códigos estáveis:

- `AUTH_INVALID_INPUT`
- `AUTH_EMAIL_ALREADY_EXISTS`
- `AUTH_PASSWORD_TOO_WEAK`
- `AUTH_INTERNAL_ERROR`

### ADR-008 — No Automatic Login After Registration

Decision:

Após cadastro, o usuário deve fazer login manualmente.

Impact:

- simplifica o fluxo inicial
- evita criação de sessão no mesmo caso de uso

### ADR-009 — Safe Response Policy

Decision:

Nunca retornar:

- `password`
- `passwordHash`
- tokens internos
- metadados sensíveis

### ADR-010 — No Redis in MVP

Decision:

```txt
No Redis in MVP
```

Impact:

- nenhum cache distribuído
- nenhuma dependência de pub/sub
- persistência e regras seguem simples

---

## 3. Summary

As decisões principais que impactam `register-user` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- bcrypt
- separação entre `Auth` e `Users`
- ausência de Redis no MVP
