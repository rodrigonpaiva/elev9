# Flow — Get My Fitness Profile

## 1. Overview

Este documento descreve o fluxo de execução do use-case `get-my-fitness-profile`.

No MVP, o fluxo termina com o retorno do `FitnessProfile` ativo do usuário autenticado.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Resolve UserProfile from authUserId
4. Resolve active FitnessProfile from userProfileId
5. Return safe fitness data
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

No MVP, o endpoint é:

```txt
GET /fitness/profile
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

- `USER_PROFILE_NOT_FOUND`

### Step 4 — Resolve Active FitnessProfile From userProfileId

Usar `userProfileId` do `UserProfile` autenticado para localizar o `FitnessProfile` ativo.

Condição:

```txt
status = active
```

O use-case busca apenas `FitnessProfile` com `status = active`.

`FitnessProfile` inativo não deve ser retornado.

Se não existir `FitnessProfile` ativo:

- `FITNESS_PROFILE_NOT_FOUND`

### Step 5 — Return Safe Fitness Data

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
    limitations,
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

### 4.3 Fitness Profile Not Found

Se não existir `FitnessProfile` ativo para o `UserProfile` autenticado:

- `FITNESS_PROFILE_NOT_FOUND`

### 4.4 Persistence Error

Se ocorrer erro inesperado no banco:

- `FITNESS_PROFILE_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated User
   ->
GET /fitness/profile
   ->
Fitness Controller
   ->
Validate Session
   ->
GetMyFitnessProfileUseCase
   ->
Resolve UserProfile
   ->
FitnessProfileRepository.findActiveByUserProfileId
   ->
Return Safe Fitness Response
```

---

## 6. Important Decision

Para o MVP:

- o endpoint é protegido por JWT
- `authUserId` vem da sessão
- nenhum id vem do cliente
- o retorno inclui apenas o perfil ativo do usuário autenticado

Motivos:

- evita enumeração de recursos
- reduz acoplamento com a camada cliente
- mantém o fluxo consistente com a arquitetura orientada à sessão

---

## 7. Summary

O fluxo de leitura do perfil fitness deve ser:

`validar sessão -> resolver UserProfile -> resolver FitnessProfile ativo -> retornar resposta segura`

Nenhuma lógica de `Training`, `Nutrition` ou `AI` deve existir neste use-case.
