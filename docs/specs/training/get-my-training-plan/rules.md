# Rules — Get My Training Plan

## 1. Overview

Este documento define as regras de negócio do use-case `get-my-training-plan`.

No MVP, o objetivo é permitir leitura segura do `TrainingPlan` ativo do usuário autenticado.

---

## 2. Identity Rules

### RULE-001 — authUserId comes only from session

`authUserId` deve vir exclusivamente da sessão/JWT validada.

O cliente nunca envia:

- `authUserId`
- `userProfileId`
- `fitnessProfileId`
- `trainingPlanId`

### RULE-002 — Resolve identity through session only

O fluxo obrigatório é:

```txt
session -> authUserId -> UserProfile -> active FitnessProfile -> active TrainingPlan
```

Nenhuma resolução por ids externos deve ser aceita.

---

## 3. User Profile Rules

### RULE-003 — UserProfile must exist

O sistema deve localizar `UserProfile` pelo `authUserId`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

---

## 4. Fitness Profile Rules

### RULE-004 — Only active FitnessProfile can be used

O sistema deve localizar apenas `FitnessProfile` com:

```txt
status = active
```

Se não existir `FitnessProfile`:

- `FITNESS_PROFILE_NOT_FOUND`

Se existir `FitnessProfile`, mas estiver inativo:

- `FITNESS_PROFILE_NOT_FOUND`

### RULE-005 — Never reveal other users' fitness data

O fluxo não pode aceitar ids vindos do cliente.

Isso impede tentativa de leitura de `FitnessProfile` de outro usuário.

---

## 5. Training Plan Rules

### RULE-006 — Return only active TrainingPlan

O sistema deve localizar apenas `TrainingPlan` com:

```txt
status = active
```

Se não existir `TrainingPlan` ativo:

- `TRAINING_PLAN_NOT_FOUND`

Se existir `TrainingPlan`, mas ele não estiver `active`:

- `TRAINING_PLAN_NOT_FOUND`

### RULE-007 — Do not create or mutate TrainingPlan

Este use-case é apenas de leitura.

Ele não pode:

- criar `TrainingPlan`
- alterar `TrainingPlan`
- recalcular `weeklySchedule`

### RULE-008 — Return current weeklySchedule as persisted

`weeklySchedule` deve ser retornado exatamente conforme persistido no `TrainingPlan` ativo.

O use-case não deve reordenar, recalcular ou enriquecer exercícios.

---

## 6. Response Rules

### RULE-009 — Return safe fields only

A resposta deve conter apenas:

- `id`
- `fitnessProfileId`
- `status`
- `goal`
- `activityLevel`
- `weeklySchedule`
- `createdAt`

### RULE-010 — Never expose auth internals

A resposta nunca deve retornar:

- `password`
- `passwordHash`
- token JWT
- ids sensíveis de outros usuários

---

## 7. Cross-Context Rules

### RULE-011 — No Nutrition access

O use-case não pode acessar `Nutrition`.

### RULE-012 — No AI access

O use-case não pode acessar `AI`.

### RULE-013 — No plan generation logic

O use-case não deve reutilizar lógica de geração de plano.

Ele apenas lê o plano ativo já existente.

---

## 8. Error Rules

### RULE-014 — Invalid session has priority

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

Esse erro acontece antes de qualquer consulta de domínio.

### RULE-015 — Missing FitnessProfile maps to FITNESS_PROFILE_NOT_FOUND

Se o `FitnessProfile` não existir ou não estiver ativo:

- `FITNESS_PROFILE_NOT_FOUND`

### RULE-016 — Missing TrainingPlan maps to TRAINING_PLAN_NOT_FOUND

Se o `TrainingPlan` ativo não existir:

- `TRAINING_PLAN_NOT_FOUND`

### RULE-017 — Unexpected failures map to TRAINING_PLAN_INTERNAL_ERROR

Erros inesperados de infraestrutura ou execução:

- `TRAINING_PLAN_INTERNAL_ERROR`

---

## 9. Summary

As regras principais do MVP são:

- resolver identidade apenas pela sessão
- exigir `UserProfile` existente
- exigir `FitnessProfile` ativo
- retornar apenas `TrainingPlan` ativo
- não aceitar ids do cliente
- não criar nem alterar plano
- não acessar `Nutrition` nem `AI`
