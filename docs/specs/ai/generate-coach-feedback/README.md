# Use Case — Generate Coach Feedback

## 1. Overview

O use-case `generate-coach-feedback` retorna um feedback textual inteligente para o usuário autenticado no Elev9 Coach.

No MVP, este use-case pertence ao `AI Context`, mas não usa LLM externo. A geração é feita por regras determinísticas baseadas em dados já existentes do usuário.

O objetivo é entregar uma camada inicial de coaching orientada por progresso sem alterar dados de fitness, treino ou progresso, sem introduzir dependências externas de IA e persistindo o feedback gerado como `CoachFeedback`.

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
- persistir `CoachFeedback` após geração bem-sucedida
- responder mesmo com poucos dados
- responder com mensagem motivacional quando não houver logs

Não incluído:

- integração com OpenAI
- chat multi-turn
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

- nenhum dado de `FitnessProfile`, `TrainingPlan` ou `WorkoutLog` é alterado
- um `CoachFeedback` é criado e persistido
- um payload textual de coaching é retornado

Se a persistência falhar:

- o endpoint falha com `AI_COACH_INTERNAL_ERROR`
- nenhum feedback não persistido é retornado

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `FitnessProfile`
- `TrainingPlan`
- `WorkoutLog`
- `ProgressSummary`
- `CoachFeedback`

---

## 8. Related Specs

- [auth/validate-session](../../auth/validate-session/README.md)
- [users/create-user-profile](../../users/create-user-profile/README.md)
- [fitness/create-fitness-profile](../../fitness/create-fitness-profile/README.md)
- [training/create-training-plan](../../training/create-training-plan/README.md)
- [training/get-my-training-plan](../../training/get-my-training-plan/README.md)
- [progress/log-workout](../../progress/log-workout/README.md)
- [progress/get-workout-history](../../progress/get-workout-history/README.md)
- [progress/get-progress-summary](../../progress/get-progress-summary/README.md)
- [ai/get-coach-feedback-history](../get-coach-feedback-history/README.md)

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
- a geração é determinística e baseada em regras simples
- feedback gerado com sucesso deve ser persistido como `CoachFeedback`
- se a persistência falhar, retornar `AI_COACH_INTERNAL_ERROR`
- o sistema deve responder mesmo com poucos dados
- ausência de logs retorna coaching inicial motivacional
- nenhuma IA externa é usada no MVP

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- reaproveitamento dos dados atuais do produto
- resposta segura e motivadora
- nenhuma mutação de dados de fitness, treino ou progresso
- persistência obrigatória de `CoachFeedback`
- arquitetura pronta para evolução futura com IA real
