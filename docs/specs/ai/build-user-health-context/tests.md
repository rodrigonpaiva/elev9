# Tests — Build User Health Context

## 1. Overview

Este documento define os cenários de teste do `BuildUserHealthContextService`.

---

## 2. Test Strategy

Tipos de teste recomendados:

```txt
Unit tests
```

---

## 3. Success Scenarios

### TEST-001 — Build complete context

Given:

- `UserProfile`
- `FitnessProfile`
- `TrainingPlan`
- `DailyCheckIn`
- `NutritionProfile`
- `WorkoutLogs`

Then:

- o contexto completo é retornado

### TEST-002 — Return partial context when only user exists

Expected:

- contexto parcial com defaults seguros

### TEST-003 — Include nutritionProfile when present

Expected:

- `nutritionProfile` é mapeado corretamente

### TEST-004 — Work safely without nutritionProfile

Expected:

- `nutritionProfile` fica ausente

### TEST-005 — Return safe context without active training plan

Expected:

- `todayWorkout = null`
- `recentWorkoutLogs = []`

### TEST-006 — Fallback safely with insufficient progress data

Expected:

- `adherenceScore = 0`
- `currentStreak = 0`
- `averageWorkoutDuration = 0`

### TEST-007 — Include latestCheckIn when present

Expected:

- `latestCheckIn` é retornado corretamente

---

## 4. Fatigue Heuristic Scenarios

### TEST-008 — HIGH when streak is 6 or more

Expected:

- `fatigueLevel = HIGH`

### TEST-009 — HIGH when energy level is 2 or lower

Expected:

- `fatigueLevel = HIGH`

### TEST-010 — HIGH when sleep quality is 2 or lower

Expected:

- `fatigueLevel = HIGH`

### TEST-011 — HIGH when muscle soreness is 4 or higher

Expected:

- `fatigueLevel = HIGH`

### TEST-012 — HIGH when average workout duration is very high

Expected:

- `fatigueLevel = HIGH`

### TEST-013 — LOW when consistency is healthy and duration is controlled

Expected:

- `fatigueLevel = LOW`

### TEST-014 — LOW when latestCheckIn indicates good recovery

Expected:

- `fatigueLevel = LOW`

### TEST-015 — LOW fallback without latestCheckIn when training pattern is healthy

Expected:

- `fatigueLevel = LOW`

### TEST-016 — MODERATE when latestCheckIn is mixed

Expected:

- `fatigueLevel = MODERATE`

---

## 5. Safety Tests

### TEST-017 — No sensitive field in context

Then:

- o contexto não inclui email
- o contexto não inclui token
- o contexto não inclui auth/session payload

### TEST-018 — Missing optional inputs do not throw

Then:

- ausência de `nutritionProfile`, `latestCheckIn` ou `TrainingPlan` não invalida o contexto

---

## 6. Summary

A cobertura mínima deve validar agregação central, heurísticas reais de `fatigueLevel` e comportamento de fallback seguro.
