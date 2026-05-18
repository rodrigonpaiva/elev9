# Tests — Get Coach Feedback Debug History

## 1. Overview

Este documento define os cenários de teste do use-case `get-coach-feedback-debug-history`.

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

### TEST-001 — Return debug history with influences

Given:

- sessão válida
- `UserProfile` existente
- `CoachFeedback` com metadata de explainability

Then:

- a resposta inclui `influences`
- a resposta inclui `generatorVersion`
- a resposta inclui `contextSnapshot`

### TEST-002 — Apply default limit

Expected:

- sem `limit`, usar `20`

### TEST-003 — Apply explicit limit

Expected:

- `limit=100` é aceito

### TEST-004 — Return empty history

Expected:

- `feedbacks = []`

### TEST-005 — Keep user isolation

Expected:

- retornar apenas feedbacks do usuário autenticado

### TEST-006 — Legacy documents remain valid

Expected:

- `influences = []`
- `generatorVersion` ausente
- `contextSnapshot` ausente

---

## 4. Business Errors

### TEST-007 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-008 — Invalid limit above maximum

Expected:

- `AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT`

### TEST-009 — GET with unexpected body returns invalid input

Expected:

- `AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT`

### TEST-010 — Internal repository failure

Expected:

- `AI_FEEDBACK_DEBUG_HISTORY_INTERNAL_ERROR`

---

## 5. Security Tests

### TEST-011 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-012 — No ownership field leak

Then:

- a resposta não expõe `userProfileId`

### TEST-013 — Debug metadata stays out of public history

Then:

- `GET /ai/coach-feedback` continua sem `influences`
- `GET /ai/coach-feedback` continua sem `generatorVersion`
- `GET /ai/coach-feedback` continua sem `contextSnapshot`

---

## 6. Summary

A cobertura mínima deve validar autenticação, isolamento por usuário, metadata interna, compatibilidade legada e separação do contrato público.
