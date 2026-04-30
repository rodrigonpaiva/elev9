# Tests — Get My Training Plan

## 1. Overview

Este documento define os cenários de teste do use-case `get-my-training-plan`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar resolução exclusivamente pela sessão
- preservar isolamento do contexto `Training`

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

### TEST-001 — Return active training plan successfully

Given:

- sessão válida
- `UserProfile` existente
- `FitnessProfile` ativo existente
- `TrainingPlan` ativo existente

Then:

- o plano é retornado com sucesso
- a resposta contém apenas dados seguros

### TEST-002 — Return weeklySchedule exactly as persisted

Given:

- `TrainingPlan` ativo com `weeklySchedule` persistido

Then:

- `weeklySchedule` é retornado sem recalcular
- `format` está presente em todos os dias
- exercícios são retornados conforme persistidos

### TEST-003 — Return only active TrainingPlan

Given:

- existe `TrainingPlan` ativo

Then:

- apenas `status = active` é retornado

---

## 4. Business Errors

### TEST-004 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-005 — Fitness profile not found

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-006 — Inactive fitness profile returns FITNESS_PROFILE_NOT_FOUND

Given:

- existe `FitnessProfile`
- ele não está `active`

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-007 — Existing but inactive fitness profile returns FITNESS_PROFILE_NOT_FOUND

Given:

- existe `FitnessProfile`
- ele pertence ao `UserProfile` autenticado
- ele não está `active`

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-008 — Training plan not found

Expected:

- `TRAINING_PLAN_NOT_FOUND`

### TEST-009 — Internal database failure

Expected:

- `TRAINING_PLAN_INTERNAL_ERROR`

---

## 5. Security Tests

### TEST-010 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-011 — authUserId never comes from body

Expected:

- o sistema ignora qualquer tentativa de enviar `authUserId`

### TEST-012 — No ids accepted from query or body

Given:

- request com `trainingPlanId`, `fitnessProfileId` ou `userProfileId` em query/body

Expected:

- request é rejeitada ou ignorada conforme o padrão HTTP atual do projeto
- o use-case continua resolvendo apenas pela sessão

### TEST-013 — No Nutrition or AI access

Then:

- não acessa `Nutrition`
- não acessa `AI`

---

## 6. Persistence Tests

### TEST-014 — Read active TrainingPlan from database

Then:

- o documento é lido de `training_plans`

### TEST-015 — Read active FitnessProfile from database

Then:

- o `FitnessProfile` ativo é localizado antes da leitura do `TrainingPlan`

---

## 7. E2E Scenario

### TEST-016 — Full API flow

Request:

```http
GET /training/plans/current
Authorization: Bearer <access-token>
```

Expected:

- `200 OK`
- resposta segura
- nenhum dado é alterado

### TEST-017 — Missing user profile

Expected:

- `404 USER_PROFILE_NOT_FOUND`

### TEST-018 — Missing fitness profile

Expected:

- `404 FITNESS_PROFILE_NOT_FOUND`

### TEST-019 — Missing training plan

Expected:

- `404 TRAINING_PLAN_NOT_FOUND`

### TEST-020 — Without token

Expected:

- `401 AUTH_INVALID_SESSION`

---

## 8. Summary

Esse conjunto de testes garante:

- resolução correta pela sessão
- leitura correta de `UserProfile`, `FitnessProfile` e `TrainingPlan`
- retorno apenas do plano ativo
- ausência de ids vindos do cliente
- resposta segura
- separação de `Nutrition` e `AI`
