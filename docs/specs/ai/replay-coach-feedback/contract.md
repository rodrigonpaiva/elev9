# Contract — Replay Coach Feedback

## 1. Overview

Este documento define o contrato do use-case `replay-coach-feedback`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
ai.replay-coach-feedback
```

---

## 3. Input

```ts
type ReplayCoachFeedbackInput = {
  authUserId: string;
  feedbackId: string;
};
```

Observações:

- `authUserId` vem exclusivamente da sessão validada
- `feedbackId` vem do path param
- o endpoint não aceita body funcional

---

## 4. Input Example

```http
GET /ai/debug/coach-feedback/feedback_123/replay
Authorization: Bearer <access-token>
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

### feedbackId

- required
- string
- sourced from route param

### request body

- no functional fields accepted
- any body field must be rejected at HTTP layer

---

## 6. Output

```ts
type ReplayCoachFeedbackOutput = {
  feedbackId: string;
  generatorVersion: string;
  persisted: {
    message: string;
    insights: string[];
    recommendations: string[];
    influences: string[];
  };
  replayed: {
    message: string;
    insights: string[];
    recommendations: string[];
    influences: string[];
  };
  matches: {
    message: boolean;
    insights: boolean;
    recommendations: boolean;
    influences: boolean;
  };
};
```

Observações:

- replay não persiste nenhum resultado
- `matches` usa comparação simples e determinística
- o fluxo não retorna `contextSnapshot`

---

## 7. Success Response Example

```json
{
  "feedbackId": "feedback_123",
  "generatorVersion": "heuristic-v1",
  "persisted": {
    "message": "Good start this week. You already logged your first workouts and can build consistency from here.",
    "insights": [
      "You completed 2 workouts in the last 7 days",
      "You already started building a weekly training rhythm",
      "Your current workload looks balanced overall"
    ],
    "recommendations": [
      "Repeat this rhythm for one more session this week",
      "Focus on finishing your planned workout window",
      "Keep your current plan and monitor recovery between sessions"
    ],
    "influences": [
      "training:low_consistency"
    ]
  },
  "replayed": {
    "message": "Good start this week. You already logged your first workouts and can build consistency from here.",
    "insights": [
      "You completed 2 workouts in the last 7 days",
      "You already started building a weekly training rhythm",
      "Your current workload looks balanced overall"
    ],
    "recommendations": [
      "Repeat this rhythm for one more session this week",
      "Focus on finishing your planned workout window",
      "Keep your current plan and monitor recovery between sessions"
    ],
    "influences": [
      "training:low_consistency"
    ]
  },
  "matches": {
    "message": true,
    "insights": true,
    "recommendations": true,
    "influences": true
  }
}
```

---

## 8. Fields That Must Never Be Returned

- `userProfileId`
- email
- token
- session data
- raw Mongo internals

---

## 9. Error Response Shape

```ts
type UseCaseError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 10. Possible Error Codes

```txt
AI_COACH_REPLAY_INVALID_INPUT
AUTH_INVALID_SESSION
USER_PROFILE_NOT_FOUND
COACH_FEEDBACK_NOT_FOUND
COACH_FEEDBACK_REPLAY_CONTEXT_MISSING
COACH_FEEDBACK_GENERATOR_VERSION_UNSUPPORTED
COACH_FEEDBACK_REPLAY_INTERNAL_ERROR
```

---

## 11. Transport

```txt
GET /ai/debug/coach-feedback/:id/replay
```

---

## 12. HTTP Mapping

```txt
AI_COACH_REPLAY_INVALID_INPUT              -> 400
AUTH_INVALID_SESSION                       -> 401
USER_PROFILE_NOT_FOUND                     -> 404
COACH_FEEDBACK_NOT_FOUND                   -> 404
COACH_FEEDBACK_REPLAY_CONTEXT_MISSING      -> 400
COACH_FEEDBACK_GENERATOR_VERSION_UNSUPPORTED -> 400
COACH_FEEDBACK_REPLAY_INTERNAL_ERROR       -> 500
```

---

## 13. Domain Notes

- replay reutiliza o generator real
- replay depende de `contextSnapshot`
- replay depende de `generatorVersion`
- replay é on-demand e read-only

---

## 14. Summary

O contrato deve garantir replay determinístico, autenticação obrigatória, isolamento por usuário e ausência de persistência do replay.
