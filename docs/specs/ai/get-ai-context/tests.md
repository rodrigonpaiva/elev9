# Tests — Get AI Context

## 1. Overview

Este documento define os cenários de teste do use-case `get-ai-context`.

---

## 2. Test Strategy

Tipos de teste recomendados:

```txt
Unit tests
Integration tests
E2E tests
```

---

## 3. Success Scenarios

### TEST-001 — Return complete AI context

Given:

- sessão válida
- `UserProfile`, `FitnessProfile`, `TrainingPlan`, `DailyCheckIn` e `NutritionProfile` existentes

Then:

- a resposta inclui contexto agregado completo

### TEST-002 — Return partial context when only user data exists

Expected:

- o endpoint retorna contexto seguro mesmo sem `FitnessProfile`

### TEST-003 — Return safe context without active training plan

Expected:

- `todayWorkout = null`
- `recentWorkoutLogs = []`

### TEST-004 — Include latestCheckIn when present

Expected:

- `latestCheckIn` é serializado corretamente

### TEST-005 — Omit latestCheckIn when absent

Expected:

- `latestCheckIn` fica ausente

### TEST-006 — Include nutritionProfile when present

Expected:

- `nutritionProfile` inclui goal, mealsPerDay e listas opcionais

### TEST-007 — Omit nutritionProfile when absent

Expected:

- `nutritionProfile` fica ausente

---

## 4. Recovery Scenarios

### TEST-008 — Return HIGH fatigue from low energy

Expected:

- `fatigueLevel = HIGH`

### TEST-009 — Return HIGH fatigue from poor sleep

Expected:

- `fatigueLevel = HIGH`

### TEST-010 — Return HIGH fatigue from high soreness

Expected:

- `fatigueLevel = HIGH`

### TEST-011 — Return LOW fatigue from good recovery signals

Expected:

- `fatigueLevel = LOW`

### TEST-012 — Return MODERATE when data is mixed or incomplete

Expected:

- `fatigueLevel = MODERATE`

---

## 5. Security Tests

### TEST-013 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-014 — No sensitive field leak

Then:

- a resposta não expõe email
- a resposta não expõe token
- a resposta não expõe session data

### TEST-015 — Context remains user-scoped

Then:

- o contexto sempre é resolvido pelo `authUserId` autenticado

---

## 6. Summary

A cobertura mínima deve validar agregação segura, fallbacks de recovery e nutrition, serialização correta e ausência de dados sensíveis.
