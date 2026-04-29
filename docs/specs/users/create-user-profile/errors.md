# Errors — Create User Profile

## 1. Overview

Este documento define os erros possíveis do use-case `create-user-profile`.

Todos os erros devem ser:

- previsíveis
- estáveis
- seguros
- fáceis de testar

---

## 2. Error Shape

```ts
type UseCaseError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 3. Error Codes

```txt
USER_PROFILE_INVALID_INPUT
USER_PROFILE_ALREADY_EXISTS
AUTH_INVALID_SESSION
USER_PROFILE_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 USER_PROFILE_INVALID_INPUT

Usado quando o input do perfil é inválido.

Causas comuns:

- `name` ausente
- `name` curto ou longo demais
- `birthDate` inválida
- `gender` inválido

Mensagem segura:

```txt
Invalid user profile input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.2 USER_PROFILE_ALREADY_EXISTS

Usado quando já existe `UserProfile` para o `AuthUser`.

Também deve ser usado quando o MongoDB/Mongoose retornar violação de índice único em `authUserId`, inclusive em condição de corrida.

Mensagem segura:

```txt
User profile already exists.
```

HTTP status:

```txt
409 Conflict
```

### 4.3 AUTH_INVALID_SESSION

Usado quando a sessão é inválida.

Causas comuns:

- token ausente
- token inválido
- token expirado

Mensagem segura:

```txt
Invalid session.
```

HTTP status:

```txt
401 Unauthorized
```

### 4.4 USER_PROFILE_INTERNAL_ERROR

Usado quando ocorre falha inesperada no fluxo.

Causas comuns:

- erro no banco
- erro inesperado no servidor

Mensagem segura:

```txt
An unexpected error occurred.
```

HTTP status:

```txt
500 Internal Server Error
```

---

## 5. Security Rules

### 5.1 Never expose internal details

Não retornar:

- stack trace
- detalhes do banco
- detalhes internos de autenticação

### 5.2 Unique index translation

Erros de índice único do MongoDB/Mongoose para `authUserId` não devem vazar detalhes do provider.

Eles devem ser traduzidos para:

```txt
USER_PROFILE_ALREADY_EXISTS
```

---

## 6. Error Mapping Table

```txt
USER_PROFILE_INVALID_INPUT  -> 400 -> Invalid user profile input.
USER_PROFILE_ALREADY_EXISTS -> 409 -> User profile already exists.
AUTH_INVALID_SESSION        -> 401 -> Invalid session.
USER_PROFILE_INTERNAL_ERROR -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O sistema deve falhar de forma segura, mantendo separação entre autenticação e perfil funcional.
