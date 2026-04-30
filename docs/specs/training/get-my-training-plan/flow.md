# Flow — Get My Training Plan

## 1. Overview

Este documento descreve o fluxo de execução do use-case `get-my-training-plan`.

No MVP, o fluxo termina com a leitura do `TrainingPlan` ativo e o retorno de dados seguros.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Resolve UserProfile from authUserId
4. Resolve active FitnessProfile from UserProfile
5. Resolve active TrainingPlan from FitnessProfile
6. Return safe training data
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

No MVP, o endpoint é:

```txt
GET /training/plans/current
```

O cliente não envia `trainingPlanId`, `fitnessProfileId`, `userProfileId` ou `authUserId`.

O endpoint não aceita body nem query params no MVP.

Dados extras devem ser rejeitados na camada HTTP quando aplicável, seguindo o padrão atual do projeto.

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

- `FITNESS_PROFILE_NOT_FOUND`

Se existir `FitnessProfile`, mas não estiver `active`:

- `FITNESS_PROFILE_NOT_FOUND`

Esse comportamento evita expor detalhes internos sobre recursos inativos.

### Step 5 — Resolve Active TrainingPlan From FitnessProfile

Usar `fitnessProfileId` do `FitnessProfile` ativo para localizar o `TrainingPlan` com:

```txt
status = active
```

Se não existir `TrainingPlan` ativo:

- `TRAINING_PLAN_NOT_FOUND`

O fluxo nunca deve aceitar um `trainingPlanId` vindo do cliente para evitar acesso a dados de outro usuário.

### Step 6 — Return Safe Training Data

Retornar apenas:

```ts
{
  trainingPlan: {
    id,
    fitnessProfileId,
    status,
    goal,
    activityLevel,
    weeklySchedule,
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

Se não existir `UserProfile` para o `authUserId` da sessão:

- `USER_PROFILE_NOT_FOUND`

### 4.3 Fitness Profile Not Found

Se não existir `FitnessProfile` ativo para o `UserProfile`:

- `FITNESS_PROFILE_NOT_FOUND`

### 4.4 Training Plan Not Found

Se não existir `TrainingPlan` ativo para o `FitnessProfile`:

- `TRAINING_PLAN_NOT_FOUND`

### 4.5 Persistence Error

Se ocorrer erro inesperado no banco:

- `TRAINING_PLAN_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated User
   ->
GET /training/plans/current
   ->
Training Controller
   ->
Validate Session
   ->
GetMyTrainingPlanUseCase
   ->
Resolve UserProfile
   ->
Resolve active FitnessProfile
   ->
Resolve active TrainingPlan
   ->
Return Safe Training Response
```

---

## 6. Important Decision

Para o MVP:

- o endpoint é protegido por JWT
- `authUserId` vem da sessão
- nenhum id vem do body, query ou path
- o fluxo resolve `UserProfile -> FitnessProfile ativo -> TrainingPlan ativo`
- o use-case não cria plano
- o use-case não altera plano
- não existe integração com `Nutrition`
- não existe integração com `AI`

Motivos:

- reduz superfície de ataque
- evita vazamento de ids sensíveis
- mantém leitura previsível e fácil de testar

---

## 7. Summary

O fluxo de leitura do plano deve ser:

`validar sessão -> obter authUserId -> resolver UserProfile -> resolver FitnessProfile ativo -> resolver TrainingPlan ativo -> retornar resposta segura`

Nenhuma lógica de criação, atualização, `Nutrition` ou `AI` deve existir neste use-case.
