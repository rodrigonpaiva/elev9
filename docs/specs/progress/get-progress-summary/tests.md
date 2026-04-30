# Tests — Get Progress Summary

## 1. Overview

Este documento define os cenários de teste do use-case `get-progress-summary`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar agregação por período
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

### TEST-001 — Return weekly summary successfully

Given:

- sessão válida
- `UserProfile` existente
- `FitnessProfile` ativo existente
- logs elegíveis na última semana UTC

Then:

- o resumo é retornado com sucesso
- `period = week`
- os campos agregados são calculados corretamente

### TEST-002 — Return monthly summary successfully

Given:

- `period = month`

Then:

- o resumo é retornado com sucesso
- a janela usa os últimos 30 dias UTC

### TEST-003 — Default period is week

Given:

- `period` ausente

Then:

- o sistema usa `week`

### TEST-004 — Empty period returns zeros

Given:

- não existem logs elegíveis

Then:

- `workoutsCompleted = 0`
- `totalDurationMinutes = 0`
- `averageDurationMinutes = 0`
- `lastWorkoutDate = null`

### TEST-005 — No TrainingPlans returns zeros

Given:

- não existem `TrainingPlans` para o `FitnessProfile` ativo

Then:

- `workoutsCompleted = 0`
- `totalDurationMinutes = 0`
- `averageDurationMinutes = 0`
- `lastWorkoutDate = null`

### TEST-006 — lastWorkoutDate uses latest UTC date

Given:

- múltiplos logs elegíveis em datas diferentes

Then:

- `lastWorkoutDate` corresponde à data UTC mais recente

### TEST-007 — Week includes only logs inside last 7 UTC days

Given:

- logs dentro e fora dos últimos 7 dias UTC

Then:

- apenas logs dentro da janela entram no resumo

### TEST-008 — Month includes only logs inside last 30 UTC days

Given:

- logs dentro e fora dos últimos 30 dias UTC

Then:

- apenas logs dentro da janela entram no resumo

### TEST-009 — UTC day boundary is respected

Given:

- logs antes e depois de `00:00 UTC`

Then:

- a inclusão no período respeita exatamente a data UTC persistida

### TEST-010 — averageDurationMinutes uses 2 decimal places

Given:

- múltiplos logs elegíveis com média fracionária

Then:

- `averageDurationMinutes` é arredondado com 2 casas decimais

---

## 4. Business Errors

### TEST-011 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-012 — Fitness profile not found

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-013 — Inactive fitness profile returns FITNESS_PROFILE_NOT_FOUND

Given:

- existe `FitnessProfile`
- ele não está `active`

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-014 — Invalid period returns PROGRESS_SUMMARY_INVALID_INPUT

Expected:

- `PROGRESS_SUMMARY_INVALID_INPUT`

### TEST-015 — Internal database failure

Expected:

- `PROGRESS_SUMMARY_INTERNAL_ERROR`

---

## 5. Security Tests

### TEST-016 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-017 — authUserId never comes from body

Expected:

- o sistema ignora qualquer tentativa de enviar `authUserId`

### TEST-018 — No ids accepted from query or body

Given:

- request com `userProfileId` ou `fitnessProfileId`

Expected:

- request é rejeitada ou ignorada conforme o padrão HTTP atual do projeto
- o use-case continua resolvendo apenas pela sessão

### TEST-019 — Extra query param is rejected

Given:

- request com query param diferente de `period`

Expected:

- request é rejeitada na camada HTTP quando aplicável

### TEST-020 — No Nutrition or AI access

Then:

- não acessa `Nutrition`
- não acessa `AI`

---

## 6. Aggregation Tests

### TEST-021 — Count only logs linked to TrainingPlans of active FitnessProfile

Then:

- logs fora desse escopo não entram no resumo

### TEST-022 — Ignore logs outside selected UTC period

Then:

- logs fora da janela UTC não entram no cálculo

### TEST-023 — Average duration is computed from eligible logs only

Then:

- `averageDurationMinutes` usa apenas logs elegíveis

### TEST-024 — Logs from other trainingPlanIds in the same period are ignored

Given:

- existem logs no mesmo período UTC
- parte dos logs pertence a `trainingPlanIds` fora do escopo do `FitnessProfile` ativo

Then:

- esses logs não entram no resumo

---

## 7. E2E Scenario

### TEST-025 — Full API flow

Request:

```http
GET /progress/summary?period=week
Authorization: Bearer <access-token>
```

Expected:

- `200 OK`
- resposta segura
- nenhum dado é alterado

### TEST-026 — Without token

Expected:

- `401 AUTH_INVALID_SESSION`

### TEST-027 — Missing fitness profile

Expected:

- `404 FITNESS_PROFILE_NOT_FOUND`

### TEST-028 — Invalid period

Expected:

- `400 PROGRESS_SUMMARY_INVALID_INPUT`

---

## 8. Summary

Esse conjunto de testes garante:

- resolução correta pela sessão
- uso correto de `period`
- agregação correta em UTC
- retorno de zeros quando não houver logs
- ausência de ids vindos do cliente
- resposta segura
- separação de `Nutrition` e `AI`
