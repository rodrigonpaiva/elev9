# Rules — Get Coach Feedback History

## 1. Overview

Este documento define as regras de negócio do use-case `get-coach-feedback-history`.

No MVP, o objetivo é disponibilizar histórico simples e seguro de feedbacks do coach.

---

## 2. Identity Rules

### RULE-001 — authUserId comes only from session

`authUserId` deve vir exclusivamente da sessão/JWT validada.

O cliente nunca envia:

- `authUserId`
- `userProfileId`

### RULE-002 — Resolve identity through session only

O fluxo obrigatório é:

```txt
session -> authUserId -> UserProfile
```

Nenhuma resolução por ids externos deve ser aceita.

---

## 3. Persistence Rules

### RULE-003 — POST /ai/coach-feedback must persist generated feedback

Sempre que `POST /ai/coach-feedback` for executado com sucesso, o sistema deve persistir um `CoachFeedback`.

### RULE-004 — No success response without persistence

Se o feedback for gerado, mas a persistência falhar:

- o `POST /ai/coach-feedback` deve falhar inteiro
- retornar `AI_COACH_INTERNAL_ERROR`
- nunca retornar feedback não persistido

### RULE-005 — CoachFeedback persisted fields

O MVP deve persistir:

- `id`
- `userProfileId`
- `message`
- `insights[]`
- `recommendations[]`
- `createdAt`

### RULE-006 — GET history is read-only

O `GET /ai/coach-feedback` não pode:

- criar entidades
- atualizar entidades
- deletar entidades

Ele opera apenas em leitura.

---

## 4. Resolution Rules

### RULE-007 — UserProfile must exist

O sistema deve localizar `UserProfile` pelo `authUserId`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

### RULE-008 — History must be isolated by authenticated user

O histórico deve retornar apenas `CoachFeedback` do `userProfileId` autenticado.

Nunca retornar:

- feedbacks de outros usuários

---

## 5. Query Rules

### RULE-009 — limit is optional

`limit` é opcional.

Quando ausente:

- usar `20`

### RULE-010 — limit format

`limit`:

- vem da query HTTP como string
- deve ser inteiro decimal positivo

### RULE-011 — limit range

`limit` deve estar entre:

- mínimo `1`
- máximo `50`

Valores inválidos:

- `AI_FEEDBACK_HISTORY_INVALID_INPUT`

### RULE-012 — GET does not accept body

`GET /ai/coach-feedback` não aceita body.

Se o body vier com qualquer campo:

- `AI_FEEDBACK_HISTORY_INVALID_INPUT`

### RULE-013 — Order by createdAt desc

O histórico deve ser ordenado por:

```txt
createdAt desc
```

### RULE-014 — Tie-break ordering

Em empate de `createdAt`:

- usar `id desc` quando aplicável
- isso depende do suporte do repositório/driver ao critério secundário de ordenação

### RULE-015 — Apply limit after ordering

O `limit` deve ser aplicado após a ordenação por recência.

---

## 6. Output Rules

### RULE-016 — Empty history returns empty list

Se não houver `CoachFeedback`:

- retornar `feedbacks: []`

### RULE-017 — Safe response fields only

Cada item de histórico pode retornar apenas:

- `id`
- `message`
- `insights`
- `recommendations`
- `createdAt`

### RULE-018 — createdAt must be server-generated UTC

`createdAt` deve ser:

- gerado pelo servidor
- em UTC

### RULE-019 — createdAt must be serialized

`createdAt` deve ser serializado como string ISO-8601.

---

## 7. Isolation Rules

### RULE-020 — No Nutrition access in MVP

O módulo `AI` não deve:

- ler contexto `Nutrition`
- depender de entidades nutricionais
- enriquecer o histórico com dados nutricionais

### RULE-021 — No external AI in MVP

O MVP não pode chamar:

- OpenAI
- qualquer outro provedor externo de IA

Este fluxo opera sobre feedback já persistido.

---

## 8. Safety Rules

### RULE-022 — Never expose internal ownership fields

Não retornar:

- `userProfileId`
- ids internos de outros usuários
- dados internos de banco

### RULE-023 — Keep module DDD-lite and isolated

O contexto `AI` deve apenas orquestrar persistência e leitura de `CoachFeedback`, sem romper os limites do modular monolith.

---

## 9. Summary

O MVP deve ser:

- persistente
- simples
- seguro
- isolado por usuário
- pronto para timeline e chat no futuro
