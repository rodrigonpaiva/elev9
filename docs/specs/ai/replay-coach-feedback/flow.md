# Flow — Replay Coach Feedback

## 1. Overview

Este documento descreve o fluxo de execução do use-case `replay-coach-feedback`.

No estado atual, o fluxo termina com a regeneração determinística do feedback e a comparação simples entre `persisted` e `replayed`.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Resolve UserProfile from authUserId
4. Load CoachFeedback by id
5. Validate ownership
6. Validate contextSnapshot
7. Validate generatorVersion
8. Map snapshot to generator input
9. Reuse CoachFeedbackGenerator
10. Compare persisted and replayed output
11. Return replay result
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada.

Endpoint atual:

```txt
GET /ai/debug/coach-feedback/:id/replay
```

### Step 2 — Validate Session Before Use-Case

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Resolve UserProfile From authUserId

Resolver o `UserProfile` do usuário autenticado.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

### Step 4 — Load CoachFeedback By id

Ler `CoachFeedback` por `feedbackId`.

### Step 5 — Validate Ownership

Validar:

```txt
feedback.userProfileId === userProfile.id
```

Se falhar:

- `COACH_FEEDBACK_NOT_FOUND`

### Step 6 — Validate contextSnapshot

O replay exige `contextSnapshot`.

Se estiver ausente ou insuficiente:

- `COACH_FEEDBACK_REPLAY_CONTEXT_MISSING`

### Step 7 — Validate generatorVersion

O replay atual exige:

```txt
heuristic-v1
```

Se a versão for desconhecida:

- `COACH_FEEDBACK_GENERATOR_VERSION_UNSUPPORTED`

### Step 8 — Map Snapshot To Generator Input

Converter o `contextSnapshot` persistido no input mínimo esperado pelo generator.

Este mapeamento usa apenas os campos necessários.

### Step 9 — Reuse CoachFeedbackGenerator

Reexecutar o `CoachFeedbackGenerator` real.

Não duplicar regras de geração.

### Step 10 — Compare Persisted And Replayed Output

Comparar:

- `message`
- `insights`
- `recommendations`
- `influences`

Construir `matches` com booleans simples.

### Step 11 — Return Replay Result

Retornar:

- `feedbackId`
- `generatorVersion`
- `persisted`
- `replayed`
- `matches`

Sem persistir replay no banco.

---

## 4. Alternative Flows

### 4.1 Invalid Body

- `AI_COACH_REPLAY_INVALID_INPUT`

### 4.2 Invalid Session

- `AUTH_INVALID_SESSION`

### 4.3 User Profile Not Found

- `USER_PROFILE_NOT_FOUND`

### 4.4 Feedback Not Found Or Not Owned

- `COACH_FEEDBACK_NOT_FOUND`

### 4.5 Missing Replay Context

- `COACH_FEEDBACK_REPLAY_CONTEXT_MISSING`

### 4.6 Unsupported Generator Version

- `COACH_FEEDBACK_GENERATOR_VERSION_UNSUPPORTED`

### 4.7 Internal Failure

- `COACH_FEEDBACK_REPLAY_INTERNAL_ERROR`

---

## 5. Summary

O replay atual deve ser autenticado, determinístico, versionado, isolado por usuário e completamente read-only.
