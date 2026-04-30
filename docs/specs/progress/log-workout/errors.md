# Errors — Log Workout

## 1. Overview

Este documento define os erros possíveis do use-case `log-workout`.

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
FITNESS_PROFILE_NOT_FOUND
TRAINING_PLAN_NOT_FOUND
WORKOUT_LOG_ALREADY_EXISTS
WORKOUT_LOG_INVALID_INPUT
WORKOUT_LOG_INTERNAL_ERROR
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

Usado quando o `UserProfile` do usuário autenticado não existe.

Mensagem segura:

```txt
User profile not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.3 FITNESS_PROFILE_NOT_FOUND

Usado quando não existe `FitnessProfile` ativo para o usuário autenticado.

Mensagem segura:

```txt
Fitness profile not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.4 TRAINING_PLAN_NOT_FOUND

Usado quando o `TrainingPlan` não existe ou não pertence ao usuário autenticado.

Mensagem segura:

```txt
Training plan not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.5 WORKOUT_LOG_ALREADY_EXISTS

Usado quando já existe `WorkoutLog` para o mesmo:

```txt
trainingPlanId + workoutDayIndex + date
```

Também deve ser usado para violação de índice único correspondente, inclusive em condição de corrida.

Mensagem segura:

```txt
Workout log already exists.
```

HTTP status:

```txt
409 Conflict
```

### 4.6 WORKOUT_LOG_INVALID_INPUT

Usado quando o payload é inválido.

Também cobre:

- payload malformado
- `workoutDayIndex` inexistente em `weeklySchedule[].dayIndex`
- `completedExercises` vazio
- valores fora do range
- `notes` acima do limite

Mensagem segura:

```txt
Invalid workout log input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.7 WORKOUT_LOG_INTERNAL_ERROR

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
- detalhes do banco
- detalhes internos de autenticação

### 5.2 Never reveal other user plans

Falha de ownership do `TrainingPlan` não deve revelar existência do recurso.

Esse caso deve responder com:

```txt
TRAINING_PLAN_NOT_FOUND
```

---

## 6. Error Mapping Table

```txt
AUTH_INVALID_SESSION     -> 401 -> Invalid session.
USER_PROFILE_NOT_FOUND   -> 404 -> User profile not found.
FITNESS_PROFILE_NOT_FOUND -> 404 -> Fitness profile not found.
TRAINING_PLAN_NOT_FOUND  -> 404 -> Training plan not found.
WORKOUT_LOG_ALREADY_EXISTS -> 409 -> Workout log already exists.
WORKOUT_LOG_INVALID_INPUT -> 400 -> Invalid workout log input.
WORKOUT_LOG_INTERNAL_ERROR -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O sistema deve falhar de forma segura, sem alterar `TrainingPlan` e sem expor recursos de outros usuários.
