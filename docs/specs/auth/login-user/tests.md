# Tests — Login User

## 1. Overview

Este documento define os cenários de teste do use-case `login-user`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar segurança de autenticação
- preservar isolamento do contexto `Auth`

---

## 2. Test Strategy

Tipos de teste recomendados:

```txt
Unit tests
Integration tests
E2E tests
```

---

## 3. Success Scenarios

### TEST-001 — Login user successfully

Given:

- `email` válido
- `password` correta
- `AuthUser` existente

Then:

- e-mail é normalizado
- senha é comparada com `passwordHash`
- `accessToken` é gerado
- resposta contém apenas dados seguros

### TEST-002 — Email normalization

Given:

```txt
" Rodrigo@Email.COM "
```

Then:

```txt
"rodrigo@email.com"
```

### TEST-003 — Password comparison uses PasswordHasher

Then:

- `PasswordHasher.compare` é chamado
- senha original não é exposta

### TEST-004 — Safe response

Then:

- response contém apenas `accessToken` e `user`
- response não contém `password`
- response não contém `passwordHash`
- response não contém `refreshToken`

---

## 4. Validation Errors

### TEST-005 — Missing email

Expected:

- `AUTH_INVALID_INPUT`

### TEST-006 — Invalid email

Expected:

- `AUTH_INVALID_INPUT`

### TEST-007 — Missing password

Expected:

- `AUTH_INVALID_INPUT`

---

## 5. Business Errors

### TEST-008 — Email not found

Expected:

- `AUTH_INVALID_CREDENTIALS`

### TEST-009 — Wrong password

Expected:

- `AUTH_INVALID_CREDENTIALS`

### TEST-010 — Same error for nonexistent email and wrong password

Then:

- cliente recebe a mesma mensagem segura

---

## 6. Security Tests

### TEST-011 — Response does not reveal passwordHash

Then:

- response não contém `passwordHash`

### TEST-012 — Response does not reveal account existence

Then:

- sistema não informa se o e-mail existe

---

## 7. Persistence and Token Tests

### TEST-013 — AuthUser is loaded from repository

Then:

- `AuthUserRepository.findByEmail` é chamado com e-mail normalizado

### TEST-014 — Access token is generated

Then:

- serviço JWT é chamado
- `accessToken` é retornado

---

## 8. Failure Scenarios

### TEST-015 — Database failure

Expected:

- `AUTH_INTERNAL_ERROR`

### TEST-016 — JWT generation failure

Expected:

- `AUTH_INTERNAL_ERROR`

---

## 9. E2E Scenario

### TEST-017 — Full API flow

Request:

```http
POST /auth/login
```

Expected:

- `200 OK`
- `accessToken` presente
- resposta segura

### TEST-018 — Invalid credentials flow

Expected:

- `401 Unauthorized`
- mensagem genérica

---

## 10. Summary

Esse conjunto de testes garante:

- validação correta
- autenticação segura
- resposta segura
- não enumeração de contas
- separação do contexto `Auth`
