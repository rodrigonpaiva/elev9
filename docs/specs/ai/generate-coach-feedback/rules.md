# Rules — Generate Coach Feedback

## 1. Overview

Este documento define as regras de negócio do use-case `generate-coach-feedback`.

No MVP, o objetivo é produzir coaching textual coerente a partir dos dados já disponíveis do usuário.

---

## 2. Identity Rules

### RULE-001 — authUserId comes only from session

`authUserId` deve vir exclusivamente da sessão/JWT validada.

O cliente nunca envia:

- `authUserId`
- `userProfileId`
- `fitnessProfileId`
- `trainingPlanId`

### RULE-002 — Resolve identity through session only

O fluxo obrigatório é:

```txt
session -> authUserId -> UserProfile -> active FitnessProfile
```

Nenhuma resolução por ids externos deve ser aceita.

---

## 3. Mutation Rules

### RULE-003 — No mutation of user fitness/training/progress data

O use-case não pode:

- alterar `FitnessProfile`
- alterar `TrainingPlan`
- alterar `WorkoutLogs`

A única escrita permitida no MVP é:

- criar `CoachFeedback`

### RULE-004 — No external AI in MVP

O MVP não pode chamar:

- OpenAI
- qualquer outro provedor externo de IA

A geração deve ser local e determinística.

### RULE-005 — Successful feedback must be persisted

Feedback gerado com sucesso deve ser persistido como `CoachFeedback`.

Se a persistência falhar:

- o `POST` deve falhar inteiro
- retornar `AI_COACH_INTERNAL_ERROR`
- nunca retornar feedback não persistido

### RULE-006 — No Nutrition access in MVP

O módulo `AI` não deve:

- ler contexto `Nutrition`
- depender de entidades nutricionais
- gerar recomendações nutricionais no MVP

---

## 4. Resolution Rules

### RULE-007 — UserProfile must exist

O sistema deve localizar `UserProfile` pelo `authUserId`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

### RULE-008 — Active FitnessProfile must exist

O sistema deve localizar apenas `FitnessProfile` com:

```txt
status = active
```

Se não existir:

- `FITNESS_PROFILE_NOT_FOUND`

### RULE-009 — TrainingPlan is optional for degraded coaching

O sistema deve tentar localizar `TrainingPlan` ativo, mas ausência de plano não deve impedir feedback quando houver dados mínimos suficientes.

Mínimo necessário:

- `UserProfile`
- `FitnessProfile`
- `WorkoutLogs` e/ou `ProgressSummary`

Sem `TrainingPlan`:

- não retornar erro
- evitar recomendações específicas de treino dependentes de plano

---

## 5. Coaching Data Rules

### RULE-010 — Fixed 7-day UTC analysis window

A análise do MVP deve usar:

- últimos 7 dias corridos incluindo hoje em UTC
- `WorkoutLog.date` no formato `YYYY-MM-DD` UTC
- `startDate` e `endDate` inclusivos

### RULE-011 — AI Coach must consider streak

O feedback deve considerar `currentStreak` quando disponível.

### RULE-012 — AI Coach must consider workout frequency

O feedback deve considerar quantidade recente de treinos concluídos.

### RULE-013 — AI Coach must consider average duration

O feedback deve considerar `averageDurationMinutes` quando disponível.

### RULE-014 — Expected frequency source

`expectedWorkouts` deve ser resolvido pela seguinte prioridade:

1. `FitnessProfile.trainingAvailability.daysPerWeek`
2. fallback por `activityLevel`:
   - `low = 2`
   - `medium = 3`
   - `high = 4`

### RULE-015 — Objective user classification

As classificações do MVP são:

- `no logs = 0 logs na janela`
- `beginner = 1 ou 2 logs na janela`
- `consistent = logs na janela >= expectedWorkouts`
- `inconsistent = logs na janela < expectedWorkouts`
- `high streak = currentStreak >= 3`

### RULE-016 — AI Coach must consider consistency

