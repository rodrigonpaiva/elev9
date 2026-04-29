# Tests — Create User Profile

## 1. Overview

Este documento define os cenários de teste do use-case `create-user-profile`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar regras de negócio
- preservar isolamento do contexto `Users`

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

### TEST-001 — Create user profile successfully

Given:

- sessão válida
- `AuthUser` autenticado
- `name` válido

Then:

- perfil é criado
- defaults são aplicados
- resposta contém apenas dados seguros

### TEST-002 — Name trimming

Given:

```txt
"  Rodrigo Paiva  "
```

Then:

- validação usa `Rodrigo Paiva`
- output retorna `Rodrigo Paiva`

### TEST-003 — Default fields applied

Then:

- `language = "en-US"`
- `timezone = "UTC"`
- `status = "active"`

---

## 4. Validation Errors

### TEST-004 — Missing name

Expected:

- `USER_PROFILE_INVALID_INPUT`

### TEST-005 — Invalid birthDate

Expected:

- `USER_PROFILE_INVALID_INPUT`

### TEST-006 — Invalid gender

Expected:

- `USER_PROFILE_INVALID_INPUT`

---

## 5. Business Errors

### TEST-007 — Profile already exists

Given:

- já existe `UserProfile` para o `AuthUser`

Expected:

- `USER_PROFILE_ALREADY_EXISTS`

---

## 6. Security Tests

### TEST-008 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-009 — Response does not expose auth internals

Then:

- response não contém `password`
- response não contém `passwordHash`
- response não contém token

---

## 7. Persistence Tests

### TEST-010 — UserProfile is stored in database

Then:

- documento existe em `user_profiles`

### TEST-011 — Only one profile per AuthUser

Then:

- duplicação não é permitida

---

## 8. Failure Scenarios

### TEST-012 — Database failure

Expected:

- `USER_PROFILE_INTERNAL_ERROR`

---

## 9. E2E Scenario

### TEST-013 — Full API flow

Request:

```http
POST /users/profile
Authorization: Bearer <access-token>
```

Expected:

- `201 Created`
- resposta segura
- apenas `UserProfile` persistido

---

## 10. Summary

Esse conjunto de testes garante:

- validação correta
- defaults corretos
- unicidade de perfil
- resposta segura
- separação de `Fitness`, `Nutrition` e `AI`
