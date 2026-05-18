# Tests — Replay Coach Feedback

## 1. Overview

Este documento define os cenários de teste do use-case `replay-coach-feedback`.

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

### TEST-001 — Replay works with valid snapshot

Given:

- sessão válida
- `UserProfile` existente
- `CoachFeedback` com `contextSnapshot`
- `generatorVersion` suportado

Then:

- o replay retorna sucesso
- `replayed` é calculado
- `matches` é retornado

### TEST-002 — Return correct match flags

Expected:

- `message`, `insights`, `recommendations` e `influences` são comparados individualmente

### TEST-003 — Replay does not persist anything

Expected:

- nenhuma criação ou atualização acontece no repositório

---

## 4. Business Errors

### TEST-004 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-005 — Feedback not found

Expected:

- `COACH_FEEDBACK_NOT_FOUND`

### TEST-006 — Missing contextSnapshot

Expected:

- `COACH_FEEDBACK_REPLAY_CONTEXT_MISSING`

### TEST-007 — Unsupported generatorVersion

Expected:

- `COACH_FEEDBACK_GENERATOR_VERSION_UNSUPPORTED`

### TEST-008 — GET with unexpected body returns invalid input

Expected:

- `AI_COACH_REPLAY_INVALID_INPUT`

### TEST-009 — Internal failure

Expected:

- `COACH_FEEDBACK_REPLAY_INTERNAL_ERROR`

---

## 5. Security Tests

### TEST-010 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-011 — Replay respects ownership

Then:

- o endpoint não reproduz feedback de outro usuário

### TEST-012 — No sensitive field leak

Then:

- a resposta não expõe `userProfileId`
- a resposta não expõe auth/session/email/token

### TEST-013 — Public endpoints remain unchanged

Then:

- `POST /ai/coach-feedback` continua sem metadata interna
- `GET /ai/coach-feedback` continua sem replay data

---

## 6. Summary

A cobertura mínima deve validar replay determinístico, ownership, versionamento, ausência de persistência do replay e separação entre fluxo interno e API pública.
