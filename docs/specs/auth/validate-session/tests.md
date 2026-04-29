# Tests — Validate Session

## 1. Overview

Este documento define os cenários de teste do use-case `validate-session`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar segurança de sessão
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

### TEST-001 — Validate session successfully

Given:

- header `Authorization` válido
- token JWT válido

Then:

- token é extraído corretamente
- token é validado
- resposta contém apenas dados seguros do usuário

### TEST-002 — Bearer token extraction

Given:

```txt
Authorization: Bearer abc.def.ghi
```

Then:

```txt
token extraído = abc.def.ghi
```

### TEST-003 — Minimal payload mapping

Then:

- `sub` é mapeado para `user.id`
- `email` é mapeado para `user.email`

---

## 4. Validation Errors

### TEST-004 — Missing Authorization header

Expected:

- `AUTH_INVALID_INPUT`

### TEST-005 — Invalid Authorization format

Expected:

- `AUTH_INVALID_INPUT`

---

## 5. Business Errors

### TEST-006 — Invalid token

Expected:

- `AUTH_INVALID_SESSION`

### TEST-007 — Expired token

Expected:

- `AUTH_INVALID_SESSION`

### TEST-008 — Missing token value

Expected:

- `AUTH_INVALID_SESSION`

---

## 6. Security Tests

### TEST-009 — Response does not expose token

Then:

- response não contém token bruto

### TEST-010 — Response only contains safe user fields

Then:

- response contém apenas `user.id` e `user.email`

---

## 7. Verifier Tests

### TEST-011 — AccessTokenVerifier is called

Then:

- `AccessTokenVerifier.verifyAccessToken` é chamado com o token extraído

---

## 8. Failure Scenarios

### TEST-012 — Token verifier internal failure

Expected:

- `AUTH_INTERNAL_ERROR`

---

## 9. E2E Scenario

### TEST-013 — Full API flow

Request:

```http
GET /auth/session
Authorization: Bearer <valid-token>
```

Expected:

- `200 OK`
- resposta segura

### TEST-014 — Invalid session flow

Expected:

- `401 Unauthorized`
- mensagem genérica

---

## 10. Summary

Esse conjunto de testes garante:

- validação correta de sessão
- resposta segura
- tratamento genérico de sessão inválida
- separação do contexto `Auth`
