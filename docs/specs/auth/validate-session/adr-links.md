# ADR Links — Validate Session

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `validate-session`.

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

### ADR-003 — JWT Access Token for MVP

Decision:

```txt
Use accessToken JWT only
```

Impact:

- validação é feita sobre `accessToken`
- não há `refresh token` no MVP

### ADR-004 — AccessTokenVerifier Abstraction

Decision:

```txt
Use AccessTokenVerifier abstraction
```

Impact:

- o use-case não depende diretamente de `JwtService`
- facilita testes e isolamento do domínio

### ADR-005 — Minimal Token Payload

Decision:

Payload mínimo:

- `sub`
- `email`

Impact:

- resposta segura e simples
- sem dependência de `UserProfile`

### ADR-006 — Invalid Session Generic Error

Decision:

Falha de validação de sessão deve sempre retornar:

- `AUTH_INVALID_SESSION`

Impact:

- trata token ausente, inválido e expirado de forma uniforme

### ADR-007 — Separation of Auth and Users Context

Decision:

```txt
Auth Context != Users Context
```

Impact:

- `validate-session` não acessa `UserProfile`
- não lê outros domínios do produto

### ADR-008 — No Redis in MVP

Decision:

```txt
No Redis in MVP
```

Impact:

- nenhuma store distribuída de sessão
- nenhuma camada extra de cache para autenticação

---

## 3. Summary

As decisões principais que impactam `validate-session` são:

- modular monolith
- NestJS
- JWT de acesso sem refresh token
- `AccessTokenVerifier` como abstração
- payload mínimo `sub + email`
- erro genérico `AUTH_INVALID_SESSION`
