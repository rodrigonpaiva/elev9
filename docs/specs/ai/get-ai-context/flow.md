# Flow — Get AI Context

## 1. Overview

Este documento descreve o fluxo de execução do use-case `get-ai-context`.

No estado atual, o fluxo termina com a construção de um `UserHealthContext` seguro e reduzido para o usuário autenticado.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before service call
3. Resolve UserProfile from authUserId
4. Resolve latest DailyCheckIn
5. Resolve active FitnessProfile
6. Resolve active NutritionProfile
7. Build partial context
8. Resolve active TrainingPlan when fitness exists
9. Resolve recent WorkoutLogs in a 7-day UTC window
10. Derive adherence, streak, duration and fatigue
11. Serialize safe response
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada.

Endpoint atual:

```txt
GET /ai/context
```

### Step 2 — Validate Session Before Service Call

A autenticação é validada por `AuthSessionGuard`.

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Resolve UserProfile From authUserId

Resolver `UserProfile` pelo `authUserId`.

Se não existir:

- retornar contexto base seguro

### Step 4 — Resolve latest DailyCheckIn

Ler o check-in mais recente por `userProfileId`.

Se não existir:

- `latestCheckIn` fica ausente

### Step 5 — Resolve active FitnessProfile

Ler `FitnessProfile` ativo do usuário.

Se não existir:

- `goal`, `activityLevel` e `weeklyFrequency` ficam ausentes
- o contexto continua válido

### Step 6 — Resolve active NutritionProfile

Ler `NutritionProfile` ativo do usuário.

Se não existir:

- `nutritionProfile` fica ausente

### Step 7 — Build Partial Context

Construir a base com:

- `authUserId`
- `userProfileId`
- `userName`
- campos iniciais de fitness
- `latestCheckIn`
- `nutritionProfile`

### Step 8 — Resolve active TrainingPlan when fitness exists

Se existir `FitnessProfile`, tentar resolver `TrainingPlan` ativo.

Se não existir:

- `todayWorkout` continua `null`
- `recentWorkoutLogs` continua `[]`
- `fatigueLevel` mantém fallback seguro

### Step 9 — Resolve recent WorkoutLogs in a 7-day UTC window

Quando existir `TrainingPlan` ativo:

- buscar logs do plano na janela UTC dos últimos 7 dias incluindo hoje

### Step 10 — Derive Adherence, Streak, Duration And Fatigue

Derivar:

- `adherenceScore`
- `currentStreak`
- `averageWorkoutDuration`
- `fatigueLevel`

Regras atuais:

- `fatigueLevel` pode usar `latestCheckIn` quando disponível
- sem `latestCheckIn`, usa heurística baseada em treino
- na ausência de dados suficientes, cai em `MODERATE`

### Step 11 — Serialize Safe Response

O controller transforma:

- datas para ISO-8601
- `recentWorkoutLogs` para payload seguro
- `latestCheckIn.createdAt` para string
- `generatedAt` para string

---

## 4. Alternative Flows

### 4.1 Invalid Session

- `AUTH_INVALID_SESSION`

### 4.2 Missing UserProfile

- não falhar
- retornar contexto base seguro

### 4.3 Missing FitnessProfile

- não falhar
- retornar contexto parcial

### 4.4 Missing TrainingPlan

- não falhar
- retornar contexto parcial sem dados de treino atual

### 4.5 Missing latestCheckIn

- não falhar
- omitir `latestCheckIn`

### 4.6 Missing nutritionProfile

- não falhar
- omitir `nutritionProfile`

---

## 5. Summary

O fluxo do MVP deve ser autenticado, read-only, user-scoped e resiliente a dados opcionais ausentes.
