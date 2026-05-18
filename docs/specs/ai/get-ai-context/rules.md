# Rules — Get AI Context

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `get-ai-context`.

---

## 2. Identity Rules

### RULE-001 — authUserId comes only from session

`authUserId` deve vir exclusivamente da sessão validada.

### RULE-002 — Context is always user-scoped

O contexto deve ser resolvido apenas para o usuário autenticado.

---

## 3. Aggregation Rules

### RULE-003 — Context aggregates multiple product domains

O endpoint pode agregar:

- user
- fitness
- training
- progress
- recovery
- nutrition
- daily check-ins

### RULE-004 — nutritionProfile is optional

Ausência de `nutritionProfile` não deve gerar erro.

### RULE-005 — latestCheckIn is optional

Ausência de `latestCheckIn` não deve gerar erro.

### RULE-006 — fatigueLevel is always present

`fatigueLevel` deve sempre existir com fallback seguro.

### RULE-007 — recoveryTrend is not exposed here today

Embora sinais de recovery alimentem outros fluxos internos, `recoveryTrend` não faz parte do payload atual de `GET /ai/context`.

---

## 4. Training Rules

### RULE-008 — Training data is optional beyond the active profile

Se não existir `TrainingPlan` ativo:

- `todayWorkout = null`
- `recentWorkoutLogs = []`
- `activeTrainingPlanId` fica ausente

### RULE-009 — Weekly frequency uses safe fallback

`weeklyFrequency` deve preferir `daysPerWeek` do fitness profile e, na ausência, usar fallback por `activityLevel`.

---

## 5. Safety Rules

### RULE-010 — Never expose sensitive auth data

Não retornar:

- email
- token
- session material
- password

### RULE-011 — Context response must stay reduced and serializable

O payload deve conter apenas dados seguros e serializáveis.

---

## 6. Technical Rules

### RULE-012 — Read-only endpoint

O endpoint não pode:

- criar entidades
- atualizar entidades
- persistir snapshots

### RULE-013 — No external AI provider

O endpoint não chama OpenAI nem qualquer provider externo.

---

## 7. Summary

O contexto de IA deve ser seguro, parcial quando necessário, autenticado e consistente com os agregados reais do backend.
