# Tests — Register User

## 1. Overview

Este documento define os cenários de teste do use-case `register-user`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar regras de negócio
- preservar a separação entre `Auth` e `Users`

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

### TEST-001 — Register user successfully

Given:

- `name` válido
- `email` válido e único
- `password` válida

Then:

- usuário é criado
- e-mail é normalizado
- senha é hasheada
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

### TEST-002A — Name trimming

Given:

```txt
"  Rodrigo Paiva  "
```

Then:

- validação usa `Rodrigo Paiva`
- output retorna `Rodrigo Paiva`

### TEST-003 — Password is hashed

Then:

- `passwordHash` é gerado
- senha original não é persistida

### TEST-004 — User starts unverified

Then:

```txt
isEmailVerified === false
```

### TEST-005 — Register does not create UserProfile

Then:

- nenhum `UserProfile` é criado
- nenhuma dependência de `Users` é acionada

---

## 4. Validation Errors

### TEST-006 — Missing name

Expected:

- `AUTH_INVALID_INPUT`

### TEST-007 — Invalid email

Expected:

- `AUTH_INVALID_INPUT`

### TEST-008 — Weak password

Expected:

- `AUTH_PASSWORD_TOO_WEAK`

---

## 5. Business Errors

### TEST-009 — Email already exists

Given:

- já existe `AuthUser` com o e-mail normalizado

Expected:

- `AUTH_EMAIL_ALREADY_EXISTS`

---

## 6. Security Tests

### TEST-010 — Response does not contain password

Then:

- response não contém `password`
- response não contém `passwordHash`

### TEST-011 — No sensitive fields in response

Then:

- response contém apenas `id`, `email`, `name`, `createdAt`, `isEmailVerified`

---

## 7. Persistence Tests

### TEST-012 — User is stored in database

Then:

- documento existe em `auth_users`

### TEST-013 — Email uniqueness enforced

Then:

- duplicação não é permitida

### TEST-013A — Unique index race condition

Given:

- condição de corrida na persistência
- MongoDB/Mongoose retorna erro de índice único para `email`

Expected:

- `AUTH_EMAIL_ALREADY_EXISTS`

---

## 8. Failure Scenarios

### TEST-014 — Database failure

Expected:

- `AUTH_INTERNAL_ERROR`

---

## 9. E2E Scenario

### TEST-015 — Full API flow

Request:

```http
POST /auth/register
```

Expected:

- `201 Created`
- resposta segura
- apenas `AuthUser` persistido

---

## 10. Summary

Esse conjunto de testes garante:

- validação correta
- segurança de dados
- persistência correta
- separação entre `Auth` e `Users`
