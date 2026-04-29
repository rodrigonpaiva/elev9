# Tests — Create Training Plan

## 1. Overview

Este documento define os cenários de teste do use-case `create-training-plan`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar regras de geração
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

### TEST-001 — Create training plan successfully for gain_muscle

Given:

- sessão válida
- `FitnessProfile` existente
- `goal = gain_muscle`

Then:

- plano é criado
- `fitnessProfileId` é persistido
- `status` default é aplicado
- resposta contém apenas dados seguros
- exercícios usam perfil de força com `3–5 sets` e `6–12 reps`

### TEST-002 — Create training plan successfully for lose_weight

Given:

- `goal = lose_weight`

Then:

- plano é criado
- exercícios usam formato circuito
- reps são maiores
- descanso é menor

### TEST-003 — activityLevel defines number of days

Given:

- `activityLevel = low`
- `activityLevel = medium`
- `activityLevel = high`

Then:

- `low` gera `2` dias
- `medium` gera `3` dias
- `high` gera `4` dias

### TEST-004 — Generated sessions never exceed FitnessProfile availability

Given:

- `FitnessProfile` com disponibilidade semanal definida

Then:

- a quantidade de sessões geradas nunca excede `trainingAvailability.daysPerWeek`

### TEST-005 — maintain generates balanced plan

Given:

- `goal = maintain`

Then:

- plano usa foco balanceado
- usa `2–4 sets`
- usa `8–15 reps`
- usa intensidade `moderate`
- mistura força, mobilidade e cardio leve

### TEST-006 — Default status applied

Then:

- `status = "active"`

---

## 4. Business Errors

### TEST-007 — Fitness profile not found

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-008 — Fitness profile from another user returns FITNESS_PROFILE_NOT_FOUND

Given:

- o `fitnessProfileId` existe
- ele pertence a outro usuário

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-009 — Training plan already exists

Expected:

- `TRAINING_PLAN_ALREADY_EXISTS`

### TEST-010 — Unique index race condition

Given:

- condição de corrida na persistência
- MongoDB/Mongoose retorna erro de índice único em `fitnessProfileId`

Expected:

- `TRAINING_PLAN_ALREADY_EXISTS`

---

## 5. Security Tests

### TEST-011 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-012 — authUserId never comes from body

Expected:

- o sistema ignora qualquer tentativa de enviar `authUserId` no body

### TEST-013 — No Nutrition or AI access

Then:

- não acessa `Nutrition`
- não acessa `AI`

---

## 6. Persistence Tests

### TEST-014 — TrainingPlan is stored in database

Then:

- documento existe em `training_plans`

### TEST-015 — Only one active plan per FitnessProfile

Then:

- duplicação não é permitida

---

## 7. Failure Scenarios

### TEST-016 — Database failure

Expected:

- `TRAINING_PLAN_INTERNAL_ERROR`

---

## 8. E2E Scenario

### TEST-017 — Full API flow

Request:

```http
POST /training/plans
Authorization: Bearer <access-token>
```

Expected:

- `201 Created`
- resposta segura
- apenas `TrainingPlan` persistido

---

## 9. Summary

Esse conjunto de testes garante:

- ownership correto do `FitnessProfile`
- vínculo correto com `FitnessProfile`
- unicidade de plano ativo
- geração correta por regras
- resposta segura
- separação de `Nutrition` e `AI`
