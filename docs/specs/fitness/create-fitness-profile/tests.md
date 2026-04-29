# Tests — Create Fitness Profile

## 1. Overview

Este documento define os cenários de teste do use-case `create-fitness-profile`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar regras de negócio
- preservar isolamento do contexto `Fitness`

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

### TEST-001 — Create fitness profile successfully

Given:

- sessão válida
- `UserProfile` existente
- input fitness válido

Then:

- perfil fitness é criado
- `userProfileId` é persistido
- `status` default é aplicado
- resposta contém apenas dados seguros

### TEST-002 — Limitations optional

Given:

- `limitations` ausente

Then:

- criação ocorre normalmente

### TEST-003 — Default status applied

Then:

- `status = "active"`

---

## 4. Validation Errors

### TEST-004 — Invalid heightCm

Expected:

- `FITNESS_PROFILE_INVALID_INPUT`

### TEST-005 — Invalid weightKg

Expected:

- `FITNESS_PROFILE_INVALID_INPUT`

### TEST-006 — Invalid daysPerWeek

Expected:

- `FITNESS_PROFILE_INVALID_INPUT`

### TEST-007 — Invalid minutesPerSession

Expected:

- `FITNESS_PROFILE_INVALID_INPUT`

---

## 5. Business Errors

### TEST-008 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-009 — Fitness profile already exists

Expected:

- `FITNESS_PROFILE_ALREADY_EXISTS`

### TEST-010 — Unique index race condition

Given:

- condição de corrida na persistência
- MongoDB/Mongoose retorna erro de índice único em `userProfileId`

Expected:

- `FITNESS_PROFILE_ALREADY_EXISTS`

---

## 6. Security Tests

### TEST-011 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-012 — No downstream profile creation

Then:

- não cria `TrainingPlan`
- não acessa `Nutrition`
- não acessa `AI`

---

## 7. Persistence Tests

### TEST-013 — FitnessProfile is stored in database

Then:

- documento existe em `fitness_profiles`

### TEST-014 — Only one active profile per UserProfile

Then:

- duplicação não é permitida

---

## 8. Failure Scenarios

### TEST-015 — Database failure

Expected:

- `FITNESS_PROFILE_INTERNAL_ERROR`

---

## 9. E2E Scenario

### TEST-016 — Full API flow

Request:

```http
POST /fitness/profile
Authorization: Bearer <access-token>
```

Expected:

- `201 Created`
- resposta segura
- apenas `FitnessProfile` persistido

---

## 10. Summary

Esse conjunto de testes garante:

- validação correta
- vínculo correto com `UserProfile`
- unicidade de perfil ativo
- resposta segura
- separação de `Training`, `Nutrition` e `AI`
