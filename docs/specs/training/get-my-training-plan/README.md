# Use Case — Get My Training Plan

## 1. Overview

O use-case `get-my-training-plan` retorna o `TrainingPlan` ativo do usuário autenticado no Elev9 Coach.

No MVP, este use-case pertence ao `Training Context` e retorna apenas um `TrainingPlan`.

Ele não cria plano novo, não altera `TrainingPlan` e não acessa `Nutrition` ou `AI`.

---

## 2. Context

```txt
Bounded Context: Training
Module: training
Use-case: get-my-training-plan
Canonical name: training.get-my-training-plan
```

---

## 3. Goal

Permitir que um usuário autenticado consulte seu `TrainingPlan` ativo a partir da sessão atual.

O fluxo resolve:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `FitnessProfile` ativo pelo `userProfileId`
- `TrainingPlan` ativo pelo `fitnessProfileId`

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- usar `authUserId` da sessão
- localizar `UserProfile`
- localizar `FitnessProfile` ativo
- localizar `TrainingPlan` ativo
- retornar resposta segura

Não incluído:

- criação de plano
- atualização de plano
- consulta por `trainingPlanId`
- consulta por `fitnessProfileId`
- consulta por `userProfileId`
- acesso a `Nutrition`
- acesso a `AI`

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `UserProfile` para o usuário autenticado
- existe `FitnessProfile` ativo para esse `UserProfile`
- existe `TrainingPlan` ativo para esse `FitnessProfile`

---

## 6. Postconditions

Após sucesso:

- nenhum dado é alterado
- o `TrainingPlan` ativo do usuário autenticado é retornado

Nenhum outro contexto é alterado.

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `FitnessProfile`
- `TrainingPlan`

---

## 8. Related Specs

- `auth/validate-session`
- `users/create-user-profile`
- `fitness/create-fitness-profile`
- `training/create-training-plan`

---

## 9. Business Value

Este use-case permite que o app recupere o plano de treino atual do usuário autenticado sem expor ids sensíveis nem depender de input externo de identificação.

Ele suporta telas de treino, agenda semanal e fluxos de progresso baseados no plano ativo.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT/AuthGuard
- `authUserId` vem da sessão
- o sistema resolve `UserProfile` pelo `authUserId`
- o sistema resolve `FitnessProfile` ativo pelo `userProfileId`
- o sistema resolve `TrainingPlan` ativo pelo `fitnessProfileId`
- nenhum id é aceito do cliente
- o use-case não cria plano
- o use-case não altera `TrainingPlan`
- o use-case não acessa `Nutrition`
- o use-case não acessa `AI`

---

## 11. Summary

O use-case deve priorizar:

- resolução de identidade apenas pela sessão
- isolamento entre usuários
- retorno apenas do plano ativo
- ausência de mutação de `TrainingPlan`
- ausência de dependência com `Nutrition` e `AI`
