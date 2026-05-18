# Use Case — Get Home Dashboard

## 1. Overview

O use-case `get-home-dashboard` retorna os dados consolidados que o app mobile precisa na tela inicial do Elev9 Coach.

No MVP, este use-case pertence ao `Dashboard Context` e agrega dados de leitura vindos de `Users`, `Fitness`, `Training` e `Progress`.

Ele não cria nem altera dados, não usa `AI` e não acessa `Nutrition`.

---

## 2. Context

```txt
Bounded Context: Dashboard
Module: dashboard
Use-case: get-home-dashboard
Canonical name: dashboard.get-home-dashboard
```

---

## 3. Goal

Permitir que um usuário autenticado carregue a home do app com uma única resposta consolidada.

No MVP, o fluxo resolve:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `FitnessProfile` ativo pelo `userProfileId`
- `TrainingPlan` ativo pelo `fitnessProfileId`
- `progressSummary` semanal

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- usar `authUserId` da sessão
- resolver `UserProfile`
- resolver `FitnessProfile` ativo
- resolver `TrainingPlan` ativo
- calcular `todayWorkout`
- calcular `progressSummary` semanal
- retornar resposta consolidada e segura

Não incluído:

- uso de `AI`
- integração com `Nutrition`
- criação ou atualização de dados
- métricas avançadas de dashboard
- cards de recomendações

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `UserProfile` para o usuário autenticado

`FitnessProfile` e `TrainingPlan` podem não existir no MVP e, nesses casos, a resposta deve continuar válida.

---

## 6. Postconditions

Após sucesso:

- nenhum dado é alterado
- um payload consolidado da home é retornado

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

- [auth/validate-session](../../auth/validate-session/README.md)
- [users/create-user-profile](../../users/create-user-profile/README.md)
- [fitness/get-my-fitness-profile](../../fitness/get-my-fitness-profile/README.md)
- [training/get-my-training-plan](../../training/get-my-training-plan/README.md)
- [progress/get-progress-summary](../../progress/get-progress-summary/README.md)

---

## 9. Business Value

Este use-case reduz round-trips do app mobile e concentra a lógica de montagem da home em um único endpoint.

Ele facilita onboarding progressivo, exibição do treino atual e visão resumida de progresso sem exigir múltiplas chamadas paralelas.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT/AuthGuard
- `authUserId` vem da sessão
- o fluxo resolve `UserProfile -> FitnessProfile ativo`
- `fitnessProfile` pode ser `null`
- `trainingPlan` pode ser `null`
- `progressSummary` sempre usa `period = week`
- `todayWorkout` é calculado pelo dia da semana UTC
- se não houver treino correspondente ao dia UTC, `todayWorkout = null`
- o use-case não altera dados
- o use-case não acessa `Nutrition`
- o use-case não acessa `AI`

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- resposta consolidada e previsível
- tolerância à ausência de `FitnessProfile` ou `TrainingPlan`
- uso de UTC para `todayWorkout` e `progressSummary`
- isolamento de `Nutrition` e `AI`
