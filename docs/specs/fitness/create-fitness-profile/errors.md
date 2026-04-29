# Errors — Create Fitness Profile

## 1. Overview

Este documento define os erros possíveis do use-case `create-fitness-profile`.

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
FITNESS_PROFILE_INVALID_INPUT
FITNESS_PROFILE_ALREADY_EXISTS
USER_PROFILE_NOT_FOUND
AUTH_INVALID_SESSION
FITNESS_PROFILE_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 FITNESS_PROFILE_INVALID_INPUT

Usado quando o input fitness é inválido.

Causas comuns:

- `heightCm` fora da faixa
- `weightKg` fora da faixa
- `goal` inválido
- `activityLevel` inválido
- `daysPerWeek` inválido
- `minutesPerSession` inválido

Mensagem segura:

```txt
Invalid fitness profile input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.2 FITNESS_PROFILE_ALREADY_EXISTS

Usado quando já existe `FitnessProfile` ativo para o `UserProfile`.

Também deve ser usado quando o MongoDB/Mongoose retornar erro de índice único em `userProfileId`, inclusive em condição de corrida.

Mensagem segura:

```txt
Fitness profile already exists.
```

HTTP status:

```txt
409 Conflict
```

### 4.3 USER_PROFILE_NOT_FOUND

Usado quando o `UserProfile` do usuário autenticado não existe.

Esse erro deve acontecer antes de qualquer tentativa de criação do `FitnessProfile`.

Mensagem segura:

```txt
User profile not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.4 AUTH_INVALID_SESSION

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

### 4.5 FITNESS_PROFILE_INTERNAL_ERROR

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

Erros de índice único do MongoDB/Mongoose para `userProfileId` não devem vazar detalhes do provider.

Eles devem ser traduzidos para:

```txt
FITNESS_PROFILE_ALREADY_EXISTS
```

---

## 6. Error Mapping Table

```txt
FITNESS_PROFILE_INVALID_INPUT  -> 400 -> Invalid fitness profile input.
FITNESS_PROFILE_ALREADY_EXISTS -> 409 -> Fitness profile already exists.
USER_PROFILE_NOT_FOUND         -> 404 -> User profile not found.
AUTH_INVALID_SESSION           -> 401 -> Invalid session.
FITNESS_PROFILE_INTERNAL_ERROR -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O sistema deve falhar de forma segura, mantendo separação entre sessão, perfil funcional e perfil fitness.
