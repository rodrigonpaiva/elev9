# Use Case — Get Progress Summary

## 1. Overview

O use-case `get-progress-summary` retorna um resumo simples de progresso do usuário autenticado no Elev9 Coach.

No MVP, este use-case pertence ao `Progress Context` e calcula o resumo apenas a partir de `WorkoutLogs`.

Ele não usa `AI`, não altera dados e não acessa `Nutrition`.

---

## 2. Context

```txt
Bounded Context: Progress
Module: progress
Use-case: get-progress-summary
Canonical name: progress.get-progress-summary
```

---

## 3. Goal

Permitir que um usuário autenticado consulte um resumo agregado de treinos concluídos em um período curto.

No MVP, o fluxo resolve:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `FitnessProfile` ativo pelo `userProfileId`
- `WorkoutLogs` relacionados aos `TrainingPlans` do `FitnessProfile` ativo

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- usar `authUserId` da sessão
- resolver `UserProfile`
- resolver `FitnessProfile` ativo
- aceitar `period` opcional em query
- calcular resumo com base em `WorkoutLogs`
- usar datas UTC
- retornar resposta segura

Não incluído:

- uso de `AI`
- integração com `Nutrition`
- escrita ou atualização de dados
- métricas avançadas
- segmentação por plano específico

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `UserProfile` para o usuário autenticado
- existe `FitnessProfile` ativo para esse `UserProfile`

---

## 6. Postconditions

Após sucesso:

- nenhum dado é alterado
- um resumo agregado é retornado

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

Este use-case permite mostrar rapidamente ao usuário seu volume recente de treino sem exigir processamento avançado.

Ele suporta dashboard inicial, telas de progresso e indicadores simples de consistência.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT/AuthGuard
- `authUserId` vem da sessão
- o fluxo resolve `UserProfile -> FitnessProfile ativo`
- o resumo considera apenas logs ligados aos `TrainingPlans` do `FitnessProfile` ativo
- `period` pode ser `week` ou `month`
- `period` default é `week`
- o use-case não altera dados
- o use-case não acessa `Nutrition`
- o use-case não acessa `AI`

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- uso de datas UTC
- agregação simples e previsível
- resposta segura
- isolamento de `Nutrition` e `AI`
