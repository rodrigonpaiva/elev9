# Flow — Login User

## 1. Overview

Este documento descreve o fluxo de execução do use-case `login-user`.

No MVP, o fluxo termina com a geração de `accessToken JWT` e retorno de dados seguros do `AuthUser`.

---

## 2. Main Flow

```txt
1. Receive input
2. Validate input
3. Normalize email
4. Find AuthUser by email
5. Compare password with passwordHash
6. Generate accessToken JWT
7. Return safe auth data
```

---

## 3. Detailed Flow

### Step 1 — Receive Input

O sistema recebe:

```ts
{
  email: string;
  password: string;
}
```

### Step 2 — Validate Input

Validar:

- e-mail obrigatório
- e-mail válido
- senha obrigatória
- senha como string não vazia

Se inválido:

- `AUTH_INVALID_INPUT`

### Step 3 — Normalize Email

O e-mail deve ser convertido para `trim + lowercase`.

Exemplo:

```txt
 Rodrigo@Email.COM  -> rodrigo@email.com
```

### Step 4 — Find AuthUser by Email

Buscar `AuthUser` pelo e-mail normalizado.

Se não encontrar:

- `AUTH_INVALID_CREDENTIALS`

### Step 5 — Compare Password With passwordHash

Comparar a senha informada com o `passwordHash` persistido usando `PasswordHasher`.

Se a comparação falhar:

- `AUTH_INVALID_CREDENTIALS`

### Step 6 — Generate accessToken JWT

Gerar token de acesso para o usuário autenticado.

Exemplo conceitual de payload:

```ts
{
  sub: user.id,
  email: user.email
}
```

### Step 7 — Return Safe Auth Data

Retornar apenas:

```ts
{
  accessToken,
  user: {
    id,
    email,
    isEmailVerified,
    createdAt
  }
}
```

---

## 4. Alternative Flows

### 4.1 Invalid Input

Se algum campo obrigatório estiver ausente ou inválido:

- `AUTH_INVALID_INPUT`

### 4.2 Invalid Credentials

Se o usuário não existir ou a senha estiver incorreta:

- `AUTH_INVALID_CREDENTIALS`

### 4.3 Token Generation Error

Se ocorrer falha ao gerar o JWT:

- `AUTH_INTERNAL_ERROR`

### 4.4 Persistence Error

Se ocorrer erro inesperado ao consultar o banco:

- `AUTH_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Guest User
   ->
POST /auth/login
   ->
Auth Controller
   ->
LoginUserUseCase
   ->
Validate Input
   ->
Normalize Email
   ->
AuthUserRepository.findByEmail
   ->
PasswordHasher.compare
   ->
JwtTokenService.signAccessToken
   ->
Return Safe Auth Response
```

---

## 6. Important Decision

Para o MVP:

- `login-user` usa apenas `email + password`
- `accessToken JWT` é suficiente
- não existe `refresh token`
- erro de autenticação é sempre genérico

Motivos:

- simplifica o fluxo inicial
- reduz superfície de segurança no MVP
- evita vazar existência de contas

---

## 7. Summary

O fluxo de login deve ser:

`validar -> normalizar -> buscar usuário -> comparar senha -> gerar JWT -> retornar resposta segura`

Nenhuma lógica de `Users`, `Fitness`, `Nutrition` ou `AI` deve existir neste use-case.
