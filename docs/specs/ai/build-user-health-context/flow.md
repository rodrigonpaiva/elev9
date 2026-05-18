# Flow — Build User Health Context

## 1. Overview

Este documento descreve o fluxo interno do `BuildUserHealthContextService`.

---

## 2. Main Flow

```txt
1. Receive authUserId
2. Create base context
3. Resolve UserProfile
4. Resolve latest DailyCheckIn
5. Resolve active FitnessProfile
6. Resolve active NutritionProfile
7. Build partial context
8. Resolve active TrainingPlan when fitness exists
9. Resolve recent WorkoutLogs in 7-day UTC window
10. Derive adherence, streak, duration and fatigue
11. Return final UserHealthContext
```

---

## 3. Detailed Flow

### Step 1 — Receive authUserId

O serviço recebe:

```txt
authUserId
```

### Step 2 — Create Base Context

Criar contexto base com:

- `adherenceScore = 0`
- `currentStreak = 0`
- `averageWorkoutDuration = 0`
- `fatigueLevel = MODERATE`
- `availableEquipment = []`
- `limitations = []`
- `todayWorkout = null`
- `recentWorkoutLogs = []`
- `generatedAt = clock.now()`

### Step 3 — Resolve UserProfile

Buscar `UserProfile` por `authUserId`.

Se não existir:

- retornar contexto base

### Step 4 — Resolve latest DailyCheckIn

Buscar o check-in mais recente por `userProfileId`.

Se existir:

- mapear `energyLevel`
- `sleepQuality`
- `muscleSoreness`
- `motivationLevel`
- `createdAt`

### Step 5 — Resolve active FitnessProfile

Buscar `FitnessProfile` ativo do usuário.

Se existir:

- mapear `goal`
- mapear `activityLevel`
- resolver `weeklyFrequency`
- mapear `limitations`

### Step 6 — Resolve active NutritionProfile

Buscar `NutritionProfile` ativo do usuário.

Se existir:

- mapear `goal`
- `mealsPerDay`
- `dietaryRestrictions`
- `allergies`
- `dislikedFoods`
- `preferredFoods`

### Step 7 — Build Partial Context

Combinar contexto base com:

- `userProfileId`
- `userName`
- `latestCheckIn`
- campos de fitness
- `nutritionProfile`

### Step 8 — Resolve active TrainingPlan when fitness exists

Se existir `FitnessProfile`, buscar `TrainingPlan` ativo.

Se não existir:

- retornar contexto parcial

### Step 9 — Resolve recent WorkoutLogs in 7-day UTC window

Buscar logs do plano ativo em:

- `startDate = today - 6 days`
- `endDate = today`

Ambos em UTC.

### Step 10 — Derive adherence, streak, duration and fatigue

Derivar:

- `adherenceScore`
- `currentStreak`
- `averageWorkoutDuration`
- `fatigueLevel`
- `todayWorkout`

### Step 11 — Return final UserHealthContext

Retornar contexto completo ou parcial, conforme os dados disponíveis.

---

## 4. Fatigue Heuristic Flow

### 4.1 With latestCheckIn

`HIGH` quando:

- `energyLevel <= 2`
- ou `sleepQuality <= 2`
- ou `muscleSoreness >= 4`

`LOW` quando:

- `energyLevel >= 4`
- `sleepQuality >= 4`
- `muscleSoreness <= 2`
- `motivationLevel >= 4`
- `currentStreak` entre `1` e `4`

Caso contrário:

- `MODERATE`

### 4.2 Without latestCheckIn

`MODERATE` quando:

- não há logs recentes
- ou `weeklyFrequency` está ausente

`HIGH` quando:

- `currentStreak >= 6`
- ou `averageWorkoutDuration >= 75`
- ou `recentLogsCount > weeklyFrequency + 2`

`LOW` quando:

- `currentStreak` entre `1` e `3`
- `averageWorkoutDuration <= 45`
- `recentLogsCount <= weeklyFrequency`

Caso contrário:

- `MODERATE`

---

## 5. Summary

O fluxo deve agregar contexto de forma determinística, com heurísticas simples e fallback seguro em cada etapa opcional.
