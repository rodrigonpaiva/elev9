# Flow — Get Progress Summary

## 1. Overview

Este documento descreve o fluxo de execução do use-case `get-progress-summary`.

No MVP, o fluxo termina com a leitura dos `WorkoutLogs` relevantes e o retorno de um resumo agregado.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Validate and normalize period
4. Resolve UserProfile from authUserId
5. Resolve active FitnessProfile from UserProfile
6. Resolve TrainingPlans from active FitnessProfile
7. Extract trainingPlanIds
8. Resolve WorkoutLogs for the selected UTC period
9. Aggregate summary
10. Return safe progress summary
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

No MVP, o endpoint é:

```txt
GET /progress/summary
```

O cliente não envia `authUserId`, `userProfileId` ou `fitnessProfileId`.

O endpoint aceita apenas o query param funcional:

```txt
period
```

Qualquer outro query param deve ser rejeitado na camada HTTP quando aplicável.

### Step 2 — Validate Session Before Use-Case

No MVP, a sessão deve ser validada antes do use-case por `AuthGuard` ou middleware reutilizando:

```txt
auth/validate-session
```

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Validate and Normalize Period

Validar o query param opcional:

```txt
period = week | month
```

Se ausente:

- usar `week`

Se inválido:

- `PROGRESS_SUMMARY_INVALID_INPUT`

No MVP:

- `week` = últimos 7 dias corridos incluindo hoje UTC
- `month` = últimos 30 dias corridos incluindo hoje UTC

A janela usa:

- `startDate` inclusivo
- `endDate` inclusivo

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

### Step 6 — Resolve TrainingPlans From Active FitnessProfile

Localizar apenas os `TrainingPlans` com:

```txt
status = active
```

pertencentes ao `FitnessProfile` ativo.

No MVP, apenas logs ligados a esses planos podem entrar no resumo.

Se não houver `TrainingPlans`:

- retornar resumo vazio com sucesso

### Step 7 — Extract trainingPlanIds

Extrair os `trainingPlanIds` dos planos encontrados.

No MVP, o filtro de logs deve usar explicitamente:

```txt
trainingPlanId IN trainingPlanIds
```

Não usar join implícito.

### Step 8 — Resolve WorkoutLogs For The Selected Period

Usar datas UTC para definir a janela do período:

- `week` -> últimos 7 dias UTC
- `month` -> últimos 30 dias UTC

Buscar apenas `WorkoutLogs`:

- ligados aos `TrainingPlans` do `FitnessProfile` ativo
- contidos no período selecionado
- usando `trainingPlanId IN trainingPlanIds`
- usando `WorkoutLog.date` no formato `YYYY-MM-DD` UTC
- com `startDate` e `endDate` inclusivos

### Step 9 — Aggregate Summary

Calcular:

- `workoutsCompleted`
- `totalDurationMinutes`
- `averageDurationMinutes`
- `lastWorkoutDate`

Se não houver logs:

- retornar zeros
- `lastWorkoutDate = null`

Regra de média:

- se `workoutsCompleted = 0`, `averageDurationMinutes = 0`
- caso contrário:
  - `averageDurationMinutes = round(totalDurationMinutes / workoutsCompleted, 2)`

### Step 10 — Return Safe Progress Summary

Retornar apenas:

```ts
{
  summary: {
    period,
    workoutsCompleted,
    totalDurationMinutes,
    averageDurationMinutes,
    lastWorkoutDate
  }
}
```

---

## 4. Alternative Flows

### 4.1 Invalid Session

Se o token estiver ausente, inválido ou expirado:

- `AUTH_INVALID_SESSION`

### 4.2 Invalid Period

Se `period` não for `week` nem `month`:

- `PROGRESS_SUMMARY_INVALID_INPUT`

### 4.3 User Profile Not Found

Se não existir `UserProfile` para o `authUserId` da sessão:

- `USER_PROFILE_NOT_FOUND`

### 4.4 Fitness Profile Not Found

Se não existir `FitnessProfile` ativo para o `UserProfile`:

- `FITNESS_PROFILE_NOT_FOUND`

### 4.5 No Workout Logs

Se não houver logs no período:

- retornar resumo vazio com sucesso

### 4.6 No Training Plans

Se não houver `TrainingPlans` para o `FitnessProfile` ativo:

- retornar resumo vazio com sucesso

### 4.7 Persistence Error

Se ocorrer erro inesperado no banco:

- `PROGRESS_SUMMARY_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated User
   ->
GET /progress/summary?period=week
   ->
Progress Controller
   ->
Validate Session
   ->
GetProgressSummaryUseCase
   ->
Resolve UserProfile
   ->
Resolve active FitnessProfile
   ->
Resolve TrainingPlans
   ->
Resolve WorkoutLogs in UTC period
   ->
Aggregate Summary
   ->
Return Safe Progress Response
```

---

## 6. Important Decision

Para o MVP:

- o endpoint é protegido por JWT
- `authUserId` vem da sessão
- `period` é o único query param funcional
- o cálculo usa datas UTC
- o resumo considera apenas logs ligados aos `TrainingPlans` do `FitnessProfile` ativo
- não existe integração com `Nutrition`
- não existe integração com `AI`

Motivos:

- reduz ambiguidade temporal
- evita vazamento de dados de outros usuários
- mantém agregação simples e fácil de testar

---

## 7. Summary

O fluxo do resumo deve ser:

`validar sessão -> normalizar period -> resolver UserProfile -> resolver FitnessProfile ativo -> resolver TrainingPlans -> resolver WorkoutLogs no período UTC -> agregar resumo -> retornar resposta segura`

Nenhuma escrita, `Nutrition` ou `AI` deve existir neste use-case.
