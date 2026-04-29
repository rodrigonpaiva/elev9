# ADR Links — Login User

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `login-user`.

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
- não há infraestrutura distribuída adicional

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

- `AuthUser` é carregado de `auth_users`
- modelagem via Mongoose

### ADR-004 — Password Hashing Strategy

Decision:

```txt
bcrypt
```

Impact:

- comparação de senha via `PasswordHasher`
- login não manipula senha em texto puro além do input transitório

### ADR-005 — JWT Access Token for MVP

Decision:

```txt
Use accessToken JWT only
```

Impact:

- login retorna apenas `accessToken`
- não há `refresh token` no MVP

### ADR-006 — Separation of Auth and Users Context

Decision:

```txt
Auth Context != Users Context
```

Impact:

- `login-user` autentica apenas `AuthUser`
- não cria `UserProfile`
- não lê dados de perfil funcional

### ADR-007 — Email Normalization Strategy

Decision:

```txt
trim + lowercase
```

Impact:

- lookup consistente por e-mail
- evita diferença por casing ou espaços

### ADR-008 — Generic Invalid Credentials Error

Decision:

Falha de autenticação deve sempre retornar:

- `AUTH_INVALID_CREDENTIALS`

Impact:

- evita enumeração de contas
- mantém resposta segura para usuário inexistente e senha incorreta

### ADR-009 — No Redis in MVP

Decision:

```txt
No Redis in MVP
```

Impact:

- nenhuma store externa de sessão
- nenhuma dependência de cache distribuído

---

## 3. Summary

As decisões principais que impactam `login-user` são:

- modular monolith
- NestJS
- MongoDB com Mongoose
- bcrypt
- JWT de acesso sem refresh token
- separação entre `Auth` e `Users`
- erro genérico para credenciais inválidas
