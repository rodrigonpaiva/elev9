# Errors — Create Training Plan

## 1. Overview

Este documento define os erros possíveis do use-case `create-training-plan`.

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
TRAINING_PLAN_ALREADY_EXISTS
FITNESS_PROFILE_NOT_FOUND
AUTH_INVALID_SESSION
TRAINING_PLAN_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 TRAINING_PLAN_ALREADY_EXISTS

Usado quando já existe `TrainingPlan` ativo para o `FitnessProfile`.

Também deve ser usado quando o MongoDB/Mongoose retornar erro de índice único em `fitnessProfileId`, inclusive em condição de corrida.

Mensagem segura:

```txt
Training plan already exists.
```

HTTP status:

```txt
409 Conflict
```

### 4.2 FITNESS_PROFILE_NOT_FOUND

Usado quando o `FitnessProfile` referenciado não existe.

Também deve ser usado quando o `fitnessProfileId` existe, mas pertence a outro usuário autenticado.

Esse erro deve acontecer antes de qualquer tentativa de criação do `TrainingPlan`.

Mensagem segura:

```txt
Fitness profile not found.
```

HTTP status:

```txt
404 Not Found
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

### 4.4 TRAINING_PLAN_INTERNAL_ERROR

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

Erros de índice único do MongoDB/Mongoose para `fitnessProfileId` não devem vazar detalhes do provider.

Eles devem ser traduzidos para:

```txt
TRAINING_PLAN_ALREADY_EXISTS
```

### 5.3 Ownership-safe error response

O sistema não deve revelar se um `fitnessProfileId` de outro usuário existe.

Esse caso deve responder com:

```txt
FITNESS_PROFILE_NOT_FOUND
```

---

## 6. Error Mapping Table

```txt
TRAINING_PLAN_ALREADY_EXISTS -> 409 -> Training plan already exists.
FITNESS_PROFILE_NOT_FOUND    -> 404 -> Fitness profile not found.
AUTH_INVALID_SESSION         -> 401 -> Invalid session.
TRAINING_PLAN_INTERNAL_ERROR -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O sistema deve falhar de forma segura, mantendo separação entre sessão, fitness e planejamento de treino.
