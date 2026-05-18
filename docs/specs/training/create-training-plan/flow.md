# Flow — Create Training Plan

## 1. Overview

Este documento descreve o fluxo de execução do use-case `create-training-plan`.

No MVP, o fluxo termina com a criação de `TrainingPlan` e o retorno de dados seguros do plano.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Resolve UserProfile from authUserId
4. Resolve and authorize FitnessProfile ownership
5. Check if active TrainingPlan already exists
6. Generate TrainingPlan by rules
7. Persist TrainingPlan
8. Return safe training data
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

No MVP, `fitnessProfileId` entra no body do:

```txt
POST /training/plans
```

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

- `FITNESS_PROFILE_NOT_FOUND`

Esse erro é intencionalmente usado por segurança para não revelar detalhes internos do fluxo de autorização.

### Step 4 — Resolve and Authorize FitnessProfile Ownership

Usar `fitnessProfileId` do input para localizar o `FitnessProfile`.

Depois validar que o `FitnessProfile` pertence ao `UserProfile` autenticado.

Se o `fitnessProfileId` não existir:

- `FITNESS_PROFILE_NOT_FOUND`

Se o `fitnessProfileId` existir mas pertencer a outro usuário:

- `FITNESS_PROFILE_NOT_FOUND`

Esse erro é intencionalmente reutilizado para não revelar existência de recurso de outro usuário.

### Step 5 — Check if Active TrainingPlan Already Exists

Buscar `TrainingPlan` ativo por `fitnessProfileId`, considerando:

```txt
status = active
```

Se já existir:

- `TRAINING_PLAN_ALREADY_EXISTS`

No MVP, o Mongo/Mongoose também deve manter índice único em `fitnessProfileId` para reforçar essa regra na persistência.

### Step 6 — Generate TrainingPlan By Rules

Gerar o plano de forma determinística:

- `goal = gain_muscle` -> foco em força
- `goal = lose_weight` -> circuito
- `goal = maintain` -> plano balanceado
- `activityLevel` define número de dias na semana

Regras mínimas:

- força usa `3–5 sets`
- força usa `6–12 reps`
- circuito usa mais reps e menos descanso
- `maintain` usa `2–4 sets`
- `maintain` usa `8–15 reps`
- `maintain` usa intensidade `moderate`
- `maintain` mistura força, mobilidade e cardio leve
- `low = 2` dias por semana
- `medium = 3` dias por semana
- `high = 4` dias por semana

### Step 7 — Persist TrainingPlan

Persistir:

```ts
{
  fitnessProfileId,
  goal,
  activityLevel,
  weeklySchedule,
  status: "active"
}
```

### Step 8 — Return Safe Training Data

Retornar apenas:

```ts
{
  trainingPlan: {
    (id,
      fitnessProfileId,
      goal,
      activityLevel,
      weeklySchedule,
      status,
      createdAt);
  }
}
```

---

## 4. Alternative Flows

### 4.1 Invalid Session

Se o token estiver ausente, inválido ou expirado:

- `AUTH_INVALID_SESSION`

### 4.2 Fitness Profile Not Found

Se não existir `FitnessProfile` para o `fitnessProfileId` informado:

- `FITNESS_PROFILE_NOT_FOUND`

Se o `FitnessProfile` existir mas não pertencer ao `UserProfile` autenticado:

- `FITNESS_PROFILE_NOT_FOUND`

### 4.3 Training Plan Already Exists

Se já existir `TrainingPlan` ativo para o `FitnessProfile`:

- `TRAINING_PLAN_ALREADY_EXISTS`

### 4.4 Persistence Error

Se ocorrer erro inesperado no banco:

- `TRAINING_PLAN_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated User
   ->
POST /training/plans
   ->
Training Controller
   ->
Validate Session
   ->
CreateTrainingPlanUseCase
   ->
Resolve UserProfile
   ->
Resolve FitnessProfile
   ->
Check Ownership
   ->
TrainingPlanRepository.findActiveByFitnessProfileId
   ->
Generate Plan By Rules
   ->
TrainingPlanRepository.create
   ->
Return Safe Training Response
```

---

## 6. Important Decision

Para o MVP:

- o endpoint é protegido por JWT
- `fitnessProfileId` vem do body
- `authUserId` vem da sessão
- existe checagem de ownership via `UserProfile`
- a geração é baseada em regras, não IA
- não existe integração com `Nutrition`

Motivos:

- reduz custo e complexidade
- deixa o comportamento previsível
- facilita testes automatizados

---

## 7. Summary

O fluxo de criação do plano deve ser:

`validar sessão -> obter authUserId -> resolver UserProfile -> validar ownership do FitnessProfile -> verificar duplicidade -> gerar plano por regras -> persistir -> retornar resposta segura`

Nenhuma lógica de `Nutrition` ou `AI` deve existir neste use-case.