O feedback deve observar se o usuário está:

- consistente
- inconsistente
- iniciante

### RULE-017 — AI Coach must consider user goal

O feedback deve considerar `goal` do `FitnessProfile`.

### RULE-018 — AI Coach must consider activity level

O feedback deve considerar `activityLevel` do `FitnessProfile`.

### RULE-019 — Few-data scenario must still return useful text

Mesmo com poucos dados:

- o use-case não deve falhar
- a resposta deve ser útil e segura

### RULE-020 — No logs returns motivational initial feedback

Se não houver logs:

- `message` deve ser motivacional
- `insights` deve reconhecer ausência de treino concluído
- `recommendations` deve orientar o primeiro passo

---

## 6. Deterministic Generation Rules

### RULE-021 — Streak praise when streak >= 3

Se `currentStreak >= 3`:

- incluir elogio de consistência

### RULE-022 — Low frequency recommendation when observed frequency is below expected rhythm

Se a frequência observada for claramente menor do que a disponibilidade declarada:

- incluir recomendação para retomar ritmo

### RULE-023 — Positive progress when duration trend is increasing

Para detectar `duration trend increasing` no MVP:

- pegar os logs dentro da janela fixa de 7 dias
- ordenar por `date asc`, usando `createdAt asc` como critério de desempate
- se houver pelo menos `4` logs:
  - dividir a lista ordenada em duas metades
  - calcular `firstHalfAverageDuration`
  - calcular `secondHalfAverageDuration`
  - considerar `increasing = secondHalfAverageDuration > firstHalfAverageDuration`
- se houver menos de `4` logs:
  - não gerar insight de tendência

Se a tendência indicar aumento coerente:

- incluir insight positivo de progresso

### RULE-024 — Message priority order

Quando múltiplas regras forem verdadeiras, a `message` principal deve seguir esta prioridade:

1. `no logs`
2. `high streak`
3. `consistent`
4. `beginner`
5. `inconsistent`
6. fallback motivacional

### RULE-025 — Output limits

O output deve respeitar:

- `message` com no máximo `240` caracteres
- `insights` com no máximo `3` itens
- `recommendations` com no máximo `3` itens
- cada item com no máximo `160` caracteres

### RULE-026 — Recommendations must be actionable

`recommendations` devem ser curtas, claras e executáveis.

Evitar:

- linguagem vaga
- instruções médicas
- promessas exageradas

### RULE-027 — Tone must be supportive, not clinical

O tom deve ser:

- motivador
- claro
- respeitoso

Evitar:

- julgamento
- linguagem punitiva
- diagnóstico clínico

---

## 7. Safety Rules

### RULE-028 — Reject extra request body fields

`POST /ai/coach-feedback` não aceita body funcional.

Se o body vier com qualquer campo:

- rejeitar com `400 AI_COACH_INVALID_INPUT`

### RULE-029 — ProgressSummary must stay algorithmically aligned

`progress/get-progress-summary` é a fonte canônica das regras de agregação.

O módulo `AI` pode recomputar internamente no MVP, mas deve manter o mesmo algoritmo para evitar divergência.

### RULE-030 — Never expose raw internal prompts or hidden reasoning

Não retornar:

- prompt interno
- reasoning interno
- chain-of-thought

### RULE-031 — Never expose sensitive internal data

Não retornar:

- dados de autenticação
- dados de outros usuários
- detalhes internos do banco

### RULE-032 — No medical advice

O MVP não deve produzir:

- diagnóstico
- prescrição médica
- recomendação clínica

### RULE-033 — Keep module DDD-lite and isolated

O contexto `AI` deve apenas orquestrar leitura e geração textual, sem romper os limites do modular monolith.

Com a decisão atual do MVP:

- leitura dos dados de treino/progresso
- geração textual determinística
- persistência de `CoachFeedback`

---

## 8. Summary

O MVP deve ser:

- determinístico
- seguro
- read-only
- útil com poucos dados
- preparado para futura troca do gerador por um LLM real
