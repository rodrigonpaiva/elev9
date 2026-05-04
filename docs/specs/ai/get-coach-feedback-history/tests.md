# Tests — Get Coach Feedback History

## 1. Overview

Este documento define os cenários de teste do use-case `get-coach-feedback-history`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar persistência simples
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

### TEST-001 — Return empty history when user has no feedbacks

Given:

- sessão válida
- `UserProfile` existente
- nenhum `CoachFeedback`

Then:

- a resposta retorna sucesso
- `feedbacks = []`

### TEST-002 — Return multiple feedbacks ordered by createdAt desc

Given:

- múltiplos `CoachFeedbacks` do mesmo usuário

Then:

- os itens são retornados em `createdAt desc`

### TEST-003 — Apply default limit

Given:

- mais de `20` feedbacks
- query sem `limit`

Then:

- a resposta retorna no máximo `20`

### TEST-004 — Apply limit=1

Given:

- mais de `1` feedback
- query `limit=1`

Then:

- a resposta retorna exatamente o item mais recente

### TEST-005 — Apply explicit limit

Given:

- mais de `10` feedbacks
- query `limit=10`

Then:

- a resposta retorna no máximo `10`

### TEST-006 — Order by createdAt desc

Given:

- múltiplos `CoachFeedbacks` com datas diferentes

Then:

- os itens vêm em `createdAt desc`

### TEST-006A — Tie-break by id desc when createdAt is equal

Optional:

- aplicar apenas quando o repositório/driver suportar ordenação secundária estável

Given:

- múltiplos `CoachFeedbacks` com o mesmo `createdAt`

Then:

- os itens vêm em `id desc` como desempate

### TEST-007 — Isolate history by user

Given:

- feedbacks de múltiplos usuários

Then:

- o endpoint retorna apenas os itens do usuário autenticado

### TEST-008 — Persist feedback when POST /ai/coach-feedback succeeds

Given:

- geração de feedback bem-sucedida

Then:

- um `CoachFeedback` é criado com:
  - `userProfileId`
  - `message`
  - `insights`
  - `recommendations`
  - `createdAt`

### TEST-009 — Persistence failure during POST returns AI_COACH_INTERNAL_ERROR

Given:

- geração de feedback bem-sucedida
- falha ao persistir `CoachFeedback`

Then:

- o `POST /ai/coach-feedback` falha
- a resposta é `AI_COACH_INTERNAL_ERROR`
- nenhum feedback não persistido é retornado

---

## 4. Business Errors

### TEST-010 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-011 — Invalid limit lower than minimum

Expected:

- `AI_FEEDBACK_HISTORY_INVALID_INPUT`

### TEST-012 — Invalid limit above maximum

Expected:

- `AI_FEEDBACK_HISTORY_INVALID_INPUT`

### TEST-013 — Invalid non-integer limit

Expected:

- `AI_FEEDBACK_HISTORY_INVALID_INPUT`

### TEST-014 — GET with unexpected body returns invalid input

Expected:

- `AI_FEEDBACK_HISTORY_INVALID_INPUT`

### TEST-015 — Internal repository failure

Expected:

- `AI_FEEDBACK_HISTORY_INTERNAL_ERROR`

---

## 5. Security Tests

### TEST-016 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-017 — No other user's feedbacks leak

Then:

- a resposta não contém itens de outro `userProfileId`

### TEST-018 — No internal ownership field leak

Then:

- a resposta não expõe `userProfileId`

### TEST-019 — No Nutrition access in MVP

Then:

- o fluxo não lê `Nutrition`
- o fluxo não enriquece histórico com dados nutricionais

### TEST-020 — No external AI call in MVP

Then:

- o fluxo não depende de OpenAI
- o fluxo funciona apenas com persistência local

---

## 6. Presentation Tests

### TEST-021 — HTTP success response shape

Expected:

- `GET /ai/coach-feedback` retorna:
  - `feedbacks`

### TEST-022 — HTTP invalid input mapping

Expected:

- `AI_FEEDBACK_HISTORY_INVALID_INPUT -> 400`

### TEST-023 — HTTP invalid session mapping

Expected:

- `AUTH_INVALID_SESSION -> 401`

### TEST-024 — HTTP user profile not found mapping

Expected:

- `USER_PROFILE_NOT_FOUND -> 404`

### TEST-025 — HTTP internal failure mapping

Expected:

- `AI_FEEDBACK_HISTORY_INTERNAL_ERROR -> 500`

---

## 7. Summary

Os testes devem provar que o MVP:

- persiste feedback no `POST`
- retorna histórico corretamente no `GET`
- aplica `limit`
- isola os dados por usuário
- não usa IA externa
