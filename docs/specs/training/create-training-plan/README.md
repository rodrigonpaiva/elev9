# Use Case — Create Training Plan

## 1. Overview

O use-case `create-training-plan` cria o plano inicial de treino do usuário no Elev9 Coach.

No MVP, este use-case pertence ao `Training Context` e cria apenas um `TrainingPlan`.

Ele não acessa `Nutrition` e não acessa `AI`.

---

## 2. Context

```txt
Bounded Context: Training
Module: training
Use-case: create-training-plan
Canonical name: training.create-training-plan
```

---

## 3. Goal

Permitir que um usuário autenticado gere um plano de treino inicial a partir de um `FitnessProfile` existente.

No MVP, o plano é gerado por regras determinísticas usando:

- `goal`
- `activityLevel`
- disponibilidade de treino

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- receber `fitnessProfileId`
- verificar existência de `FitnessProfile`
- impedir múltiplos `TrainingPlan` ativos por `FitnessProfile`
- gerar plano por regras fixas
- persistir `TrainingPlan`
- aplicar `status = "active"`
- retornar resposta segura

Não incluído:

- geração por IA
- acesso a `Nutrition`
- múltiplas versões de plano
- refresh automático de plano

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `FitnessProfile` para o `fitnessProfileId` informado
- ainda não existe `TrainingPlan` ativo para esse `FitnessProfile`

---

## 6. Postconditions

Após sucesso:

- um `TrainingPlan` é criado
- `fitnessProfileId` é persistido no plano
- `status` inicia como `active`
- a estrutura do plano reflete regras simples baseadas em `goal` e `activityLevel`

Nenhum outro contexto é alterado.

---

## 7. Related Entities

- `AuthUser`
- `FitnessProfile`
- `TrainingPlan`

---

## 8. Related Specs

- `auth/validate-session`
- `fitness/create-fitness-profile`
- `training/update-training-plan`

---

## 9. Business Value

Este use-case entrega o primeiro plano de treino funcional do produto sem depender de IA.

Ele permite validar rapidamente o onboarding de treino no MVP com uma lógica previsível, barata e testável.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT
- o plano usa `fitnessProfileId`
- só pode existir um `TrainingPlan` ativo por `FitnessProfile`
- a geração é feita por regras, não por IA
- `goal = gain_muscle` gera foco em força
- `goal = lose_weight` gera foco em circuito
- `activityLevel` define número de dias do plano
- o use-case não acessa `Nutrition`
- o use-case não acessa `AI`

---

## 11. Summary

O use-case deve priorizar:

- vínculo correto com `FitnessProfile`
- unicidade de plano ativo
- geração simples e determinística
- resposta segura
- isolamento de `Nutrition` e `AI`
