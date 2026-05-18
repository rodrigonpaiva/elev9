# Use Case — Get AI Context

## 1. Overview

O use-case `get-ai-context` retorna um `UserHealthContext` seguro para o usuário autenticado.

Este endpoint agrega sinais de usuário, fitness, treino, progresso, recovery, check-ins e nutrition em um único read model consumido internamente pelo produto.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: get-ai-context
Canonical name: ai.get-ai-context
```

---

## 3. Goal

Permitir que o sistema leia um contexto consolidado e seguro do usuário autenticado para debugging, orquestração interna e geração contextual de feedback.

---

## 4. MVP Scope

Incluído:

- proteger endpoint com sessão validada
- resolver `UserProfile` pelo `authUserId`
- agregar dados de fitness
- agregar dados de training
- agregar dados de progress
- agregar `latestCheckIn`
- calcular `fatigueLevel`
- incluir `nutritionProfile` quando existir
- retornar fallback seguro quando dados estiverem ausentes

Não incluído:

- replay
- mutação de dados
- IA externa
- analytics avançado
- `recoveryTrend` no payload público deste endpoint

---

## 5. Preconditions

- a requisição está autenticada
- o contexto é resolvido apenas para o usuário autenticado

---

## 6. Postconditions

Após sucesso:

- nenhum dado é alterado
- nenhum cálculo é persistido
- um contexto seguro e reduzido é retornado

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

- [ai/generate-coach-feedback](../generate-coach-feedback/README.md)
- [ai/get-coach-feedback-debug-history](../get-coach-feedback-debug-history/README.md)
- [ai/replay-coach-feedback](../replay-coach-feedback/README.md)
- [progress/get-progress-summary](../../progress/get-progress-summary/README.md)
- [dashboard/get-home-dashboard](../../dashboard/get-home-dashboard/README.md)

---

## 9. Business Value

Este use-case consolida a camada de contexto de saúde do produto em um ponto único de leitura.

Ele reduz duplicação entre fluxos internos e prepara a base para:

- feedback contextual
- recovery-aware coaching
- explainability
- replay

---

## 10. Decision

Decisões fechadas para o estado atual:

- o endpoint é autenticado
- o contexto é isolado por usuário
- ausência de `nutritionProfile` não gera erro
- ausência de `latestCheckIn` não gera erro
- ausência de `FitnessProfile` ou `TrainingPlan` degrada com segurança
- `fatigueLevel` sempre existe com fallback `MODERATE`
- `recoveryTrend` não faz parte do payload atual de `GET /ai/context`

---

## 11. Summary

O use-case deve priorizar:

- agregação segura
- fallback previsível
- isolamento por usuário
- ausência de dados sensíveis
- compatibilidade com os fluxos internos de coaching
