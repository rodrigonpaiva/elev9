# Flow — Register User

## 1. Overview

Este documento descreve o fluxo de execução do use-case `register-user`.

No MVP, o fluxo termina com a criação de `AuthUser`. A criação de `UserProfile` acontece depois, em outro use-case.

---

## 2. Main Flow

```txt
1. Receive input
2. Validate input
3. Normalize email
4. Check if email already exists
5. Hash password
6. Create AuthUser
7. Return safe user data
```

---

## 3. Detailed Flow

### Step 1 — Receive Input

O sistema recebe:

```ts
{
  name: string;
  email: string;
  password: string;
}
```

### Step 2 — Validate Input

Validar:

- nome obrigatório
- nome normalizado com `trim` antes da validação
- e-mail válido
- senha forte o suficiente

Se inválido:

- `AUTH_INVALID_INPUT`
- `AUTH_PASSWORD_TOO_WEAK`

### Step 3 — Normalize Email

O e-mail deve ser convertido para `trim + lowercase`.

Exemplo:

```txt
 Rodrigo@Email.COM  -> rodrigo@email.com
```

### Step 4 — Check Existing Email

Buscar usuário pelo e-mail normalizado.

Se já existir:

- `AUTH_EMAIL_ALREADY_EXISTS`

### Step 5 — Hash Password

A senha nunca deve ser salva em texto puro.

O backend deve gerar:

```txt
passwordHash
```

### Step 6 — Create AuthUser

Persistir:

```ts
{
  email,
  passwordHash,
  isEmailVerified: false
}
```

### Step 7 — Return Safe Output

Retornar apenas dados seguros:

```ts
{
  user: {
    id,
    email,
    name,
    isEmailVerified,
    createdAt
  }
}
```

`name` pode ser ecoado no output do use-case, mas deve refletir o valor normalizado com `trim` e não implica criação de `UserProfile`.

---

## 4. Alternative Flows

### 4.1 Invalid Input

Se algum campo obrigatório estiver ausente ou inválido:

- `AUTH_INVALID_INPUT`

### 4.2 Weak Password

Se a senha não atender aos critérios mínimos:

- `AUTH_PASSWORD_TOO_WEAK`

### 4.3 Email Already Exists

Se o e-mail já existir:

- `AUTH_EMAIL_ALREADY_EXISTS`

### 4.4 Persistence Error

Se ocorrer erro ao salvar no banco:

- `AUTH_INTERNAL_ERROR`

Exceção:

- violação de índice único de e-mail deve retornar `AUTH_EMAIL_ALREADY_EXISTS`, inclusive em condição de corrida

---

## 5. Sequence Diagram

```txt
Guest User
   ->
POST /auth/register
   ->
Auth Controller
   ->
RegisterUserUseCase
   ->
Validate Input
   ->
Normalize Email
   ->
AuthUserRepository.findByEmail
   ->
PasswordHasher.hash
   ->
AuthUserRepository.create
   ->
Return Safe User
```

---

## 6. Important Decision

Para o MVP:

- `register-user` cria apenas `AuthUser`
- `UserProfile` será criado em `users/create-user-profile`

Motivos:

- mantém `Auth` simples
- evita acoplamento com `Users`
- reduz dependências transacionais entre contexts

---

## 7. Summary

O fluxo de registro deve ser:

`validar -> normalizar -> verificar duplicidade -> hashear senha -> salvar AuthUser -> retornar resposta segura`

Nenhuma lógica de perfil de usuário, fitness, nutrição ou IA deve existir neste use-case.
