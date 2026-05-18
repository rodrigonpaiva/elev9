# Errors — Replay Coach Feedback

## 1. Overview

Este documento define os erros possíveis do use-case `replay-coach-feedback`.

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
AI_COACH_REPLAY_INVALID_INPUT
AUTH_INVALID_SESSION
USER_PROFILE_NOT_FOUND
COACH_FEEDBACK_NOT_FOUND
COACH_FEEDBACK_REPLAY_CONTEXT_MISSING
COACH_FEEDBACK_GENERATOR_VERSION_UNSUPPORTED
COACH_FEEDBACK_REPLAY_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 AI_COACH_REPLAY_INVALID_INPUT

Usado quando o cliente envia body indevido.

Mensagem segura:

```txt
Invalid coach feedback replay input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.2 AUTH_INVALID_SESSION

Usado quando a sessão é inválida.

Mensagem segura:

```txt
Invalid session.
```

HTTP status:

```txt
401 Unauthorized
```

### 4.3 USER_PROFILE_NOT_FOUND

Usado quando não existe `UserProfile` para o `authUserId`.

Mensagem segura:

```txt
User profile not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.4 COACH_FEEDBACK_NOT_FOUND

Usado quando o feedback não existe ou não pertence ao usuário autenticado.

Mensagem segura:

```txt
Coach feedback not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.5 COACH_FEEDBACK_REPLAY_CONTEXT_MISSING

Usado quando o documento não possui `contextSnapshot` suficiente para replay.

Mensagem segura:

```txt
Coach feedback replay context is missing.
```

HTTP status:

```txt
400 Bad Request
```

### 4.6 COACH_FEEDBACK_GENERATOR_VERSION_UNSUPPORTED

Usado quando `generatorVersion` não é suportado pelo replay atual.

Mensagem segura:

```txt
Coach feedback generator version is unsupported.
```

HTTP status:

```txt
400 Bad Request
```

### 4.7 COACH_FEEDBACK_REPLAY_INTERNAL_ERROR

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
- detalhes internos do generator

### 5.2 Ownership-safe read path

O endpoint não deve vazar a existência de feedbacks de outros usuários.

---

## 6. Error Mapping Table

```txt
AI_COACH_REPLAY_INVALID_INPUT                -> 400 -> Invalid coach feedback replay input.
AUTH_INVALID_SESSION                         -> 401 -> Invalid session.
USER_PROFILE_NOT_FOUND                       -> 404 -> User profile not found.
COACH_FEEDBACK_NOT_FOUND                     -> 404 -> Coach feedback not found.
COACH_FEEDBACK_REPLAY_CONTEXT_MISSING        -> 400 -> Coach feedback replay context is missing.
COACH_FEEDBACK_GENERATOR_VERSION_UNSUPPORTED -> 400 -> Coach feedback generator version is unsupported.
COACH_FEEDBACK_REPLAY_INTERNAL_ERROR         -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O replay deve falhar de forma segura, previsível e compatível com autenticação, ownership e versionamento do generator.
