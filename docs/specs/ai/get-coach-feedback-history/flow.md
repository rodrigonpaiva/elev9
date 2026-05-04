# Flow — Get Coach Feedback History

## 1. Overview

Este documento descreve o fluxo de execução do use-case `get-coach-feedback-history`.

No MVP, o fluxo termina com a leitura do histórico persistido de `CoachFeedback` do usuário autenticado.

---

## 2. Main Flow

```txt
1. Receive authenticated request
2. Validate session before use-case
3. Validate query input
4. Resolve UserProfile from authUserId
5. Resolve CoachFeedback history by userProfileId
6. Order by createdAt desc
7. Apply limit
8. Return safe feedback list
```

---

## 3. Detailed Flow

### Step 1 — Receive Authenticated Request

O sistema recebe uma requisição autenticada com JWT.

No MVP, o endpoint é:

```txt
GET /ai/coach-feedback
```

O cliente não envia body funcional.

### Step 2 — Validate Session Before Use-Case

No MVP, a sessão deve ser validada antes do use-case por `AuthGuard` ou middleware reutilizando:

```txt
auth/validate-session
```

Se a sessão for inválida:

- `AUTH_INVALID_SESSION`

### Step 3 — Validate Query Input

Validar `limit`:

- ausente -> usar `20`
- deve chegar como string na query HTTP
- deve ser inteiro decimal positivo
- mínimo `1`
- máximo `50`
- valores inválidos -> `AI_FEEDBACK_HISTORY_INVALID_INPUT`

Validar body:

- body com qualquer campo -> `AI_FEEDBACK_HISTORY_INVALID_INPUT`

### Step 4 — Resolve UserProfile From authUserId

Usar `authUserId` vindo da sessão para localizar o `UserProfile` autenticado.

Se não existir `UserProfile`:

- `USER_PROFILE_NOT_FOUND`

### Step 5 — Resolve CoachFeedback History By userProfileId

Buscar `CoachFeedback` persistido por:

```txt
userProfileId
```

Regras:

- retornar apenas feedbacks do usuário autenticado
- não consultar `Nutrition`
- não depender de LLM

### Step 6 — Order By createdAt Desc

Ordenar os feedbacks por:

```txt
createdAt desc
```

O item mais recente deve aparecer primeiro.

### Step 7 — Apply Limit

Aplicar `limit` após ordenar.

Exemplos:

- `limit=1` -> retorna apenas o item mais recente
- sem `limit` -> retorna até `20`

### Step 8 — Return Safe Feedback List

Retornar apenas:

```ts
{
  feedbacks
}
```

Cada item deve conter:

- `id`
- `message`
- `insights`
- `recommendations`
- `createdAt`

Se não houver histórico:

- retornar `feedbacks: []`

---

## 4. Supporting Write Flow

Este `GET` depende do fluxo de escrita do `POST /ai/coach-feedback`.

Sempre que `POST /ai/coach-feedback` for chamado com sucesso, o sistema deve:

1. gerar o payload textual
2. resolver `userProfileId`
3. persistir `CoachFeedback`
4. retornar o feedback normalmente

Se a persistência falhar:

- não retornar feedback parcial
- falhar o `POST` inteiro com `AI_COACH_INTERNAL_ERROR`

---

## 5. Alternative Flows

### 5.1 Invalid Session

Se o token estiver ausente, inválido ou expirado:

- `AUTH_INVALID_SESSION`

### 5.2 Invalid Limit

Se `limit` for inválido:

- `AI_FEEDBACK_HISTORY_INVALID_INPUT`

### 5.3 Invalid Body

Se o cliente enviar body com qualquer campo:

- `AI_FEEDBACK_HISTORY_INVALID_INPUT`

### 5.4 User Profile Not Found

Se não existir `UserProfile` para o `authUserId` da sessão:

- `USER_PROFILE_NOT_FOUND`

### 5.5 Empty History

Se não existirem `CoachFeedbacks`:

- não falhar
- retornar lista vazia

### 5.6 Internal Failure

Se ocorrer erro inesperado:

- `AI_FEEDBACK_HISTORY_INTERNAL_ERROR`

---

## 6. Summary

O fluxo do MVP deve ser:

- autenticado
- isolado por usuário
- ordenado por recência
- resiliente a histórico vazio
- preparado para evolução futura para chat e timeline
