# Rules — Replay Coach Feedback

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `replay-coach-feedback`.

---

## 2. Identity Rules

### RULE-001 — authUserId comes only from session

`authUserId` deve vir exclusivamente da sessão validada.

### RULE-002 — Replay is scoped to authenticated ownership

O fluxo obrigatório é:

```txt
session -> authUserId -> UserProfile -> CoachFeedback
```

Se o feedback não pertencer ao usuário:

- `COACH_FEEDBACK_NOT_FOUND`

---

## 3. Replay Rules

### RULE-003 — Replay requires persisted contextSnapshot

Sem `contextSnapshot`, o replay não deve acontecer.

### RULE-004 — Replay requires supported generatorVersion

Somente versões suportadas podem ser reproduzidas.

### RULE-005 — Replay reuses the real generator

O fluxo deve reutilizar `CoachFeedbackGenerator`.

### RULE-006 — Replay is computed on demand

O replay não pode ser pré-computado nem persistido.

### RULE-007 — Replay returns simple matches

`matches` deve conter apenas:

- `message`
- `insights`
- `recommendations`
- `influences`

---

## 4. Safety Rules

### RULE-008 — Replay must not mutate persisted data

O fluxo não pode:

- criar novos feedbacks
- atualizar feedbacks existentes
- sobrescrever metadata

### RULE-009 — Never expose sensitive fields

Não retornar:

- `userProfileId`
- email
- token
- session data

### RULE-010 — Replay remains internal-only

O fluxo não altera os endpoints públicos de coach feedback.

---

## 5. Technical Rules

### RULE-011 — Snapshot mapping must stay minimal

O mapeamento de `contextSnapshot` para input do generator deve usar apenas o necessário.

### RULE-012 — No external AI provider

O replay não usa OpenAI nem qualquer provider externo.

---

## 6. Summary

O replay deve ser interno, determinístico, versionado, ownership-safe e sem persistência adicional.
