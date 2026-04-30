# Flow — Log Workout

## 1. Overview

Este documento descreve o fluxo de execução do use-case `log-workout`.

No MVP, o fluxo termina com a criação de um `WorkoutLog`.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Validate payload structure at HTTP layer
4. Resolve UserProfile from authUserId
5. Resolve active FitnessProfile from userProfileId
6. Resolve and authorize TrainingPlan ownership
7. Validate workoutDayIndex against weeklySchedule[].dayIndex
8. Validate workout log semantics
9. Generate UTC date
10. Check log uniqueness for trainingPlanId + workoutDayIndex + date
11. Create WorkoutLog
12. Return safe workout log data
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

No MVP, `trainingPlanId` entra no body do:

```txt
POST /progress/workout-logs
```

### Step 2 — Validate Session Before Use-Case

No MVP, a sessão deve ser validada antes do use-case por `AuthGuard` ou middleware reutilizando:

```txt
auth/validate-session
```

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Validate Payload Structure at HTTP Layer

A validação estrutural do payload acontece na camada HTTP.

Exemplos:

- tipos inválidos
- campos obrigatórios ausentes
- enums inválidos
- arrays vazios quando proibidos

Se inválido:

- `WORKOUT_LOG_INVALID_INPUT`

### Step 4 — Resolve UserProfile From authUserId

Usar `authUserId` vindo da sessão para localizar o `UserProfile` autenticado.

Se não existir `UserProfile`:

- `USER_PROFILE_NOT_FOUND`

### Step 5 — Resolve Active FitnessProfile From userProfileId

Usar `userProfileId` do `UserProfile` autenticado para localizar o `FitnessProfile` ativo.

Condição:

```txt
status = active
```

Se não existir `FitnessProfile` ativo:

- `FITNESS_PROFILE_NOT_FOUND`

### Step 6 — Resolve and Authorize TrainingPlan Ownership

Usar `trainingPlanId` do input para localizar o `TrainingPlan`.

Depois validar que o `TrainingPlan` pertence ao `FitnessProfile` ativo do usuário autenticado.

Se o `TrainingPlan` não existir:

- `TRAINING_PLAN_NOT_FOUND`

Se o `TrainingPlan` existir mas pertencer a outro usuário:

- `TRAINING_PLAN_NOT_FOUND`

Esse erro é intencionalmente reutilizado para não revelar existência do recurso.

Ownership check deve acontecer antes de validar detalhes do plano.

### Step 7 — Validate workoutDayIndex Against weeklySchedule[].dayIndex

Validar que `workoutDayIndex` existe em:

```txt
TrainingPlan.weeklySchedule[].dayIndex
```

Não validar por posição do array.

Se não existir:

- `WORKOUT_LOG_INVALID_INPUT`

### Step 8 — Validate Workout Log Semantics

Validar:

- `durationMinutes` entre `1` e `300`
- `completedExercises` não vazio
- `setsDone` inteiro `>= 0`
- `repsDone` inteiro `>= 0`
- `notes` máximo `500`

Se inválido:

- `WORKOUT_LOG_INVALID_INPUT`

### Step 9 — Generate UTC date

Gerar `date` no servidor.

`date` é gerada no momento do request no servidor.

Formato:

```txt
YYYY-MM-DD
```

Timezone:

```txt
UTC
```

`date` não vem do cliente.

No MVP, nenhuma data fornecida pelo usuário é usada para compor essa chave.

### Step 10 — Check Log Uniqueness

Verificar se já existe `WorkoutLog` para:

```txt
trainingPlanId + workoutDayIndex + date
```

Se já existir:

- `WORKOUT_LOG_ALREADY_EXISTS`

### Step 11 — Create WorkoutLog

Persistir:

```ts
{
  trainingPlanId,
  workoutDayIndex,
  durationMinutes,
  completedExercises,
  feedback?,
  date
}
```

### Step 12 — Return Safe Workout Log Data

Retornar apenas:

```ts
{
  workoutLog: {
    id,
    trainingPlanId,
    workoutDayIndex,
    durationMinutes,
    completedExercises,
    feedback?,
    date,
    createdAt
  }
}
```

---

## 4. Alternative Flows

### 4.1 Invalid Session

Se o token estiver ausente, inválido ou expirado:

- `AUTH_INVALID_SESSION`

### 4.2 User Profile Not Found

Se não existir `UserProfile` para o usuário autenticado:

- `USER_PROFILE_NOT_FOUND`

### 4.3 Fitness Profile Not Found

Se não existir `FitnessProfile` ativo:

- `FITNESS_PROFILE_NOT_FOUND`

### 4.4 Training Plan Not Found

Se o `TrainingPlan` não existir ou não pertencer ao usuário autenticado:

- `TRAINING_PLAN_NOT_FOUND`

### 4.5 Duplicate Workout Log

Se já existir log no mesmo dia para o mesmo treino e dia de treino:

- `WORKOUT_LOG_ALREADY_EXISTS`

### 4.6 Invalid Input

Se o body estiver ausente, malformado ou semanticamente inválido:

- `WORKOUT_LOG_INVALID_INPUT`

### 4.7 Persistence Error

Se ocorrer erro inesperado no banco:

- `WORKOUT_LOG_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated User
   ->
POST /progress/workout-logs
   ->
Progress Controller
   ->
Validate Session
   ->
Resolve UserProfile
   ->
Resolve Active FitnessProfile
   ->
Resolve TrainingPlan
   ->
Check Ownership
   ->
Validate workoutDayIndex against weeklySchedule[].dayIndex
   ->
Check Log Uniqueness
   ->
WorkoutLogRepository.create
   ->
Return Safe Workout Log Response
```

---

## 6. Important Decision

Para o MVP:

- o endpoint é protegido por JWT
- `authUserId` vem da sessão
- `trainingPlanId` vem do body
- `date` é gerada no servidor em `YYYY-MM-DD` UTC
- o log não altera `TrainingPlan`
- não existe integração com `AI`

Motivos:

- separa planejamento de execução
- mantém histórico auditável
- reduz acoplamento entre contexts

---

## 7. Summary

O fluxo de log do treino deve ser:

`validar sessão -> validar payload estrutural -> resolver UserProfile -> resolver FitnessProfile ativo -> validar ownership do TrainingPlan -> validar workoutDayIndex por weeklySchedule[].dayIndex -> gerar date UTC -> verificar duplicidade -> criar log -> retornar resposta segura`

Nenhuma lógica de `AI`, `Nutrition` ou modificação de `TrainingPlan` deve existir neste use-case.
