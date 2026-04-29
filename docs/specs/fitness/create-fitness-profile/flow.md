# Flow — Create Fitness Profile

## 1. Overview

Este documento descreve o fluxo de execução do use-case `create-fitness-profile`.

No MVP, o fluxo termina com a criação de `FitnessProfile` e o retorno de dados seguros do perfil.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Resolve UserProfile from authUserId
4. Validate fitness input
5. Check if active FitnessProfile already exists
6. Create FitnessProfile
7. Return safe fitness data
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

### Step 2 — Validate Session Before Use-Case

No MVP, a sessão deve ser validada antes do use-case por `AuthGuard` ou middleware reutilizando:

```txt
auth/validate-session
```

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Resolve UserProfile From authUserId

Usar `authUserId` vindo da sessão para localizar o `UserProfile`.

Se não existir `UserProfile`:

- `USER_PROFILE_NOT_FOUND`

### Step 4 — Validate Fitness Input

Validar:

- `heightCm` entre `100` e `250`
- `weightKg` entre `30` e `300`
- `goal` válido
- `activityLevel` válido
- `daysPerWeek` entre `1` e `7`
- `minutesPerSession` entre `10` e `180`
- `limitations` opcional

Se inválido:

- `FITNESS_PROFILE_INVALID_INPUT`

### Step 5 — Check if Active FitnessProfile Already Exists

Buscar `FitnessProfile` ativo por `userProfileId`, considerando:

```txt
status = active
```

Se já existir:

- `FITNESS_PROFILE_ALREADY_EXISTS`

No MVP, o Mongo/Mongoose também deve manter índice único em `userProfileId` para reforçar essa regra na persistência.

### Step 6 — Create FitnessProfile

Persistir:

```ts
{
  userProfileId,
  heightCm,
  weightKg,
  goal,
  activityLevel,
  trainingAvailability,
  limitations?,
  status: "active"
}
```

### Step 7 — Return Safe Fitness Data

Retornar apenas:

```ts
{
  fitnessProfile: {
    id,
    userProfileId,
    heightCm,
    weightKg,
    goal,
    activityLevel,
    trainingAvailability,
    limitations?,
    status,
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

### 4.3 Invalid Input

Se o body estiver ausente ou inválido:

- `FITNESS_PROFILE_INVALID_INPUT`

### 4.4 Fitness Profile Already Exists

Se já existir `FitnessProfile` ativo para o `UserProfile`:

- `FITNESS_PROFILE_ALREADY_EXISTS`

### 4.5 Persistence Error

Se ocorrer erro inesperado no banco:

- `FITNESS_PROFILE_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated User
   ->
POST /fitness/profile
   ->
Fitness Controller
   ->
Validate Session
   ->
Resolve UserProfile
   ->
CreateFitnessProfileUseCase
   ->
Validate Input
   ->
FitnessProfileRepository.findActiveByUserProfileId
   ->
FitnessProfileRepository.create
   ->
Return Safe Fitness Response
```

---

## 6. Important Decision

Para o MVP:

- o endpoint é protegido por JWT
- `authUserId` vem da sessão para localizar `UserProfile`
- o vínculo persistido é `userProfileId`
- não existe criação em cascata de `TrainingPlan`

Motivos:

- reforça ownership correto do `Fitness Context`
- reduz acoplamento entre contexts
- mantém o onboarding modular

---

## 7. Summary

O fluxo de criação de perfil fitness deve ser:

`validar sessão -> resolver UserProfile -> validar body -> verificar duplicidade -> criar perfil fitness -> retornar resposta segura`

Nenhuma lógica de `Training`, `Nutrition` ou `AI` deve existir neste use-case.
