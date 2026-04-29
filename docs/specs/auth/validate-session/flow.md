# Flow — Validate Session

## 1. Overview

Este documento descreve o fluxo de execução do use-case `validate-session`.

No MVP, o fluxo termina com a validação do `accessToken JWT` e o retorno de dados seguros do usuário autenticado.

---

## 2. Main Flow

```txt
1. Receive authorization header
2. Validate input format
3. Extract bearer token
4. Verify accessToken JWT
5. Read authenticated payload
6. Return safe auth data
```

---

## 3. Detailed Flow

### Step 1 — Receive Authorization Header

O sistema recebe:

```ts
{
  authorizationHeader: string;
}
```

### Step 2 — Validate Input Format

Validar:

- header obrigatório
- header como string
- formato `Bearer <token>`
- prefixo `Bearer` aceito de forma case-insensitive

Se inválido:

- `AUTH_INVALID_INPUT`

### Step 3 — Extract Bearer Token

Extrair apenas o token bruto do header.

Exemplo:

```txt
Authorization: Bearer abc.def.ghi
Authorization: bearer abc.def.ghi
```

Token extraído:

```txt
abc.def.ghi
```

### Step 4 — Verify accessToken JWT

Validar o token usando `AccessTokenVerifier`.

Se o token estiver:

- ausente
- malformado
- inválido
- expirado

Retornar:

- `AUTH_INVALID_SESSION`

### Step 5 — Read Authenticated Payload

Após sucesso, usar payload mínimo:

```ts
{
  sub: string;
  email: string;
}
```

### Step 6 — Return Safe Auth Data

Retornar apenas:

```ts
{
  user: {
    id,
    email
  }
}
```

---

## 4. Alternative Flows

### 4.1 Invalid Input

Se o header estiver ausente ou malformado:

- `AUTH_INVALID_INPUT`

### 4.2 Invalid Session

Se o token estiver ausente, inválido ou expirado:

- `AUTH_INVALID_SESSION`

### 4.3 Token Verification Error

Se ocorrer falha inesperada no provider JWT:

- `AUTH_INTERNAL_ERROR`

---

## 5. Sequence Diagram

```txt
Authenticated Client
   ->
GET /auth/session
   ->
Auth Controller
   ->
ValidateSessionUseCase
   ->
Validate Authorization Header
   ->
Extract Bearer Token
   ->
AccessTokenVerifier.verifyAccessToken
   ->
Return Safe Auth Response
```

---

## 6. Important Decision

Para o MVP:

- validação usa apenas `accessToken JWT`
- não existe `refresh token`
- payload mínimo é `sub + email`
- erro de sessão inválida é sempre genérico

Motivos:

- simplifica autenticação do MVP
- reduz complexidade de sessão
- mantém proteção básica de endpoints

---

## 7. Summary

O fluxo de validação de sessão deve ser:

`validar header -> extrair bearer token -> verificar JWT -> retornar resposta segura`

Nenhuma lógica de `Users`, `Fitness`, `Nutrition` ou `AI` deve existir neste use-case.
