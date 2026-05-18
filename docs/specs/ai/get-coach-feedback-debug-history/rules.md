# Rules — Get Coach Feedback Debug History

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `get-coach-feedback-debug-history`.

---

## 2. Identity Rules

### RULE-001 — authUserId comes only from session

`authUserId` deve vir exclusivamente da sessão validada.

### RULE-002 — Resolve debug history through userProfileId only

O fluxo obrigatório é:

```txt
session -> authUserId -> UserProfile -> CoachFeedback[]
```

---

## 3. Query Rules

### RULE-003 — limit is optional

Quando ausente:

- usar `20`

### RULE-004 — limit range

`limit` deve estar entre:

- mínimo `1`
- máximo `100`

### RULE-005 — GET does not accept body

`GET /ai/debug/coach-feedback` não aceita body funcional.

---

## 4. Explainability Rules

### RULE-006 — Debug history includes influences

O histórico interno deve expor `influences`.

### RULE-007 — Debug history includes generatorVersion when available

`generatorVersion` deve ser retornado quando existir no documento persistido.

### RULE-008 — Debug history includes contextSnapshot when available

`contextSnapshot` deve ser retornado quando existir no documento persistido.

### RULE-009 — Legacy documents remain valid

Documentos antigos sem metadata continuam válidos.

Fallbacks:

- `influences -> []`
- `generatorVersion -> undefined`
- `contextSnapshot -> undefined`

---

## 5. Safety Rules

### RULE-010 — Never expose sensitive fields

Não retornar:

- `userProfileId`
- email
- token
- session data
- detalhes internos de banco

### RULE-011 — Debug metadata stays separate from public history

O fluxo não altera o contrato de:

- `GET /ai/coach-feedback`

---

## 6. Technical Rules

### RULE-012 — Read-only path

O fluxo não pode:

- criar entidades
- atualizar entidades
- persistir replay

### RULE-013 — No external AI provider

Este fluxo não chama OpenAI nem qualquer outro provider.

---

## 7. Summary

O histórico de debug deve ser interno, autenticado, isolado por usuário e compatível com metadata de explainability e documentos legados.
