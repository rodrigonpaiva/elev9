# Rules — Create Training Plan

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `create-training-plan`.

O objetivo é garantir que a criação do plano de treino seja:

- segura
- consistente
- previsível
- desacoplada dos outros domínios

---

## 2. Business Rules

### RULE-001 — Session is required

O endpoint deve ser acessível apenas com sessão/JWT válida.

### RULE-002 — FitnessProfile must exist

O `FitnessProfile` informado por `fitnessProfileId` deve existir antes da criação do plano.

Se não existir:

- `FITNESS_PROFILE_NOT_FOUND`

### RULE-003 — authUserId comes from session

O `authUserId` deve vir exclusivamente da sessão autenticada.

### RULE-004 — UserProfile must be resolved from authUserId

O sistema deve usar `authUserId` da sessão para localizar o `UserProfile` autenticado antes de autorizar o uso do `FitnessProfile`.

### RULE-005 — FitnessProfile must belong to authenticated UserProfile

O `FitnessProfile` informado deve pertencer ao `UserProfile` autenticado.

Se o `fitnessProfileId` existir mas pertencer a outro usuário:

- `FITNESS_PROFILE_NOT_FOUND`

Esse comportamento existe para não revelar existência do recurso.

### RULE-006 — TrainingPlan belongs to FitnessProfile

O `TrainingPlan` pertence ao `FitnessProfile`.

O vínculo persistido deve ser `fitnessProfileId`.

### RULE-007 — Only one active TrainingPlan per FitnessProfile

Um `FitnessProfile` pode ter no máximo um `TrainingPlan` ativo.

Se já existir:

- `TRAINING_PLAN_ALREADY_EXISTS`

### RULE-008 — Generation is deterministic

No MVP, o plano deve ser gerado por regras fixas.

Não deve existir dependência de IA.

### RULE-009 — gain_muscle generates strength-focused plan

Quando `goal = gain_muscle`, o plano deve priorizar treino de força.

Parâmetros mínimos:

- `3–5 sets`
- `6–12 reps`
- descanso moderado
- intensidade `moderate` ou `high`

### RULE-010 — lose_weight generates circuit-focused plan

Quando `goal = lose_weight`, o plano deve priorizar circuito.

Parâmetros mínimos:

- mais reps
- menos descanso
- sessões mais dinâmicas
- intensidade `moderate`

### RULE-011 — maintain generates balanced plan

Quando `goal = maintain`, o plano deve ser balanceado entre volume e intensidade.

Parâmetros mínimos:

- `2–4 sets`
- `8–15 reps`
- intensidade `moderate`
- mistura de força, mobilidade e cardio leve

### RULE-012 — activityLevel defines number of days

`activityLevel` deve definir o número de dias do plano semanal.

Mapeamento MVP fechado:

- `low` -> `2` dias
- `medium` -> `3` dias
- `high` -> `4` dias

### RULE-013 — weeklySchedule minimum shape

Cada item de `weeklySchedule` deve conter no mínimo:

- `dayIndex`
- `title`
- `focus`
- `intensity`
- `exercises[]`

Cada exercício deve conter no mínimo:

- `name`
- `sets`
- `reps`
- `restSeconds`

### RULE-014 — Default status

No MVP:

- `status = "active"`

### RULE-015 — No Nutrition access

O use-case não acessa `Nutrition`.

### RULE-016 — No AI access

O use-case não acessa `AI`.

---

## 3. Technical Rules

### TECH-001 — Use repository abstraction

O use-case depende de `TrainingPlanRepository`, `FitnessProfileRepository` e `UserProfileRepository`, não de Mongoose diretamente.

### TECH-002 — Use DTO validation

A entrada deve ser validada com `class-validator`, alinhado ao padrão do NestJS no MVP.

### TECH-003 — Validate ownership without leaking resource existence

Se o `FitnessProfile` existir mas não pertencer ao `UserProfile` autenticado, o sistema deve retornar:

- `FITNESS_PROFILE_NOT_FOUND`

### TECH-004 — Use explicit error codes

Erros devem usar códigos estáveis:

- `TRAINING_PLAN_ALREADY_EXISTS`
- `FITNESS_PROFILE_NOT_FOUND`
- `AUTH_INVALID_SESSION`
- `TRAINING_PLAN_INTERNAL_ERROR`

### TECH-005 — Translate unique index errors

Violação de índice único em `fitnessProfileId` no Mongo/Mongoose deve ser traduzida para:

- `TRAINING_PLAN_ALREADY_EXISTS`

Isso também se aplica a condição de corrida.

### TECH-006 — Maintain Training isolation

O use-case não deve depender de `Nutrition` ou `AI`.

---

## 4. Summary

O use-case existe para criar o primeiro plano de treino do usuário com regras determinísticas, preservando isolamento arquitetural e simplicidade de implementação no MVP.
