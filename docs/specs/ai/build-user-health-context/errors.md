# Errors — Build User Health Context

## 1. Overview

Este documento descreve o comportamento de erro e fallback do `BuildUserHealthContextService`.

O serviço atual privilegia fallback seguro em vez de erro explícito para ausência de dados opcionais.

---

## 2. Error Strategy

O serviço não define hoje uma taxonomia própria de erros de domínio.

Comportamento esperado:

- `authUserId` vazio -> contexto base
- `UserProfile` ausente -> contexto base
- `FitnessProfile` ausente -> contexto parcial
- `TrainingPlan` ausente -> contexto parcial
- `latestCheckIn` ausente -> contexto sem check-in
- `nutritionProfile` ausente -> contexto sem nutrição

---

## 3. Fallback Cases

### 3.1 Empty authUserId

Resultado:

- retornar contexto base com `fatigueLevel = MODERATE`

### 3.2 Missing UserProfile

Resultado:

- retornar contexto base

### 3.3 Missing FitnessProfile

Resultado:

- contexto continua válido
- `goal`, `activityLevel` e `weeklyFrequency` ficam ausentes

### 3.4 Missing TrainingPlan

Resultado:

- contexto continua válido
- `todayWorkout = null`
- `recentWorkoutLogs = []`

### 3.5 Missing latestCheckIn

Resultado:

- contexto continua válido
- heurística de `fatigueLevel` usa apenas sinais de treino quando disponíveis

### 3.6 Missing nutritionProfile

Resultado:

- contexto continua válido
- `nutritionProfile` fica ausente

### 3.7 Insufficient progress data

Resultado:

- `adherenceScore = 0`
- `currentStreak = 0`
- `averageWorkoutDuration = 0`
- `fatigueLevel = MODERATE` quando não houver sinais suficientes

---

## 4. Security Rules

### 4.1 No sensitive auth fields

O serviço não deve inserir no contexto:

- email
- token
- detalhes de sessão

### 4.2 No medical interpretation

`fatigueLevel` é uma heurística determinística de produto, não uma avaliação médica.

---

## 5. Summary

O serviço deve degradar com segurança e evitar falha desnecessária quando partes opcionais do contexto estiverem ausentes.
