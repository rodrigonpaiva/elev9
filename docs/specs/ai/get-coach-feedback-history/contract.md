# Contract — Get Coach Feedback History

## 1. Overview

Este documento define o contrato do use-case `get-coach-feedback-history`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
ai.get-coach-feedback-history
```

---

## 3. Input

```ts
type GetCoachFeedbackHistoryHttpQuery = {
  authUserId: string;
  limit?: string;
};

type GetCoachFeedbackHistoryInput = {
  authUserId: string;
  limit: number;
};
```

Observações:

- `authUserId` vem exclusivamente da sessão/JWT validada
- `limit` vem da query HTTP como string quando informado
- o use-case recebe `limit` já normalizado como número
- `limit` default = `20`
- `limit` mínimo = `1`
- `limit` máximo = `50`
- `limit` deve ser inteiro decimal positivo
- o cliente não envia `userProfileId`
- o endpoint não aceita body funcional no MVP

---

## 4. Input Example

```http
GET /ai/coach-feedback
Authorization: Bearer <access-token>
```

Com query opcional:

```http
GET /ai/coach-feedback?limit=10
Authorization: Bearer <access-token>
```

Exemplo inválido:

```http
GET /ai/coach-feedback?limit=abc
Authorization: Bearer <access-token>
```

Body esperado:

```json
{}
```

Body inválido:

```json
{
  "unexpected": true
}
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

### limit

- optional
- decimal integer string in HTTP query
- when absent, use `20`
- must be between `1` and `50`
- invalid values must return `400 AI_FEEDBACK_HISTORY_INVALID_INPUT`

### request body

- no functional fields accepted
- any body field must return `400 AI_FEEDBACK_HISTORY_INVALID_INPUT`

---

## 6. Output

```ts
type GetCoachFeedbackHistoryOutput = {
  feedbacks: Array<{
    id: string;
    message: string;
    insights: string[];
    recommendations: string[];
    createdAt: string;
  }>;
};
```

Observações:

- `createdAt` é gerado pelo servidor em UTC
- `createdAt` deve ser serializado em ISO-8601
- `feedbacks` pode ser vazio
- os itens devem vir em `createdAt desc`
- em empate, usar `id desc` quando aplicável

---

## 7. Success Response Example

```json
{
  "feedbacks": [
    {
      "id": "feedback_002",
      "message": "Great consistency this week. You're on a 4-day streak.",
      "insights": ["You trained 4 times this week"],
      "recommendations": ["Keep your current rhythm"],
      "createdAt": "2026-05-04T10:00:00.000Z"
    },
    {
      "id": "feedback_001",
      "message": "Good start this week. You already logged your first workouts and can build consistency from here.",
      "insights": ["You completed 2 workouts in the last 7 days"],
      "recommendations": ["Repeat this rhythm for one more session this week"],
      "createdAt": "2026-05-02T10:00:00.000Z"
    }
  ]
}
```

### Empty History Example

```json
{
  "feedbacks": []
}
```

### limit=1 Example

```json
{
  "feedbacks": [
    {
      "id": "feedback_002",
      "message": "Great consistency this week. You're on a 4-day streak.",
      "insights": ["You trained 4 times this week"],
      "recommendations": ["Keep your current rhythm"],
      "createdAt": "2026-05-04T10:00:00.000Z"
    }
  ]
}
```

---

## 8. Persisted Entity Shape

```ts
type CoachFeedback = {
  id: string;
  userProfileId: string;
  message: string;
  insights: string[];
  recommendations: string[];
  createdAt: Date;
};
```

Observações:

- `userProfileId` nunca deve ser retornado ao cliente
- não há atualização de feedback no MVP

---

## 9. Fields That Must Never Be Returned

- `userProfileId`
- `password`
- `passwordHash`
- raw JWT
- prompt interno
- chain-of-thought
- dados de outros usuários

---

## 10. Error Response Shape

```ts
type GetCoachFeedbackHistoryError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 11. Possible Error Codes

```txt
AUTH_INVALID_SESSION
USER_PROFILE_NOT_FOUND
AI_FEEDBACK_HISTORY_INVALID_INPUT
AI_FEEDBACK_HISTORY_INTERNAL_ERROR
```

---

## 12. Transport

No MVP, o contrato é exposto por HTTP:

```txt
GET /ai/coach-feedback
```

No futuro, pode ser exposto também por RPC:

```txt
ai.get-coach-feedback-history
```

---

## 13. Summary

O contrato do MVP é intencionalmente simples:

- identidade derivada da sessão
- query opcional `limit`
- output com lista ordenada
- body com qualquer campo é inválido
- histórico vazio seguro
- persistência transparente ao cliente
