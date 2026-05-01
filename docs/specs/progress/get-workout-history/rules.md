# Rules — Get Workout History

## 1. Overview

Este documento define as regras de negócio do use-case `get-workout-history`.

No MVP, o objetivo é permitir leitura segura do histórico recente de treinos do usuário autenticado.

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
session -> authUserId -> UserProfile -> active FitnessProfile -> active TrainingPlans -> WorkoutLogs
```

Nenhuma resolução por ids externos deve ser aceita.

---

## 3. Query Rules

### RULE-003 — limit must be an integer between 1 and 50

`limit` deve:

- ser inteiro
- ser maior ou igual a `1`
- ser menor ou igual a `50`

Se inválido:

- `WORKOUT_HISTORY_INVALID_INPUT`

### RULE-004 — default limit is 20

Se `limit` não for enviado:

- usar `20`

### RULE-005 — Accept only limit query param

`GET /progress/workout-logs` aceita apenas:

- `limit`

Qualquer outro query param deve ser rejeitado na camada HTTP quando aplicável.

### RULE-006 — Use UTC dates

Todo o fluxo deve operar com datas UTC.

`WorkoutLog.date` deve ser tratado como string UTC no formato:

```txt
YYYY-MM-DD
```

Como o formato é `YYYY-MM-DD` em UTC:

- a ordenação lexicográfica é equivalente à temporal para `date`

---

## 4. User Profile Rules

### RULE-007 — UserProfile must exist

O sistema deve localizar `UserProfile` pelo `authUserId`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

---

## 5. Fitness Profile Rules

### RULE-008 — Only active FitnessProfile can be used

O sistema deve localizar apenas `FitnessProfile` com:

```txt
status = active
```

Se não existir `FitnessProfile`:

- `FITNESS_PROFILE_NOT_FOUND`

Se existir `FitnessProfile`, mas estiver inativo:

- `FITNESS_PROFILE_NOT_FOUND`

### RULE-009 — Never reveal other users' progress data

O fluxo não pode aceitar ids vindos do cliente.

Isso impede tentativa de leitura de histórico de outro usuário.

---

## 6. Workout Log Rules

### RULE-010 — Resolve active TrainingPlans explicitly before logs

O sistema deve:

1. buscar `TrainingPlans` ativos do `FitnessProfile` ativo
2. extrair `trainingPlanIds`
3. buscar `WorkoutLogs` com:

```txt
trainingPlanId IN trainingPlanIds
```

Não usar join implícito.

### RULE-011 — No TrainingPlans means empty history

Se não houver `TrainingPlans` ativos para o `FitnessProfile` ativo:

- retornar `workoutLogs = []`

### RULE-012 — Consider only logs linked to active TrainingPlans of active FitnessProfile

O histórico deve incluir apenas `WorkoutLogs`:

- ligados aos `TrainingPlans` ativos do `FitnessProfile` ativo
- pertencentes ao usuário autenticado por resolução indireta

### RULE-013 — No eligible logs returns empty array

Se não houver logs elegíveis:

- retornar `workoutLogs = []`

### RULE-014 — Apply limit after ownership-safe filtering

O sistema deve:

1. resolver o escopo seguro de `trainingPlanIds`
2. buscar apenas logs desse escopo
3. ordenar os logs
4. aplicar `limit`

O `limit` nunca pode ser aplicado antes do filtro de ownership.

### RULE-015 — Order by date desc and createdAt desc

O histórico deve ser ordenado por:

1. `date desc`
2. `createdAt desc`

Como `date` usa `YYYY-MM-DD` em UTC:

- a ordenação lexicográfica descendente é equivalente à temporal para o primeiro critério

---

## 7. Cross-Context Rules

### RULE-016 — No Nutrition access

O use-case não pode acessar `Nutrition`.

### RULE-017 — No AI access

O use-case não pode acessar `AI`.

### RULE-018 — Read-only operation

Este use-case é apenas de leitura.

Ele não pode:

- criar logs
- alterar logs
- alterar `TrainingPlan`
- alterar qualquer outro dado

---

## 8. Error Rules

### RULE-019 — Invalid session has priority

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

Esse erro acontece antes de qualquer consulta de domínio.

### RULE-020 — Invalid limit maps to WORKOUT_HISTORY_INVALID_INPUT

Valores inválidos de `limit`:

- `WORKOUT_HISTORY_INVALID_INPUT`

### RULE-021 — Unexpected failures map to WORKOUT_HISTORY_INTERNAL_ERROR

Erros inesperados de infraestrutura ou execução:

- `WORKOUT_HISTORY_INTERNAL_ERROR`

---

## 9. Summary

O use-case deve operar com:

- resolução exclusiva via sessão
- escopo seguro por `FitnessProfile` ativo e `TrainingPlans` ativos
- ordenação previsível
- sem acesso a `Nutrition` e `AI`
- sem mutação de dados
