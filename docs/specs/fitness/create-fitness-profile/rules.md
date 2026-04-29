# Rules — Create Fitness Profile

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `create-fitness-profile`.

O objetivo é garantir que a criação do perfil fitness seja:

- segura
- consistente
- previsível
- desacoplada dos outros domínios

---

## 2. Business Rules

### RULE-001 — Session is required

O endpoint deve ser acessível apenas com sessão/JWT válida.

### RULE-002 — authUserId comes from session

O `authUserId` deve vir exclusivamente da sessão autenticada.

### RULE-003 — FitnessProfile belongs to UserProfile

O `FitnessProfile` pertence ao `UserProfile`, não diretamente ao `AuthUser`.

### RULE-004 — UserProfile must exist

O `UserProfile` deve existir antes da criação do `FitnessProfile`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

### RULE-005 — heightCm range

`heightCm` deve estar entre:

- mínimo: `100`
- máximo: `250`

`heightCm` deve ser inteiro.

### RULE-006 — weightKg range

`weightKg` deve estar entre:

- mínimo: `30`
- máximo: `300`

`weightKg` pode aceitar decimal.

### RULE-007 — goal must be valid

`goal` deve ser um dos valores:

- `lose_weight`
- `gain_muscle`
- `maintain`

### RULE-008 — activityLevel must be valid

`activityLevel` deve ser um dos valores:

- `low`
- `medium`
- `high`

### RULE-009 — trainingAvailability.daysPerWeek range

`daysPerWeek` deve estar entre:

- mínimo: `1`
- máximo: `7`

`daysPerWeek` deve ser inteiro.

### RULE-010 — trainingAvailability.minutesPerSession range

`minutesPerSession` deve estar entre:

- mínimo: `10`
- máximo: `180`

`minutesPerSession` deve ser inteiro.

### RULE-011 — limitations is optional

`limitations` é opcional.

### RULE-012 — Only one active FitnessProfile per UserProfile

Um `UserProfile` pode ter no máximo um `FitnessProfile` ativo.

Se já existir:

- `FITNESS_PROFILE_ALREADY_EXISTS`

### RULE-013 — Default status

No MVP:

- `status = "active"`

### RULE-014 — No downstream plan creation

`create-fitness-profile` não cria:

- `TrainingPlan`

### RULE-015 — No Nutrition access

O use-case não acessa `Nutrition`.

### RULE-016 — No AI access

O use-case não acessa `AI`.

---

## 3. Technical Rules

### TECH-001 — Use repository abstraction

O use-case depende de `FitnessProfileRepository` e `UserProfileRepository`, não de Mongoose diretamente.

### TECH-002 — Use session-derived identity

O controller ou camada de entrada deve derivar `authUserId` da sessão validada antes de chamar o use-case.

### TECH-003 — Use DTO validation

A entrada deve ser validada com `class-validator`, alinhado ao padrão do NestJS no MVP.

### TECH-004 — Use explicit error codes

Erros devem usar códigos estáveis:

- `FITNESS_PROFILE_INVALID_INPUT`
- `FITNESS_PROFILE_ALREADY_EXISTS`
- `USER_PROFILE_NOT_FOUND`
- `AUTH_INVALID_SESSION`
- `FITNESS_PROFILE_INTERNAL_ERROR`

### TECH-005 — Translate unique index errors

Violação de índice único em `userProfileId` no Mongo/Mongoose deve ser traduzida para:

- `FITNESS_PROFILE_ALREADY_EXISTS`

Isso também se aplica a condição de corrida.

### TECH-006 — Maintain Fitness isolation

O use-case não deve depender de `Training`, `Nutrition` ou `AI`.

---

## 4. Summary

O use-case existe para criar o contexto fitness inicial do usuário, separado de autenticação, perfil funcional e planejamento de treino.
