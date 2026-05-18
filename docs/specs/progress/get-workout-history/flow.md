# Flow — Get Workout History

## 1. Overview

Este documento descreve o fluxo de execução do use-case `get-workout-history`.

No MVP, o fluxo termina com a leitura dos `WorkoutLogs` relevantes e o retorno da lista ordenada.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Validate and normalize limit
4. Resolve UserProfile from authUserId
5. Resolve active FitnessProfile from UserProfile
6. Resolve active TrainingPlans from active FitnessProfile
7. Extract trainingPlanIds
8. Resolve WorkoutLogs linked to trainingPlanIds
9. Sort logs by date desc, then createdAt desc
10. Return safe workout history
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

No MVP, o endpoint é:

```txt
GET /progress/workout-logs
```

O cliente não envia `authUserId`, `userProfileId` ou `fitnessProfileId`.

O endpoint aceita apenas o query param funcional:

```txt
limit
```

Qualquer outro query param deve ser rejeitado na camada HTTP quando aplicável.

### Step 2 — Validate Session Before Use-Case

No MVP, a sessão deve ser validada antes do use-case por `AuthGuard` ou middleware reutilizando:

```txt
auth/validate-session
```

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Validate and Normalize Limit

Validar o query param opcional:

```txt
limit
```

Se ausente:

- usar `20`

Se inválido:

- `WORKOUT_HISTORY_INVALID_INPUT`

No MVP:

- `limit` deve ser inteiro
- `limit` deve estar entre `1` e `50`

### Step 4 — Resolve UserProfile From authUserId

Usar `authUserId` vindo da sessão para localizar o `UserProfile` autenticado.

Se não existir `UserProfile`:

- `USER_PROFILE_NOT_FOUND`

### Step 5 — Resolve Active FitnessProfile From UserProfile

Usar `userProfileId` para localizar o `FitnessProfile` com:

```txt
status = active
```

Se não existir `FitnessProfile`:

- `FITNESS_PROFILE_NOT_FOUND`

Se existir `FitnessProfile`, mas não estiver `active`:

- `FITNESS_PROFILE_NOT_FOUND`

### Step 6 — Resolve Active TrainingPlans From Active FitnessProfile

Localizar apenas os `TrainingPlans` com:

```txt
status = active
```

pertencentes ao `FitnessProfile` ativo.

Se não houver `TrainingPlans`:

- retornar `workoutLogs = []` com sucesso

### Step 7 — Extract trainingPlanIds

Extrair os `trainingPlanIds` dos planos encontrados.

No MVP, o filtro de logs deve usar explicitamente:

```txt
trainingPlanId IN trainingPlanIds
```

Não usar join implícito.

### Step 8 — Resolve WorkoutLogs Linked To trainingPlanIds

Buscar apenas `WorkoutLogs`:

- ligados aos `TrainingPlans` ativos do `FitnessProfile` ativo
- usando `trainingPlanId IN trainingPlanIds`
- usando datas UTC persistidas nos logs

Se não houver logs:

- retornar `workoutLogs = []` com sucesso

### Step 9 — Sort Logs By date desc, Then createdAt desc

Os logs retornados devem ser ordenados por:

1. `date desc`
2. `createdAt desc`

No MVP:

- `date` usa string `YYYY-MM-DD` em UTC
- `createdAt` é usado como critério secundário para logs do mesmo dia
- a ordenação principal deve acontecer no repositório/banco
- a aplicação pode manter uma ordenação defensiva se necessário

### Step 10 — Return Safe Workout History

Retornar apenas:

```ts
{
  workoutLogs: [
    {
      id,
      trainingPlanId,
      workoutDayIndex,
      durationMinutes,
      completedExercises,
      feedback,
      date,
      createdAt,
    },
  ];
}
```

---

## 4. Alternative Flows

### 4.1 Invalid Session

Se o token estiver ausente, inválido ou expirado:

- `AUTH_INVALID_SESSION`

### 4.2 Invalid Limit

Se `limit` não for inteiro entre `1` e `50`:

- `WORKOUT_HISTORY_INVALID_INPUT`

### 4.3 User Profile Not Found

Se não existir `UserProfile` para o `authUserId` da sessão:

- `USER_PROFILE_NOT_FOUND`

### 4.4 Fitness Profile Not Found

Se não existir `FitnessProfile` ativo para o `UserProfile`:

- `FITNESS_PROFILE_NOT_FOUND`

### 4.5 No TrainingPlans

Se não houver `TrainingPlans` ativos para o `FitnessProfile` ativo:

- retornar `workoutLogs = []` com sucesso

### 4.6 No WorkoutLogs

Se não houver logs elegíveis:

- retornar `workoutLogs = []` com sucesso

### 4.7 Persistence Error

Se ocorrer erro inesperado no banco:

- `WORKOUT_HISTORY_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated User
   ->
GET /progress/workout-logs?limit=20
   ->
Progress Controller
   ->
Validate Session
   ->
GetWorkoutHistoryUseCase
   ->
Resolve UserProfile
   ->
Resolve active FitnessProfile
   ->
Resolve active TrainingPlans
   ->
Resolve WorkoutLogs by trainingPlanIds
   ->
Sort Logs
   ->
Return Workout History
```
