# Flow — Get Home Dashboard

## 1. Overview

Este documento descreve o fluxo de execução do use-case `get-home-dashboard`.

No MVP, o fluxo termina com a montagem de um payload consolidado para a home do app.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Resolve UserProfile from authUserId
4. Resolve active FitnessProfile from UserProfile
5. Resolve active TrainingPlan from FitnessProfile
6. Resolve weekly ProgressSummary
7. Compute todayWorkout from UTC weekday
8. Return safe dashboard payload
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

No MVP, o endpoint é:

```txt
GET /dashboard/home
```

O cliente não envia `authUserId`, `userProfileId`, `fitnessProfileId` ou `trainingPlanId`.

O endpoint não aceita body nem query params funcionais no MVP.

### Step 2 — Validate Session Before Use-Case

No MVP, a sessão deve ser validada antes do use-case por `AuthGuard` ou middleware reutilizando:

```txt
auth/validate-session
```

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Resolve UserProfile From authUserId

Usar `authUserId` vindo da sessão para localizar o `UserProfile` autenticado.

Se não existir `UserProfile`:

- `USER_PROFILE_NOT_FOUND`

### Step 4 — Resolve Active FitnessProfile From UserProfile

Usar `userProfileId` para localizar o `FitnessProfile` com:

```txt
status = active
```

Se não existir `FitnessProfile`:

- `fitnessProfile = null`
- `trainingPlan = null`
- `progressSummary` deve retornar zeros

Se existir `FitnessProfile`, mas não estiver `active`:

- tratar como ausência de `FitnessProfile`

### Step 5 — Resolve Active TrainingPlan From FitnessProfile

Usar `fitnessProfileId` do `FitnessProfile` ativo para localizar o `TrainingPlan` com:

```txt
status = active
```

Se não existir `TrainingPlan` ativo:

- `trainingPlan = null`

### Step 6 — Resolve Weekly ProgressSummary

O dashboard sempre usa resumo semanal no MVP:

```txt
period = week
```

Se houver `FitnessProfile` ativo:

- calcular `progressSummary` usando o mesmo algoritmo e as mesmas regras de `progress/get-progress-summary`
- no MVP, a composição pode ser implementada internamente no `Dashboard Context`

Se não houver `FitnessProfile`:

- retornar resumo com zeros

### Step 7 — Compute todayWorkout From UTC Weekday

No MVP, `todayWorkout` é definido pelo dia da semana UTC atual.

Decisão fechada:

- calcular o índice do dia UTC atual
- buscar correspondência em `TrainingPlan.weeklySchedule[].dayIndex`
- se houver correspondência, retornar esse treino
- se não houver correspondência, `todayWorkout = null`

### Step 8 — Return Safe Dashboard Payload

Retornar apenas:

```ts
{
  dashboard: {
    (user, fitnessProfile, trainingPlan, progressSummary);
  }
}
```

---

## 4. Alternative Flows

### 4.1 Invalid Session

Se o token estiver ausente, inválido ou expirado:

- `AUTH_INVALID_SESSION`

### 4.2 User Profile Not Found

Se não existir `UserProfile` para o `authUserId` da sessão:

- `USER_PROFILE_NOT_FOUND`

### 4.3 Fitness Profile Not Found

Se não existir `FitnessProfile` ativo:

- continuar com sucesso
- `fitnessProfile = null`
- `trainingPlan = null`
- `progressSummary` zerado

### 4.4 Training Plan Not Found

Se não existir `TrainingPlan` ativo:

- continuar com sucesso
- `trainingPlan = null`

### 4.5 Persistence Error

Se ocorrer erro inesperado no banco:

- `DASHBOARD_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated User
   ->
GET /dashboard/home
   ->
Dashboard Controller
   ->
Validate Session
   ->
GetHomeDashboardUseCase
   ->
Resolve UserProfile
   ->
Resolve active FitnessProfile
   ->
Resolve active TrainingPlan
   ->
Resolve weekly ProgressSummary
   ->
Compute todayWorkout
   ->
Return Safe Dashboard Response
```

---

## 6. Important Decision

Para o MVP:

- o endpoint é protegido por JWT
- `authUserId` vem da sessão
- `UserProfile` é obrigatório
- `FitnessProfile` é opcional na resposta
- `TrainingPlan` é opcional na resposta
- `progressSummary` sempre usa `week`
- `todayWorkout` usa o dia da semana UTC
- não existe integração com `Nutrition`
- não existe integração com `AI`

Motivos:

- reduz round-trips do app
- mantém a home simples e determinística
- suporta onboarding parcial sem falha total

---

## 7. Summary

O fluxo da home deve ser:

`validar sessão -> resolver UserProfile -> resolver FitnessProfile ativo -> resolver TrainingPlan ativo -> resolver resumo semanal -> calcular todayWorkout em UTC -> retornar payload seguro`

Nenhuma escrita, `Nutrition` ou `AI` deve existir neste use-case.
