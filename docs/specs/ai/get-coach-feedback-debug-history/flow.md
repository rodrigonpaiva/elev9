# Flow — Get Coach Feedback Debug History

## 1. Overview

Este documento descreve o fluxo de execução do use-case `get-coach-feedback-debug-history`.

No estado atual, o fluxo termina com a leitura segura do histórico interno de `CoachFeedback` do usuário autenticado.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Validate query input
4. Resolve UserProfile from authUserId
5. Resolve CoachFeedback history by userProfileId
6. Apply limit
7. Serialize explainability metadata
8. Return safe debug history
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada.

Endpoint atual:

```txt
GET /ai/debug/coach-feedback
```

### Step 2 — Validate Session Before Use-Case

A sessão deve ser validada antes do use-case.

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Validate Query Input

Validar `limit`:

- ausente -> usar `20`
- mínimo `1`
- máximo `100`
- deve ser inteiro

Validar body:

- body com qualquer campo -> `AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT`

### Step 4 — Resolve UserProfile From authUserId

Usar `authUserId` vindo da sessão para localizar o `UserProfile`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

### Step 5 — Resolve CoachFeedback History By userProfileId

Buscar `CoachFeedback` por:

```txt
userProfileId
```

Regras:

- retornar apenas feedbacks do usuário autenticado
- não recalcular feedback
- não executar replay

### Step 6 — Apply Limit

Aplicar `limit` na leitura do histórico já ordenado pelo repositório.

Exemplos:

- sem `limit` -> até `20`
- `limit=100` -> até `100`

### Step 7 — Serialize Explainability Metadata

Retornar:

- `influences`
- `generatorVersion`
- `contextSnapshot`

Compatibilidade:

- `influences` ausente -> `[]`
- `generatorVersion` ausente -> omitir
- `contextSnapshot` ausente -> omitir

### Step 8 — Return Safe Debug History

Retornar apenas payload seguro do histórico interno.

Nenhum dado sensível, auth ou ownership interno deve ser exposto.

---

## 4. Alternative Flows

### 4.1 Invalid Session

- `AUTH_INVALID_SESSION`

### 4.2 Invalid Limit

- `AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT`

### 4.3 Invalid Body

- `AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT`

### 4.4 User Profile Not Found

- `USER_PROFILE_NOT_FOUND`

### 4.5 Empty History

- não falhar
- retornar `feedbacks: []`

### 4.6 Legacy Documents

- não falhar
- retornar `influences: []`
- manter `generatorVersion` e `contextSnapshot` opcionais

### 4.7 Internal Failure

- `AI_FEEDBACK_DEBUG_HISTORY_INTERNAL_ERROR`

---

## 5. Summary

O fluxo do MVP deve ser autenticado, isolado por usuário, read-only e compatível com metadata de explainability legada.
