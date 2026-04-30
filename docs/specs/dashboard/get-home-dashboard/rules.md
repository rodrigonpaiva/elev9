# Rules — Get Home Dashboard

## 1. Overview

Este documento define as regras de negócio do use-case `get-home-dashboard`.

No MVP, o objetivo é permitir leitura segura de um payload consolidado da home do usuário autenticado.

---

## 2. Identity Rules

### RULE-001 — authUserId comes only from session

`authUserId` deve vir exclusivamente da sessão/JWT validada.

O cliente nunca envia:

- `authUserId`
- `userProfileId`
- `fitnessProfileId`
- `trainingPlanId`

### RULE-002 — Resolve identity through session only

O fluxo obrigatório é:

```txt
session -> authUserId -> UserProfile -> active FitnessProfile
```

Nenhuma resolução por ids externos deve ser aceita.

---

## 3. User Profile Rules

### RULE-003 — UserProfile must exist

O sistema deve localizar `UserProfile` pelo `authUserId`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

### RULE-004 — user.name comes from UserProfile

`dashboard.user.name` deve ser derivado de `UserProfile.name`.

---

## 4. Fitness Profile Rules

### RULE-005 — Only active FitnessProfile can be used

O sistema deve localizar apenas `FitnessProfile` com:

```txt
status = active
```

Se não existir `FitnessProfile`:

- `fitnessProfile = null`

Se existir `FitnessProfile`, mas estiver inativo:

- tratar como ausência
- `fitnessProfile = null`

### RULE-006 — Absence of FitnessProfile does not fail dashboard

A ausência de `FitnessProfile` não deve derrubar o dashboard.

Nesse caso:

- `fitnessProfile = null`
- `trainingPlan = null`
- `progressSummary` zerado

Se `fitnessProfile = null`, então `trainingPlan` obrigatoriamente também deve ser `null`.

---

## 5. Training Plan Rules

### RULE-007 — Only active TrainingPlan can be used

O sistema deve localizar apenas `TrainingPlan` com:

```txt
status = active
```

Se não existir `TrainingPlan` ativo:

- `trainingPlan = null`

### RULE-008 — Absence of TrainingPlan does not fail dashboard

A ausência de `TrainingPlan` não deve derrubar o dashboard.

O payload continua válido com:

- `trainingPlan = null`

### RULE-009 — Do not create or mutate TrainingPlan

Este use-case é apenas de leitura.

Ele não pode:

- criar `TrainingPlan`
- alterar `TrainingPlan`

---

## 6. todayWorkout Rules

### RULE-010 — todayWorkout uses UTC weekday

No MVP, `todayWorkout` deve ser calculado pelo dia da semana UTC atual.

### RULE-011 — Match todayWorkout by weeklySchedule.dayIndex

O sistema deve:

- calcular o dia da semana UTC atual
- localizar item correspondente em `weeklySchedule[].dayIndex`

### RULE-012 — Missing day match returns null

Se não houver item correspondente ao dia UTC:

- `todayWorkout = null`

---

## 7. Progress Summary Rules

### RULE-013 — Dashboard always uses weekly summary

No dashboard, `progressSummary.period` é sempre:

```txt
week
```

### RULE-014 — Zero summary when no logs

Se não houver logs elegíveis:

- `workoutsCompleted = 0`
- `totalDurationMinutes = 0`
- `averageDurationMinutes = 0`
- `lastWorkoutDate = null`

### RULE-015 — Summary uses only authenticated user's active fitness scope

O resumo deve considerar apenas logs ligados aos `TrainingPlans` do `FitnessProfile` ativo do usuário autenticado.

---

## 8. Response Rules

### RULE-016 — Return safe fields only

A resposta deve conter apenas:

- `user.name`
- `fitnessProfile` resumido
- `trainingPlan` resumido
- `progressSummary`

### RULE-017 — Never expose auth internals

A resposta nunca deve retornar:

- `password`
- `passwordHash`
- token JWT
- ids sensíveis de outros usuários

---

## 9. Cross-Context Rules

### RULE-018 — No Nutrition access

O use-case não pode acessar `Nutrition`.

### RULE-019 — No AI access

O use-case não pode acessar `AI`.

### RULE-020 — Read-only operation

Este use-case é apenas de leitura.

Ele não pode alterar qualquer dado de domínio.

---

## 10. Error Rules

### RULE-021 — Invalid session has priority

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

Esse erro acontece antes de qualquer consulta de domínio.

### RULE-022 — Missing UserProfile maps to USER_PROFILE_NOT_FOUND

Se o `UserProfile` não existir:

- `USER_PROFILE_NOT_FOUND`

### RULE-023 — Unexpected failures map to DASHBOARD_INTERNAL_ERROR

Erros inesperados de infraestrutura ou execução:

- `DASHBOARD_INTERNAL_ERROR`

---

## 11. Summary

As regras principais do MVP são:

- resolver identidade apenas pela sessão
- exigir `UserProfile`
- tolerar ausência de `FitnessProfile`
- tolerar ausência de `TrainingPlan`
- usar resumo semanal
- usar `todayWorkout` por dia UTC
- não acessar `Nutrition` nem `AI`
- não alterar dados
