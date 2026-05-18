# Use Case — Log Workout

## 1. Overview

O use-case `log-workout` registra a execução de um treino pelo usuário autenticado no Elev9 Coach.

No MVP, este use-case pertence ao `Progress Context` e cria apenas um `WorkoutLog`.

Ele não usa `AI`, não altera `TrainingPlan` e não acessa `Nutrition`.

---

## 2. Context

```txt
Bounded Context: Progress
Module: progress
Use-case: log-workout
Canonical name: progress.log-workout
```

---

## 3. Goal

Permitir que um usuário autenticado registre a execução de um treino já planejado.

No MVP, o fluxo resolve:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `FitnessProfile` ativo pelo `userProfileId`
- validação de ownership do `TrainingPlan`
- persistência de `WorkoutLog`

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- usar `authUserId` da sessão
- resolver `UserProfile`
- resolver `FitnessProfile` ativo
- validar ownership do `TrainingPlan`
- validar `workoutDayIndex`
- validar payload do log
- impedir duplicidade por `trainingPlanId + workoutDayIndex + date`
- criar `WorkoutLog`
- retornar resposta segura

Não incluído:

- uso de `AI`
- alteração do `TrainingPlan`
- integração com `Nutrition`
- recalcular progresso agregado

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `UserProfile` para o usuário autenticado
- existe `FitnessProfile` ativo para esse `UserProfile`
- existe `TrainingPlan` pertencente a esse `FitnessProfile`

---

## 6. Postconditions

Após sucesso:

- um `WorkoutLog` é criado
- o `TrainingPlan` não é alterado
- nenhum outro contexto é modificado

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `FitnessProfile`
- `TrainingPlan`
- `WorkoutLog`

---

## 8. Related Specs

- [auth/validate-session](../../auth/validate-session/README.md)
- [users/create-user-profile](../../users/create-user-profile/README.md)
- [fitness/create-fitness-profile](../../fitness/create-fitness-profile/README.md)
- [training/create-training-plan](../../training/create-training-plan/README.md)

---

## 9. Business Value

Este use-case permite registrar execução real de treino e cria a base do histórico de progresso do usuário.

Ele separa claramente planejamento de treino e execução do treino no MVP.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT/AuthGuard
- `authUserId` vem da sessão
- `trainingPlanId` vem no body
- `authUserId`, `userProfileId` e `fitnessProfileId` nunca vêm do cliente
- ownership do `TrainingPlan` deve ser validado
- não pode existir mais de um `WorkoutLog` para o mesmo `trainingPlanId + workoutDayIndex + date`
- o use-case não usa `AI`
- o use-case não altera `TrainingPlan`

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- validação de ownership do plano
- unicidade do log diário
- resposta segura
- isolamento de `TrainingPlan`, `Nutrition` e `AI`
