# Flow — Create User Profile

## 1. Overview

Este documento descreve o fluxo de execução do use-case `create-user-profile`.

No MVP, o fluxo termina com a criação de `UserProfile` e o retorno de dados seguros do perfil.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Build input using authUserId from session
4. Validate profile input
5. Check if UserProfile already exists
6. Create UserProfile with defaults
7. Return safe profile data
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

### Step 2 — Validate Session

Validar a sessão autenticada antes de montar o input do use-case.

No MVP, essa validação acontece antes do use-case, via `AuthGuard` ou middleware reutilizando:

```txt
auth/validate-session
```

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Build Input Using authUserId From Session

Montar input usando:

- `authUserId` vindo da sessão/JWT
- campos do body permitidos

O body não pode informar `authUserId`.

### Step 4 — Validate Profile Input

Validar:

- `name` obrigatório
- `name` com `trim` antes da validação
- `birthDate` válida quando presente
- `gender` dentro do enum permitido

Se inválido:

- `USER_PROFILE_INVALID_INPUT`

### Step 5 — Check if UserProfile Already Exists

Buscar perfil existente por `authUserId`.

Se já existir:

- `USER_PROFILE_ALREADY_EXISTS`

### Step 6 — Create UserProfile With Defaults

Persistir:

```ts
{
  authUserId,
  name,
  birthDate?,
  gender?,
  language: "en-US",
  timezone: "UTC",
  status: "active"
}
```

### Step 7 — Return Safe Profile Data

Retornar apenas:

```ts
{
  userProfile: {
    id,
    authUserId,
    name,
    birthDate?,
    gender?,
    language,
    timezone,
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

### 4.2 Invalid Input

Se o body estiver ausente ou inválido:

- `USER_PROFILE_INVALID_INPUT`

### 4.3 Profile Already Exists

Se já existir `UserProfile` para o `AuthUser`:

- `USER_PROFILE_ALREADY_EXISTS`

### 4.4 Persistence Error

Se ocorrer erro inesperado no banco:

- `USER_PROFILE_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated User
   ->
POST /users/profile
   ->
Users Controller
   ->
Validate Session
   ->
CreateUserProfileUseCase
   ->
Validate Input
   ->
UserProfileRepository.findByAuthUserId
   ->
UserProfileRepository.create
   ->
Return Safe Profile Response
```

---

## 6. Important Decision

Para o MVP:

- o endpoint é protegido por JWT
- `authUserId` vem da sessão
- não existe criação em cascata de outros perfis

Motivos:

- separa autenticação de identidade funcional
- reduz acoplamento entre contexts
- mantém o onboarding simples

---

## 7. Summary

O fluxo de criação de perfil deve ser:

`validar sessão -> montar input com authUserId -> validar body -> verificar duplicidade -> criar perfil -> retornar resposta segura`

Nenhuma lógica de `Fitness`, `Nutrition` ou `AI` deve existir neste use-case.
