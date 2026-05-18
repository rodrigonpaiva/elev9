# Tasks — Get AI Context

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `get-ai-context`.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/ai/
  application/
    services/
      context-builder/
        build-user-health-context.service.ts
  presentation/
    http/
      ai.controller.ts
```

---

## 3. Application Tasks

- [ ] Create `BuildUserHealthContextService`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Resolve active `FitnessProfile`
- [ ] Resolve active `NutritionProfile`
- [ ] Resolve latest `DailyCheckIn`
- [ ] Resolve active `TrainingPlan`
- [ ] Resolve recent `WorkoutLogs`
- [ ] Derive `weeklyFrequency`
- [ ] Derive `adherenceScore`
- [ ] Derive `currentStreak`
- [ ] Derive `averageWorkoutDuration`
- [ ] Derive `fatigueLevel`
- [ ] Return safe partial context when optional data is missing

---

## 4. Presentation Tasks

- [ ] Expose `GET /ai/context`
- [ ] Protect endpoint with validated session
- [ ] Map context dates to ISO strings
- [ ] Return safe response shape
- [ ] Omit `nutritionProfile` when absent
- [ ] Omit `latestCheckIn` when absent

---

## 5. Test Tasks

- [ ] Unit test: complete user context
- [ ] Unit test: partial context without fitness profile
- [ ] Unit test: context without training plan
- [ ] Unit test: context without latest check-in
- [ ] Unit test: context with nutrition profile
- [ ] Unit test: context without nutrition profile
- [ ] Unit test: fatigue high by check-in
- [ ] Unit test: fatigue low by recovery conditions
- [ ] Unit test: fallback moderate when data is incomplete
- [ ] HTTP test: authenticated context endpoint
- [ ] HTTP test: omit nutritionProfile when absent

---

## 6. Acceptance Criteria

- [ ] endpoint existe
- [ ] contexto é autenticado
- [ ] contexto é isolado por usuário
- [ ] `fatigueLevel` é retornado
- [ ] `latestCheckIn` é opcional
- [ ] `nutritionProfile` é opcional
- [ ] dados de treino degradam com segurança
- [ ] nenhum dado sensível é retornado

---

## 7. Summary

Ordem recomendada:

`context builder -> controller serialization -> tests`

Este fluxo deve permanecer um read model seguro e reutilizável para o restante do módulo `ai`.
