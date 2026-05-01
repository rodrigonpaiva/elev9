# Tests — Get Workout History

## 1. Overview

Este documento define os cenários de teste do use-case `get-workout-history`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar ordenação e limite
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

### TEST-001 — Return workout history successfully

Given:

- sessão válida
- `UserProfile` existente
- `FitnessProfile` ativo existente
- `TrainingPlans` ativos existentes
- logs elegíveis existentes

Then:

- o histórico é retornado com sucesso
- os logs pertencem apenas ao escopo do usuário autenticado

### TEST-002 — Default limit is 20

Given:

- `limit` ausente

Then:

- o sistema usa `20`

### TEST-003 — Custom limit is applied

Given:

- `limit = 5`

Then:

- no máximo `5` logs são retornados

### TEST-004 — Empty history when no TrainingPlans

Given:

- não existem `TrainingPlans` ativos para o `FitnessProfile` ativo

Then:

- `workoutLogs = []`

### TEST-005 — Empty history when no logs

Given:

- existem `TrainingPlans` ativos
- não existem logs elegíveis

Then:

- `workoutLogs = []`

### TEST-006 — Logs are ordered by date desc and createdAt desc

Given:

- múltiplos logs em datas diferentes
- múltiplos logs no mesmo dia

Then:

- a ordenação principal usa `date desc`
- a ordenação secundária usa `createdAt desc`

### TEST-007 — UTC dates are preserved

Given:

- logs elegíveis com `date` em UTC

Then:

- a resposta preserva `date` como `YYYY-MM-DD`

---

## 4. Business Errors

### TEST-008 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-009 — Fitness profile not found

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-010 — Inactive fitness profile returns FITNESS_PROFILE_NOT_FOUND

Given:

- existe `FitnessProfile`
- ele não está `active`

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-011 — Invalid limit returns WORKOUT_HISTORY_INVALID_INPUT

Expected:

- `WORKOUT_HISTORY_INVALID_INPUT`

### TEST-012 — Internal database failure

Expected:

- `WORKOUT_HISTORY_INTERNAL_ERROR`

---

## 5. Security Tests

### TEST-013 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-014 — authUserId never comes from body

Expected:

- o sistema ignora qualquer tentativa de enviar `authUserId`

### TEST-015 — No ids accepted from query or body

Given:

- request com `userProfileId` ou `fitnessProfileId`

Expected:

- request é rejeitada ou ignorada conforme o padrão HTTP atual do projeto
- o use-case continua resolvendo apenas pela sessão

### TEST-016 — Extra query param is rejected

Given:

- request com query param diferente de `limit`

Expected:

- request é rejeitada na camada HTTP quando aplicável

### TEST-017 — No Nutrition or AI access

Then:

- não acessa `Nutrition`
- não acessa `AI`

---

## 6. Filtering and Ordering Tests

### TEST-018 — Count only logs linked to active TrainingPlans of active FitnessProfile

Then:

- logs fora desse escopo não entram no histórico

### TEST-019 — Ignore logs from other trainingPlanIds

Given:

- existem logs de outros `trainingPlanIds`

Then:

- esses logs não entram na resposta

### TEST-020 — Apply limit after filtering and ordering

Given:

- existem mais logs elegíveis do que o `limit`

Then:

- o sistema ordena corretamente
- o sistema retorna apenas os primeiros `N` após ordenação

### TEST-021 — Same-day logs use createdAt desc as tie-breaker

Given:

- múltiplos logs com a mesma `date`

Then:

- o mais recente por `createdAt` aparece primeiro

### TEST-022 — limit 50 caps result set when more than 50 logs exist

Given:

- existem mais de `50` logs elegíveis
- `limit = 50`

Then:

- no máximo `50` logs são retornados
- a ordenação correta é preservada

---

## 7. E2E Scenario

### TEST-023 — GET /progress/workout-logs

Fluxo:

1. registrar usuário
2. autenticar usuário
3. criar `UserProfile`
4. criar `FitnessProfile`
5. criar `TrainingPlan`
6. criar múltiplos `WorkoutLogs`
7. consultar `GET /progress/workout-logs`

Validações:

- retorna `200`
- retorna logs ordenados
- respeita `limit`
- não retorna logs fora do escopo do usuário
