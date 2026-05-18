# Use Case — Build User Health Context

## 1. Overview

O componente `BuildUserHealthContextService` agrega sinais internos de múltiplos módulos para produzir um `UserHealthContext` determinístico e seguro.

Este serviço é um componente compartilhado do módulo `ai` e já alimenta:

- `GET /ai/context`
- `CoachFeedbackGenerator`
- recovery-aware feedback
- debug history
- replay

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Internal service: build-user-health-context
Canonical name: ai.build-user-health-context
```

---

## 3. Goal

Construir um contexto consolidado do usuário autenticado com dados de user, fitness, training, progress, recovery, nutrition e check-ins sem depender de IA externa e com comportamento previsível.

---

## 4. MVP Scope

Incluído:

- resolver `UserProfile`
- resolver `FitnessProfile` ativo
- resolver `TrainingPlan` ativo
- resolver `WorkoutLogs` recentes
- resolver `latestCheckIn`
- resolver `NutritionProfile` ativo
- calcular `weeklyFrequency`
- calcular `adherenceScore`
- calcular `currentStreak`
- calcular `averageWorkoutDuration`
- calcular `fatigueLevel`
- retornar fallback seguro quando partes do contexto estiverem ausentes

Não incluído:

- mutação de dados
- replay
- persistência de snapshot
- trend recovery dedicado no output
- IA externa

---

## 5. Preconditions

- o input contém `authUserId`
- os repositórios internos estão disponíveis
- o serviço opera apenas em leitura

---

## 6. Postconditions

Após sucesso:

- nenhum dado é alterado
- um `UserHealthContext` é retornado
- o contexto pode ser parcial, mas deve continuar válido

---

## 7. Related Entities

- `UserProfile`
- `FitnessProfile`
- `TrainingPlan`
- `WorkoutLog`
- `DailyCheckIn`
- `NutritionProfile`

---

## 8. Related Specs

- `ai/get-ai-context`
- `ai/generate-coach-feedback`
- `ai/get-coach-feedback-debug-history`
- `ai/replay-coach-feedback`
- `progress/get-progress-summary`

---

## 9. Business Value

Este serviço centraliza a composição do contexto de saúde do usuário e evita duplicação de heurísticas e agregação entre múltiplos fluxos internos.

Ele é a base para:

- leitura contextual unificada
- feedback determinístico
- explainability
- replay

---

## 10. Decision

Decisões fechadas para o estado atual:

- deterministic-first architecture
- agregação centralizada no módulo `ai`
- `fatigueLevel` é heurístico e não médico
- ausência de dados opcionais não invalida o contexto
- o serviço não expõe `hasTrainingPlan` como campo real
- a presença de treino ativo é inferida por `activeTrainingPlanId`

---

## 11. Summary

O serviço deve priorizar:

- agregação compartilhada
- heurística determinística
- fallback seguro
- ausência de dados sensíveis
- compatibilidade com feedback, debug e replay
