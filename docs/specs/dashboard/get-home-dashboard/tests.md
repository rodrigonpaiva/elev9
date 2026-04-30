# Tests — Get Home Dashboard

## 1. Overview

Este documento define os cenários de teste do use-case `get-home-dashboard`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar consolidação do payload
- preservar isolamento do contexto `Dashboard`

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

### TEST-001 — Return full dashboard successfully

Given:

- sessão válida
- `UserProfile` existente
- `FitnessProfile` ativo existente
- `TrainingPlan` ativo existente
- logs elegíveis na semana

Then:

- o dashboard é retornado com sucesso
- todos os blocos são preenchidos

### TEST-002 — Return dashboard with null fitnessProfile

Given:

- existe `UserProfile`
- não existe `FitnessProfile` ativo

Then:

- `fitnessProfile = null`
- `trainingPlan = null`
- `progressSummary` zerado

### TEST-003 — Return dashboard with null trainingPlan

Given:

- existe `FitnessProfile` ativo
- não existe `TrainingPlan` ativo

Then:

- `trainingPlan = null`
- `progressSummary` continua válido

### TEST-004 — progressSummary defaults to week

Then:

- `progressSummary.period = week`

### TEST-005 — Zero progress summary when no logs

Given:

- não existem logs elegíveis

Then:

- `workoutsCompleted = 0`
- `totalDurationMinutes = 0`
- `averageDurationMinutes = 0`
- `lastWorkoutDate = null`

### TEST-006 — todayWorkout matches UTC weekday

Given:

- existe `TrainingPlan` com `weeklySchedule`
- existe correspondência para o dia UTC atual

Then:

- `todayWorkout` contém o item correspondente

### TEST-007 — todayWorkout is null when no weekday match exists

Given:

- existe `TrainingPlan`
- não existe item para o dia UTC atual

Then:

- `todayWorkout = null`

### TEST-008 — todayWorkout is null when TrainingPlan exists but weeklySchedule has no current UTC weekday

Given:

- existe `TrainingPlan`
- `weeklySchedule` não contém o dia da semana UTC atual

Then:

- `todayWorkout = null`

---

## 4. Business Errors

### TEST-009 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-010 — Internal database failure

Expected:

- `DASHBOARD_INTERNAL_ERROR`

---

## 5. Security Tests

### TEST-011 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-012 — No ids accepted from query or body

Given:

- request com `authUserId`, `userProfileId`, `fitnessProfileId` ou `trainingPlanId`

Expected:

- request é rejeitada ou ignorada conforme o padrão HTTP atual do projeto

### TEST-013 — No Nutrition or AI access

Then:

- não acessa `Nutrition`
- não acessa `AI`

---

## 6. Aggregation Tests

### TEST-014 — progressSummary only uses authenticated user's active fitness scope

Then:

- logs de outros escopos não entram no resumo

### TEST-015 — trainingPlan null does not fail response

Then:

- resposta continua `200 OK`

### TEST-016 — fitnessProfile null does not fail response

Then:

- resposta continua `200 OK`

---

## 7. E2E Scenario

### TEST-017 — Full API flow

Request:

```http
GET /dashboard/home
Authorization: Bearer <access-token>
```

Expected:

- `200 OK`
- resposta consolidada segura
- nenhum dado é alterado

### TEST-018 — Without token

Expected:

- `401 AUTH_INVALID_SESSION`

### TEST-019 — Missing user profile

Expected:

- `404 USER_PROFILE_NOT_FOUND`

### TEST-020 — No fitness profile

Expected:

- `200 OK`
- `fitnessProfile = null`

### TEST-021 — No training plan

Expected:

- `200 OK`
- `trainingPlan = null`

---

## 8. Summary

Esse conjunto de testes garante:

- resolução correta pela sessão
- resposta consolidada e estável
- tolerância a onboarding parcial
- cálculo simples de `todayWorkout`
- resumo semanal seguro
- separação de `Nutrition` e `AI`
