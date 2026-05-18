# Tasks — Build User Health Context

## 1. Overview

Este documento define o checklist técnico para implementar o `BuildUserHealthContextService`.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/ai/
  application/
    services/
      context-builder/
        build-user-health-context.service.ts
        build-user-health-context.service.spec.ts
```

---

## 3. Application Tasks

- [ ] Create `BuildUserHealthContextService`
- [ ] Inject user, fitness, training, progress, nutrition and check-in repositories
- [ ] Inject `Clock`
- [ ] Create base context
- [ ] Resolve `UserProfile`
- [ ] Resolve active `FitnessProfile`
- [ ] Resolve active `NutritionProfile`
- [ ] Resolve latest `DailyCheckIn`
- [ ] Resolve active `TrainingPlan`
- [ ] Resolve recent `WorkoutLogs`
- [ ] Resolve UTC 7-day date range
- [ ] Derive `weeklyFrequency`
- [ ] Derive `adherenceScore`
- [ ] Derive `currentStreak`
- [ ] Derive `averageWorkoutDuration`
- [ ] Derive `fatigueLevel`

---

## 4. Test Tasks

- [ ] Unit test: complete context
- [ ] Unit test: base context with missing user
- [ ] Unit test: partial context without fitness profile
- [ ] Unit test: context without training plan
- [ ] Unit test: context without nutrition profile
- [ ] Unit test: context without latest check-in
- [ ] Unit test: high fatigue by low energy
- [ ] Unit test: high fatigue by poor sleep
- [ ] Unit test: high fatigue by high soreness
- [ ] Unit test: high fatigue by long duration
- [ ] Unit test: high fatigue by high streak
- [ ] Unit test: low fatigue by healthy training pattern
- [ ] Unit test: low fatigue by good check-in
- [ ] Unit test: moderate fatigue by mixed signals

---

## 5. Acceptance Criteria

- [ ] `UserHealthContext` é construído com agregação centralizada
- [ ] `fatigueLevel` é sempre retornado
- [ ] contexto permanece válido quando dados opcionais faltam
- [ ] heurística de `fatigueLevel` segue os testes reais
- [ ] nenhum dado sensível é incluído

---

## 6. Summary

Ordem recomendada:

`base context -> repository aggregation -> derived metrics -> fatigue heuristics -> tests`

O serviço deve nascer simples, determinístico e pronto para reuso por múltiplos fluxos internos.
