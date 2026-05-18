# Contract — Get Workout History

## 1. Overview

Este documento define o contrato do use-case `get-workout-history`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
progress.get-workout-history
```

---

## 3. Input

```ts
type GetWorkoutHistoryInput = {
  authUserId: string;
  limit?: number;
};
```

Observações:

- `authUserId` vem exclusivamente da sessão/JWT validada
- `limit` pode vir da query string HTTP como `string`
- `limit` deve ser normalizado para `number` inteiro antes de entrar no use-case
- `limit` default é `20`
- `limit` máximo é `50`
- `authUserId` não é aceito no body
- `userProfileId` não é aceito no body ou query
- `fitnessProfileId` não é aceito no body ou query

---

## 4. Input Example

```http
GET /progress/workout-logs?limit=20
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
- number
- must be an integer value
- allowed range:
  - minimum `1`
  - maximum `50`
- default:
  - `20`

---

## 6. Output

```ts
type GetWorkoutHistoryOutput = {
  workoutLogs: Array<{
    id: string;
    trainingPlanId: string;
    workoutDayIndex: number;
    durationMinutes: number;
    completedExercises: Array<{
      name: string;
      setsDone: number;
      repsDone: number;
    }>;
    feedback?: {
      difficulty: 'easy' | 'medium' | 'hard';
      notes?: string;
    };
    date: string;
    createdAt: string;
  }>;
};
```

Observações:

- `date` usa string UTC no formato `YYYY-MM-DD`
- `createdAt` usa timestamp serializado
- a lista é ordenada por:
  1. `date desc`
  2. `createdAt desc`
- se não houver `TrainingPlans` ou logs:
  - `workoutLogs = []`

---

## 7. Success Response Example

```json
{
  "workoutLogs": [
    {
      "id": "workout_log_001",
      "trainingPlanId": "training_plan_001",
      "workoutDayIndex": 2,
      "durationMinutes": 48,
      "completedExercises": [
        {
          "name": "Back Squat",
          "setsDone": 4,
          "repsDone": 8
        }
      ],
      "feedback": {
        "difficulty": "medium",
        "notes": "Good session."
      },
      "date": "2026-05-01",
      "createdAt": "2026-05-01T18:20:00.000Z"
    }
  ]
}
```

### Empty Response Example

```json
{
  "workoutLogs": []
}
```

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- token JWT
- ids internos de outros usuários
- dados de `TrainingPlans` fora do escopo do usuário autenticado

---

## 9. Error Response Shape

```ts
type GetWorkoutHistoryError = {
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
FITNESS_PROFILE_NOT_FOUND
WORKOUT_HISTORY_INVALID_INPUT
WORKOUT_HISTORY_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
GET /progress/workout-logs
```

No futuro, pode ser exposto também por RPC:

```txt
progress.get-workout-history
```

---

## 12. HTTP Request

```http
GET /progress/workout-logs?limit=20
Authorization: Bearer <access-token>
```

Query params aceitos:

- `limit`

`limit` ausente defaulta para `20`.

Nenhum id de identificação é aceito no MVP.

Qualquer outro query param deve ser rejeitado na camada HTTP quando aplicável.

---

## 13. Summary

O contrato do MVP é intencionalmente fechado:

- identidade derivada da sessão
- `limit` opcional e restrito
- sem ids vindos do cliente
- resposta segura baseada em `WorkoutLogs`
