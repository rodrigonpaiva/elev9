# Use Case — Get Workout History

## 1. Overview

O use-case `get-workout-history` retorna a lista de `WorkoutLogs` do usuário autenticado no Elev9 Coach.

No MVP, este use-case pertence ao `Progress Context` e opera apenas em modo leitura.

Ele não usa `AI`, não altera dados e não acessa `Nutrition`.

---

## 2. Context

```txt
Bounded Context: Progress
Module: progress
Use-case: get-workout-history
Canonical name: progress.get-workout-history
```

---

## 3. Goal

Permitir que um usuário autenticado consulte seu histórico recente de treinos executados.

No MVP, o fluxo resolve:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `FitnessProfile` ativo pelo `userProfileId`
- `TrainingPlans` ativos do `FitnessProfile` ativo
- `WorkoutLogs` ligados a esses `TrainingPlans`

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- usar `authUserId` da sessão
- resolver `UserProfile`
- resolver `FitnessProfile` ativo
- aceitar `limit` opcional em query
- retornar `WorkoutLogs` ordenados
- usar datas UTC
- retornar resposta segura

Não incluído:

- uso de `AI`
- integração com `Nutrition`
- escrita ou atualização de dados
- filtros avançados por data
- paginação completa

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `UserProfile` para o usuário autenticado
- existe `FitnessProfile` ativo para esse `UserProfile`

---

## 6. Postconditions

Após sucesso:

- nenhum dado é alterado
- uma lista ordenada de `WorkoutLogs` é retornada

Nenhum outro contexto é modificado.

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `FitnessProfile`
- `TrainingPlan`
- `WorkoutLog`

---

## 8. Related Specs

- `auth/validate-session`
- `users/create-user-profile`
- `fitness/create-fitness-profile`
- `training/create-training-plan`
- `progress/log-workout`

---

## 9. Business Value

Este use-case permite mostrar rapidamente ao usuário seu histórico recente de treinos, suportando telas de progresso, histórico e revisão de sessões anteriores.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT/AuthGuard
- `authUserId` vem da sessão
- o fluxo resolve `UserProfile -> FitnessProfile ativo -> TrainingPlans ativos -> WorkoutLogs`
- `limit` pode ser enviado em query
- `limit` default é `20`
- `limit` máximo é `50`
- os logs são ordenados por `date desc`, depois `createdAt desc`
- se não houver `TrainingPlans` ou logs, retornar array vazio
- o use-case não altera dados
- o use-case não acessa `Nutrition`
- o use-case não acessa `AI`

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- uso de datas UTC
- resposta segura
- ordenação previsível
- isolamento de `Nutrition` e `AI`
