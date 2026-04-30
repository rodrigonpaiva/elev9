# Tests — Log Workout

## 1. Overview

Este documento define os cenários de teste do use-case `log-workout`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar ownership do plano
- preservar isolamento do contexto `Progress`

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

### TEST-001 — Log workout successfully

Given:

- sessão válida
- `UserProfile` existente
- `FitnessProfile` ativo existente
- `TrainingPlan` pertencente ao usuário
- `workoutDayIndex` válido

Then:

- `WorkoutLog` é criado
- resposta contém apenas dados seguros

### TEST-002 — Log workout with optional feedback

Given:

- `feedback` presente

Then:

- log é criado normalmente

---

## 4. Validation Errors

### TEST-003 — Invalid workoutDayIndex

Expected:

- `WORKOUT_LOG_INVALID_INPUT`

### TEST-004 — Invalid durationMinutes

Expected:

- `WORKOUT_LOG_INVALID_INPUT`

### TEST-005 — Empty completedExercises

Expected:

- `WORKOUT_LOG_INVALID_INPUT`

### TEST-006 — Invalid setsDone or repsDone

Expected:

- `WORKOUT_LOG_INVALID_INPUT`

### TEST-007 — Notes too long

Expected:

- `WORKOUT_LOG_INVALID_INPUT`

---

## 5. Business Errors

### TEST-008 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-009 — Fitness profile not found

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-010 — Training plan not found

Expected:

- `TRAINING_PLAN_NOT_FOUND`

### TEST-011 — Training plan from another user returns TRAINING_PLAN_NOT_FOUND

Expected:

- `TRAINING_PLAN_NOT_FOUND`

### TEST-012 — Workout log already exists

Expected:

- `WORKOUT_LOG_ALREADY_EXISTS`

### TEST-013 — Unique index race condition

Expected:

- `WORKOUT_LOG_ALREADY_EXISTS`

### TEST-014 — Same training day on different dates is allowed

Given:

- mesmo `trainingPlanId`
- mesmo `workoutDayIndex`
- `date` diferente

Expected:

- novo log é permitido

### TEST-015 — UTC day transition creates different dates

Given:

- dois logs do mesmo `trainingPlanId`
- mesmo `workoutDayIndex`
- um antes de `00:00 UTC`
- outro depois de `00:00 UTC`

Expected:

- os logs são considerados de dias diferentes
- a duplicidade não é acionada

---

## 6. Security Tests

### TEST-016 — Duplicate on same UTC date is blocked

Given:

- mesmo `trainingPlanId`
- mesmo `workoutDayIndex`
- mesmo `date` UTC

Expected:

- `WORKOUT_LOG_ALREADY_EXISTS`

### TEST-017 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-018 — No external IDs accepted

Expected:

- `authUserId`, `userProfileId` e `fitnessProfileId` nunca vêm do cliente

### TEST-019 — No AI and no TrainingPlan mutation

Then:

- não acessa `AI`
- não altera `TrainingPlan`

---

## 7. Persistence Tests

### TEST-020 — WorkoutLog is stored in database

Then:

- documento existe em coleção de logs

### TEST-021 — One log per trainingPlanId + workoutDayIndex + date

Then:

- duplicação no mesmo dia não é permitida

---

## 8. Failure Scenarios

### TEST-022 — Database failure

Expected:

- `WORKOUT_LOG_INTERNAL_ERROR`

---

## 9. E2E Scenario

### TEST-023 — Full API flow

Request:

```http
POST /progress/workout-logs
Authorization: Bearer <access-token>
```

Expected:

- `201 Created`
- resposta segura
- `TrainingPlan` permanece inalterado

---

## 10. Summary

Esse conjunto de testes garante:

- ownership correto do `TrainingPlan`
- validação de payload
- unicidade do log diário
- ausência de mutação do plano
- separação de `AI` e `Nutrition`
