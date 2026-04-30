# Rules — Log Workout

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `log-workout`.

O objetivo é garantir que o registro de treino seja:

- seguro
- consistente
- previsível
- desacoplado dos outros domínios

---

## 2. Business Rules

### RULE-001 — Session is required

O endpoint deve ser acessível apenas com sessão/JWT válida.

### RULE-002 — authUserId comes from session

O `authUserId` deve vir exclusivamente da sessão autenticada.

### RULE-003 — Never accept IDs from client except trainingPlanId

O sistema não deve aceitar:

- `authUserId`
- `userProfileId`
- `fitnessProfileId`

vindos do body, query string ou path params.

No MVP, apenas `trainingPlanId` entra pelo body.

### RULE-004 — UserProfile must exist

O sistema deve localizar `UserProfile` pelo `authUserId`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

### RULE-005 — Active FitnessProfile must exist

O sistema deve localizar `FitnessProfile` ativo pelo `userProfileId`.

Se não existir:

- `FITNESS_PROFILE_NOT_FOUND`

### RULE-006 — TrainingPlan must belong to authenticated user

O `TrainingPlan` informado deve pertencer ao `FitnessProfile` ativo do usuário autenticado.

Se não existir ou não pertencer:

- `TRAINING_PLAN_NOT_FOUND`

### RULE-007 — workoutDayIndex must exist in weeklySchedule

`workoutDayIndex` deve corresponder a um item real de:

```txt
TrainingPlan.weeklySchedule[].dayIndex
```

Não validar por posição do array.

Se não existir:

- `WORKOUT_LOG_INVALID_INPUT`

### RULE-008 — durationMinutes range

`durationMinutes` deve estar entre:

- mínimo: `1`
- máximo: `300`

### RULE-009 — completedExercises cannot be empty

`completedExercises` deve conter pelo menos um item.

### RULE-010 — setsDone and repsDone must be integers >= 0

Para cada exercício concluído:

- `setsDone` deve ser inteiro `>= 0`
- `repsDone` deve ser inteiro `>= 0`

### RULE-011 — notes max length

`feedback.notes` deve ter no máximo `500` caracteres.

### RULE-012 — One log per training day per date

Não pode existir mais de um `WorkoutLog` para:

```txt
trainingPlanId + workoutDayIndex + date
```

`date`:

- não vem do cliente
- é gerada no servidor
- usa formato `YYYY-MM-DD`
- usa timezone `UTC`

A unicidade usa exatamente a string UTC persistida em `YYYY-MM-DD`.

Se já existir:

- `WORKOUT_LOG_ALREADY_EXISTS`

### RULE-013 — Do not modify TrainingPlan

O use-case não altera `TrainingPlan`.

### RULE-014 — No AI access

O use-case não usa `AI`.

### RULE-015 — No Nutrition access

O use-case não acessa `Nutrition`.

---

## 3. Technical Rules

### TECH-001 — Use repository abstraction

O use-case depende de `UserProfileRepository`, `FitnessProfileRepository`, `TrainingPlanRepository` e `WorkoutLogRepository`, não de Mongoose diretamente.

### TECH-002 — Use session-derived identity

O controller ou camada de entrada deve derivar `authUserId` da sessão validada antes de chamar o use-case.

### TECH-003 — Use DTO validation

A entrada deve ser validada com `class-validator`, alinhado ao padrão do NestJS no MVP.

Validação estrutural acontece na camada HTTP.

Validação semântica de `workoutDayIndex` acontece depois de carregar o `TrainingPlan`.

### TECH-004 — Use explicit error codes

Erros devem usar códigos estáveis:

- `AUTH_INVALID_SESSION`
- `USER_PROFILE_NOT_FOUND`
- `FITNESS_PROFILE_NOT_FOUND`
- `TRAINING_PLAN_NOT_FOUND`
- `WORKOUT_LOG_ALREADY_EXISTS`
- `WORKOUT_LOG_INVALID_INPUT`
- `WORKOUT_LOG_INTERNAL_ERROR`

### TECH-005 — Hide ownership failures

Se o `TrainingPlan` existir mas não pertencer ao usuário autenticado, o sistema deve responder:

- `TRAINING_PLAN_NOT_FOUND`

### TECH-006 — Translate unique index errors

Violação de índice único para `trainingPlanId + workoutDayIndex + date` deve ser traduzida para:

- `WORKOUT_LOG_ALREADY_EXISTS`

### TECH-007 — Maintain Progress isolation

O use-case não deve depender de `AI` ou `Nutrition`.

---

## 4. Summary

O use-case existe para registrar execução real de treino com validação de ownership, unicidade por dia e separação clara entre plano e execução.
