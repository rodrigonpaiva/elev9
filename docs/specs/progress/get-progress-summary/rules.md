# Rules — Get Progress Summary

## 1. Overview

Este documento define as regras de negócio do use-case `get-progress-summary`.

No MVP, o objetivo é permitir leitura segura de um resumo agregado de treinos recentes.

---

## 2. Identity Rules

### RULE-001 — authUserId comes only from session

`authUserId` deve vir exclusivamente da sessão/JWT validada.

O cliente nunca envia:

- `authUserId`
- `userProfileId`
- `fitnessProfileId`

### RULE-002 — Resolve identity through session only

O fluxo obrigatório é:

```txt
session -> authUserId -> UserProfile -> active FitnessProfile
```

Nenhuma resolução por ids externos deve ser aceita.

---

## 3. Period Rules

### RULE-003 — period must be week or month

`period` deve ser um dos valores:

- `week`
- `month`

Se inválido:

- `PROGRESS_SUMMARY_INVALID_INPUT`

### RULE-004 — default period is week

Se `period` não for enviado:

- usar `week`

### RULE-005 — Accept only period query param

`GET /progress/summary` aceita apenas:

- `period`

Qualquer outro query param deve ser rejeitado na camada HTTP quando aplicável.

### RULE-006 — Use UTC dates

Todo o cálculo deve usar datas UTC.

O período, o filtro de logs e `lastWorkoutDate` devem ser baseados em UTC.

### RULE-007 — week means last 7 UTC days including today

Para `period = week`:

- considerar os últimos 7 dias corridos incluindo hoje UTC
- `startDate` inclusivo
- `endDate` inclusivo

### RULE-008 — month means last 30 UTC days including today

Para `period = month`:

- considerar os últimos 30 dias corridos incluindo hoje UTC
- `startDate` inclusivo
- `endDate` inclusivo

---

## 4. User Profile Rules

### RULE-009 — UserProfile must exist

O sistema deve localizar `UserProfile` pelo `authUserId`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

---

## 5. Fitness Profile Rules

### RULE-010 — Only active FitnessProfile can be used

O sistema deve localizar apenas `FitnessProfile` com:

```txt
status = active
```

Se não existir `FitnessProfile`:

- `FITNESS_PROFILE_NOT_FOUND`

Se existir `FitnessProfile`, mas estiver inativo:

- `FITNESS_PROFILE_NOT_FOUND`

### RULE-011 — Never reveal other users' progress data

O fluxo não pode aceitar ids vindos do cliente.

Isso impede tentativa de leitura de progresso de outro usuário.

---

## 6. Workout Log Rules

### RULE-012 — Resolve TrainingPlans explicitly before logs

O sistema deve:

1. buscar `TrainingPlans` do `FitnessProfile` ativo
2. extrair `trainingPlanIds`
3. buscar `WorkoutLogs` com:

```txt
trainingPlanId IN trainingPlanIds
```

Não usar join implícito.

### RULE-013 — No TrainingPlans means empty summary

Se não houver `TrainingPlans` para o `FitnessProfile` ativo:

- retornar resumo vazio com sucesso

### RULE-014 — Consider only logs linked to TrainingPlans of active FitnessProfile

O resumo deve incluir apenas `WorkoutLogs`:

- ligados aos `TrainingPlans` do `FitnessProfile` ativo
- pertencentes ao usuário autenticado por resolução indireta

### RULE-015 — Use WorkoutLog.date as UTC date string

O filtro temporal deve usar exatamente:

- `WorkoutLog.date`
- formato `YYYY-MM-DD`
- em UTC

### RULE-016 — Ignore logs outside the selected period

Logs fora da janela UTC do período selecionado não entram no resumo.

### RULE-017 — Empty logs return zero summary

Se não houver logs elegíveis no período:

- `workoutsCompleted = 0`
- `totalDurationMinutes = 0`
- `averageDurationMinutes = 0`
- `lastWorkoutDate = null`

---

## 7. Aggregation Rules

### RULE-018 — workoutsCompleted counts eligible logs

`workoutsCompleted` é a quantidade de `WorkoutLogs` elegíveis no período.

### RULE-019 — totalDurationMinutes sums eligible durations

`totalDurationMinutes` é a soma de `durationMinutes` dos logs elegíveis.

### RULE-020 — averageDurationMinutes uses eligible logs only

`averageDurationMinutes` é calculado apenas com logs elegíveis e arredondado com 2 casas decimais.

Se não houver logs:

- `averageDurationMinutes = 0`

Caso contrário:

- `averageDurationMinutes = round(totalDurationMinutes / workoutsCompleted, 2)`

### RULE-021 — lastWorkoutDate returns latest UTC log date

`lastWorkoutDate` deve retornar a data UTC mais recente entre os logs elegíveis, usando o formato:

```txt
YYYY-MM-DD
```

Como o formato é `YYYY-MM-DD` em UTC:

- o maior valor lexicográfico é equivalente ao maior valor temporal

Portanto, a escolha de `lastWorkoutDate` pode usar ordenação lexicográfica segura sobre `WorkoutLog.date`.

---

## 8. Cross-Context Rules

### RULE-022 — No Nutrition access

O use-case não pode acessar `Nutrition`.

### RULE-023 — No AI access

O use-case não pode acessar `AI`.

### RULE-024 — Read-only operation

Este use-case é apenas de leitura.

Ele não pode:

- criar logs
- alterar logs
- alterar `TrainingPlan`
- alterar qualquer outro dado

---

## 9. Error Rules

### RULE-025 — Invalid session has priority

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

Esse erro acontece antes de qualquer consulta de domínio.

### RULE-026 — Invalid period maps to PROGRESS_SUMMARY_INVALID_INPUT

Valores fora de `week` e `month`:

- `PROGRESS_SUMMARY_INVALID_INPUT`

### RULE-027 — Unexpected failures map to PROGRESS_SUMMARY_INTERNAL_ERROR

Erros inesperados de infraestrutura ou execução:

- `PROGRESS_SUMMARY_INTERNAL_ERROR`

---

## 10. Summary

As regras principais do MVP são:

- resolver identidade apenas pela sessão
- aceitar apenas `period = week | month`
- usar datas UTC
- considerar apenas logs ligados aos planos do `FitnessProfile` ativo
- retornar zeros quando não houver logs
- não aceitar ids do cliente
- não acessar `Nutrition` nem `AI`
- não alterar dados
