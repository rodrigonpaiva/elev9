# Contract — Get Coach Feedback Debug History

## 1. Overview

Este documento define o contrato do use-case `get-coach-feedback-debug-history`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
ai.get-coach-feedback-debug-history
```

---

## 3. Input

```ts
type GetCoachFeedbackDebugHistoryInput = {
  authUserId: string;
  limit?: number;
};
```

Observações:

- `authUserId` vem exclusivamente da sessão validada
- `limit` é opcional
- o endpoint não aceita body funcional

---

## 4. Input Example

```http
GET /ai/debug/coach-feedback?limit=10
Authorization: Bearer <access-token>
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

### limit

- optional
- integer
- minimum `1`
- maximum `100`
- absent -> default `20`

### request body

- no functional fields accepted
- any body field must be rejected at HTTP layer

---

## 6. Output

```ts
type GetCoachFeedbackDebugHistoryOutput = {
  feedbacks: Array<{
    id: string;
    message: string;
    insights: string[];
    recommendations: string[];
    influences: string[];
    generatorVersion?: string;
    contextSnapshot?: {
      fatigueLevel?: "LOW" | "MODERATE" | "HIGH";
      recoveryTrend?: "improving" | "stable" | "needs_recovery";
      weeklyFrequency?: number;
      currentStreak?: number;
      averageWorkoutDuration?: number;
      latestCheckIn?: {
        energyLevel: number;
        sleepQuality: number;
        muscleSoreness: number;
        motivationLevel: number;
      };
      nutritionProfile?: {
        goal: "fat_loss" | "maintenance" | "muscle_gain";
        mealsPerDay: number;
      };
    };
    createdAt: string;
  }>;
};
```

Observações:

- `feedbacks` pode ser vazio
- os itens devem vir em `createdAt desc`
- `influences` deve fazer fallback para `[]` em documentos legados
- `generatorVersion` e `contextSnapshot` podem estar ausentes

---

## 7. Success Response Example

```json
{
  "feedbacks": [
    {
      "id": "feedback_002",
      "message": "Great consistency this week.",
      "insights": [
        "You trained 4 times this week"
      ],
      "recommendations": [
        "Keep your current rhythm"
      ],
      "influences": [
        "fatigue:high",
        "nutrition:muscle_gain"
      ],
      "generatorVersion": "heuristic-v1",
      "contextSnapshot": {
        "fatigueLevel": "HIGH",
        "recoveryTrend": "needs_recovery",
        "weeklyFrequency": 4,
        "currentStreak": 6,
        "averageWorkoutDuration": 82,
        "latestCheckIn": {
          "energyLevel": 2,
          "sleepQuality": 2,
          "muscleSoreness": 4,
          "motivationLevel": 3
        },
        "nutritionProfile": {
          "goal": "muscle_gain",
          "mealsPerDay": 4
        }
      },
      "createdAt": "2026-05-04T10:00:00.000Z"
    }
  ]
}
```

### Legacy Document Example

```json
{
  "feedbacks": [
    {
      "id": "feedback_legacy",
      "message": "Great consistency this week.",
      "insights": [
        "You trained 4 times this week"
      ],
      "recommendations": [
        "Keep your current rhythm"
      ],
      "influences": [],
      "createdAt": "2026-05-03T10:00:00.000Z"
    }
  ]
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
AUTH_INVALID_SESSION
USER_PROFILE_NOT_FOUND
AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT
AI_FEEDBACK_DEBUG_HISTORY_INTERNAL_ERROR
```

---

## 11. Transport

```txt
GET /ai/debug/coach-feedback
```

---

## 12. HTTP Mapping

```txt
AUTH_INVALID_SESSION                 -> 401
USER_PROFILE_NOT_FOUND              -> 404
AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT -> 400
AI_FEEDBACK_DEBUG_HISTORY_INTERNAL_ERROR -> 500
```

---

## 13. Domain Notes

- este contrato é interno/debug only
- ele não altera o shape do histórico público
- ele expõe metadata de explainability já persistida

---

## 14. Summary

O contrato deve garantir leitura autenticada, isolamento por usuário e retorno seguro de metadata interna de explainability.
