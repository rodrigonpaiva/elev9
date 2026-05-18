# Rules — Build User Health Context

## 1. Overview

Este documento define as regras de negócio e técnicas do `BuildUserHealthContextService`.

---

## 2. Aggregation Rules

### RULE-001 — Centralize context aggregation in one internal service

O serviço agrega:

- user
- fitness
- training
- progress
- recovery
- nutrition
- daily check-ins

### RULE-002 — Build context from authenticated identity

O fluxo obrigatório é:

```txt
authUserId -> UserProfile -> related health data -> UserHealthContext
```

---

## 3. Output Rules

### RULE-003 — fatigueLevel is always present

`fatigueLevel` deve sempre existir.

### RULE-004 — Optional context remains optional

Os seguintes campos podem estar ausentes:

- `userProfileId`
- `userName`
- `goal`
- `activityLevel`
- `weeklyFrequency`
- `activeTrainingPlanId`
- `latestCheckIn`
- `nutritionProfile`

### RULE-005 — hasTrainingPlan is not a real output field

O serviço atual não retorna `hasTrainingPlan`.

A presença de plano ativo é inferida por:

- `activeTrainingPlanId`
- `todayWorkout`

---

## 4. Heuristic Rules

### RULE-006 — fatigueLevel is deterministic

`fatigueLevel` deve ser calculado por heurística determinística.

### RULE-007 — fatigueLevel is not medical

`fatigueLevel` é uma interpretação de produto e não uma avaliação médica.

### RULE-008 — latestCheckIn has priority when present

Quando existir `latestCheckIn`, os sinais subjetivos de recovery têm precedência na heurística.

### RULE-009 — Training fallback is conservative

Na ausência de `latestCheckIn`, o fallback deve ser conservador e usar `MODERATE` quando os dados forem insuficientes.

---

## 5. Fallback Rules

### RULE-010 — Missing UserProfile returns base context

Sem `UserProfile`, retornar contexto base.

### RULE-011 — Missing FitnessProfile returns partial context

Sem `FitnessProfile`, retornar contexto parcial.

### RULE-012 — Missing TrainingPlan returns partial context

Sem `TrainingPlan`, retornar contexto parcial.

### RULE-013 — Missing nutritionProfile does not fail

Sem `nutritionProfile`, o contexto continua válido.

### RULE-014 — Missing latestCheckIn does not fail

Sem `latestCheckIn`, o contexto continua válido.

---

## 6. Safety Rules

### RULE-015 — Keep context reduced and safe

O serviço não deve inserir:

- email
- token
- auth/session material
- dados sensíveis não necessários

### RULE-016 — No external AI dependency

O serviço não chama qualquer provider externo de IA.

---

## 7. Summary

O serviço deve ser compartilhado, determinístico, seguro e resiliente a dados opcionais ausentes.
