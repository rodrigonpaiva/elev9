# Errors — Get Coach Feedback Debug History

## 1. Overview

Este documento define os erros possíveis do use-case `get-coach-feedback-debug-history`.

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
AUTH_INVALID_SESSION
USER_PROFILE_NOT_FOUND
AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT
AI_FEEDBACK_DEBUG_HISTORY_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 AUTH_INVALID_SESSION

Usado quando a sessão é inválida.

Mensagem segura:

```txt
Invalid session.
```

HTTP status:

```txt
401 Unauthorized
```

### 4.2 USER_PROFILE_NOT_FOUND

Usado quando não existe `UserProfile` para o `authUserId` autenticado.

Mensagem segura:

```txt
User profile not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.3 AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT

Usado quando a query ou o body são inválidos.

Causas comuns:

- `limit < 1`
- `limit > 100`
- `limit` não inteiro
- body com qualquer campo

Mensagem segura:

```txt
Invalid coach feedback debug history input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.4 AI_FEEDBACK_DEBUG_HISTORY_INTERNAL_ERROR

Usado quando ocorre falha inesperada no fluxo.

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
- detalhes internos do banco
- detalhes internos de autenticação

### 5.2 Resolve only through session

O sistema não deve aceitar ids vindos do cliente para contornar o fluxo de autorização.

### 5.3 Ownership-safe read path

O endpoint não deve vazar metadata interna de outros usuários.

---

## 6. Error Mapping Table

```txt
AUTH_INVALID_SESSION                    -> 401 -> Invalid session.
USER_PROFILE_NOT_FOUND                  -> 404 -> User profile not found.
AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT -> 400 -> Invalid coach feedback debug history input.
AI_FEEDBACK_DEBUG_HISTORY_INTERNAL_ERROR -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O fluxo deve falhar de forma segura, preservando autenticação, isolamento por usuário e compatibilidade com a camada interna de debug.
