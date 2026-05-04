# Use Case — Generate Coach Feedback

## 1. Overview

O use-case `generate-coach-feedback` retorna um feedback textual inteligente para o usuário autenticado no Elev9 Coach.

No MVP, este use-case pertence ao `AI Context`, mas não usa LLM externo. A geração é feita por regras determinísticas baseadas em dados já existentes do usuário.

O objetivo é entregar uma camada inicial de coaching orientada por progresso sem alterar dados nem introduzir dependências externas de IA.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: generate-coach-feedback
Canonical name: ai.generate-coach-feedback
```

---

## 3. Goal

Permitir que um usuário autenticado receba uma mensagem de coaching baseada em:

- `FitnessProfile`
- `TrainingPlan` ativo
- `WorkoutLogs` recentes
- `ProgressSummary`
- `currentStreak`

No MVP, o fluxo resolve internamente:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `FitnessProfile` ativo pelo `userProfileId`
- `TrainingPlan` ativo pelo `fitnessProfileId`
- `WorkoutLogs` recentes pelo escopo do plano ativo
- `ProgressSummary` pelo mesmo escopo

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- usar `authUserId` da sessão
- resolver `UserProfile`
- resolver `FitnessProfile` ativo
- resolver `TrainingPlan` ativo
- resolver `WorkoutLogs` recentes
- reaproveitar cálculo de resumo/progresso
- gerar `message`, `insights` e `recommendations`
- responder mesmo com poucos dados
- responder com mensagem motivacional quando não houver logs

Não incluído:

- integração com OpenAI
- chat multi-turn
- armazenamento de feedback gerado
- personalização por histórico longo
- alteração de `WorkoutLogs`, `TrainingPlans` ou perfis
- side effects em outros contextos

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `UserProfile` para o usuário autenticado
- existe `FitnessProfile` ativo para esse `UserProfile`

`TrainingPlan` ativo é desejável, mas o sistema deve degradar com segurança caso ele não exista.

---

## 6. Postconditions

Após sucesso:

- nenhum dado é alterado
- nenhuma entidade é criada
- um payload textual de coaching é retornado

Nenhum outro contexto é modificado.

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `FitnessProfile`
- `TrainingPlan`
- `WorkoutLog`
- `ProgressSummary`

---

## 8. Related Specs

- `auth/validate-session`
- `users/create-user-profile`
- `fitness/create-fitness-profile`
- `training/create-training-plan`
- `training/get-my-training-plan`
- `progress/log-workout`
- `progress/get-workout-history`
- `progress/get-progress-summary`

---

## 9. Business Value

Este use-case adiciona uma camada de valor percebido ao produto sem exigir IA externa no MVP.

Ele transforma dados já disponíveis em linguagem útil para o usuário:

- reforço de consistência
- leitura rápida de progresso
- próxima ação recomendada

Isso prepara a base para uma evolução futura para coaching com LLM, agentes e interface conversacional.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT/AuthGuard
- `authUserId` vem exclusivamente da sessão
- o cliente não envia dados de treino no body
- o use-case opera apenas em leitura
- a geração é determinística e baseada em regras simples
- o sistema deve responder mesmo com poucos dados
- ausência de logs retorna coaching inicial motivacional
- nenhuma IA externa é usada no MVP

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- reaproveitamento dos dados atuais do produto
- resposta segura e motivadora
- zero mutação de dados
- arquitetura pronta para evolução futura com IA real
