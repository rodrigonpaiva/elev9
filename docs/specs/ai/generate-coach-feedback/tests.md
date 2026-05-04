# Tests — Generate Coach Feedback

## 1. Overview

Este documento define os cenários de teste do use-case `generate-coach-feedback`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar geração textual determinística
- preservar isolamento do contexto `AI`

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

### TEST-001 — Return feedback for user with many logs

Given:

- sessão válida
- `UserProfile` existente
- `FitnessProfile` ativo existente
- `TrainingPlan` ativo
- múltiplos `WorkoutLogs` recentes

Then:

- o feedback é retornado com sucesso
- `message` é coerente
- `insights` não está vazio
- `recommendations` não está vazio

### TEST-002 — Return starter feedback for beginner user

Given:

- poucos logs
- streak baixo
- `1` ou `2` logs na janela fixa dos últimos 7 dias

Then:

- a resposta continua válida
- recomendações focam em estabelecer ritmo

### TEST-003 — Return inconsistency feedback

Given:

- usuário com baixa frequência recente
- `logs na janela < expectedWorkouts`
- `expectedWorkouts` derivado de `trainingAvailability.daysPerWeek` ou fallback de `activityLevel`

Then:

- a resposta indica oportunidade de melhorar consistência

### TEST-004 — Return no-logs motivational feedback

Given:

- nenhum `WorkoutLog`
- nenhum log na janela fixa dos últimos 7 dias

Then:

- a resposta retorna sucesso
- `message` é motivacional
- `insights` reconhece ausência de treinos
- `recommendations` sugere começar

### TEST-005 — High streak generates consistency praise

Given:

- `currentStreak >= 3`

Then:

- a resposta elogia consistência

### TEST-006 — Increasing duration generates positive progress insight

Given:

- a tendência recente de duração média é positiva

Then:

- um insight positivo sobre progresso é incluído

### TEST-007 — Goal-aware recommendation

Given:

- `goal = gain_muscle` ou outro objetivo conhecido

Then:

- a recomendação é compatível com o objetivo

### TEST-008 — Activity-level-aware recommendation

Given:

- `activityLevel` conhecido

Then:

- a recomendação respeita o ritmo esperado

### TEST-009 — Training availability is primary expected frequency source

Given:

- `FitnessProfile.trainingAvailability.daysPerWeek` preenchido

Then:

- `expectedWorkouts` usa esse valor

### TEST-010 — Activity level fallback resolves expected frequency

Given:

- `trainingAvailability.daysPerWeek` ausente
- `activityLevel = low | medium | high`

Then:

- `expectedWorkouts` usa fallback:
  - `low = 2`
  - `medium = 3`
  - `high = 4`

### TEST-011 — TrainingPlan absence does not fail feedback generation

Given:

- `UserProfile` existente
- `FitnessProfile` ativo
- sem `TrainingPlan`
- com `WorkoutLogs` e/ou `ProgressSummary`

Then:

- a resposta retorna sucesso
- não inclui recomendação específica dependente de plano

---

## 4. Business Errors

### TEST-012 — Invalid body is rejected

Expected:

- `AI_COACH_INVALID_INPUT`

### TEST-013 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-014 — Fitness profile not found

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

### TEST-015 — Internal repository failure

Expected:

- `AI_COACH_INTERNAL_ERROR`

### TEST-016 — Persist feedback when POST succeeds

Expected:

- `CoachFeedback` é criado com `userProfileId`, `message`, `insights`, `recommendations` e `createdAt`

### TEST-017 — Persistence failure returns AI_COACH_INTERNAL_ERROR

Given:

- geração textual bem-sucedida
- falha ao persistir `CoachFeedback`

Then:

- o `POST` falha com `AI_COACH_INTERNAL_ERROR`
- nenhum feedback não persistido é retornado

---

## 5. Security Tests

### TEST-018 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-019 — authUserId never comes from body

Expected:

- o sistema rejeita qualquer tentativa de enviar `authUserId`

### TEST-020 — No raw workout data leak

Then:

- a resposta não expõe lista completa de `WorkoutLogs`
- a resposta não expõe ids internos desnecessários

### TEST-021 — No Nutrition access in MVP

Then:

- o fluxo não lê `Nutrition`
- o fluxo não produz recomendações nutricionais

### TEST-022 — No external AI call in MVP

Then:

- o fluxo não depende de OpenAI
- o fluxo continua funcionando offline da perspectiva de IA externa

### TEST-023 — No unintended mutation happens

Then:

- nenhuma entidade é criada além de `CoachFeedback`
- nenhuma entidade existente é atualizada
- nenhuma entidade é deletada

---

## 6. Presentation Tests

### TEST-024 — HTTP success response shape

Expected:

- `POST /ai/coach-feedback` retorna:
  - `message`
  - `insights`
  - `recommendations`

And:

- `message` tem no máximo `240` caracteres
- `insights` tem no máximo `3` itens
- `recommendations` tem no máximo `3` itens
- cada item tem no máximo `160` caracteres

### TEST-025 — HTTP invalid input mapping

Expected:

- `AI_COACH_INVALID_INPUT -> 400`

### TEST-026 — HTTP invalid session mapping

Expected:

- `AUTH_INVALID_SESSION -> 401`

### TEST-027 — HTTP user profile not found mapping

Expected:

- `USER_PROFILE_NOT_FOUND -> 404`

### TEST-028 — HTTP fitness profile not found mapping

Expected:

- `FITNESS_PROFILE_NOT_FOUND -> 404`

### TEST-029 — HTTP internal failure mapping

Expected:

- `AI_COACH_INTERNAL_ERROR -> 500`

### TEST-030 — Message priority order is deterministic

Given:

- um cenário que satisfaz múltiplas regras

Then:

- a `message` segue a prioridade:
  - `no logs`
  - `high streak`
  - `consistent`
  - `beginner`
  - `inconsistent`
  - fallback motivacional

---

## 7. Summary

Os testes devem provar que o MVP:

- gera feedback coerente
- funciona com dados escassos
- não altera dados
- não usa IA externa
- mantém o contrato estável
