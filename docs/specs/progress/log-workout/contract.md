# Contract — Log Workout

## 1. Overview

Este documento define o contrato do use-case `log-workout`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
progress.log-workout
```

---

## 3. Input

```ts
type LogWorkoutInput = {
  authUserId: string;
  trainingPlanId: string;
  workoutDayIndex: number;
  durationMinutes: number;
  completedExercises: Array<{
    name: string;
    setsDone: number;
    repsDone: number;
  }>;
  feedback?: {
    difficulty: "easy" | "medium" | "hard";
    notes?: string;
  };
};
```

Observações:

- `authUserId` vem exclusivamente da sessão/JWT validada
- `trainingPlanId` vem no body do `POST /progress/workout-logs`
- `date` não vem do cliente
- `date` é gerada no servidor
- `date` deve ser persistida como string no formato `YYYY-MM-DD` em UTC
- `authUserId` não é aceito no body
- `userProfileId` não é aceito no body
- `fitnessProfileId` não é aceito no body

---

## 4. Input Example

```json
{
  "trainingPlanId": "training_123",
  "workoutDayIndex": 1,
  "durationMinutes": 52,
  "completedExercises": [
    {
      "name": "push_up",
      "setsDone": 4,
      "repsDone": 12
    }
  ],
  "feedback": {
    "difficulty": "medium",
    "notes": "Felt solid overall."
  }
}
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

### trainingPlanId

- required
- string
- non-empty

### workoutDayIndex

- required
- number
- must be an integer value
- must exist inside `TrainingPlan.weeklySchedule[].dayIndex`

### durationMinutes

- required
- number
- must be an integer value
- min: `1`
- max: `300`

### completedExercises

- required
- array
- cannot be empty

Each item:

- `name`: required string
- `setsDone`: number, must be an integer value, min `0`
- `repsDone`: number, must be an integer value, min `0`

### feedback.difficulty

- optional
- one of:
  - `easy`
  - `medium`
  - `hard`

### feedback.notes

- optional
- string
- max length: `500`

---

## 6. Output

```ts
type LogWorkoutOutput = {
  workoutLog: {
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
      difficulty: "easy" | "medium" | "hard";
      notes?: string;
    };
    date: string;
    createdAt: string;
  };
};
```

Observações:

- `date` representa o dia do log em formato `YYYY-MM-DD` em UTC
- `createdAt` continua sendo timestamp `Date`

---

## 7. Success Response Example

```json
{
  "workoutLog": {
    "id": "workout_log_123",
    "trainingPlanId": "training_123",
    "workoutDayIndex": 1,
    "durationMinutes": 52,
    "completedExercises": [
      {
        "name": "push_up",
        "setsDone": 4,
        "repsDone": 12
      }
    ],
    "feedback": {
      "difficulty": "medium",
      "notes": "Felt solid overall."
    },
    "date": "2026-04-29",
    "createdAt": "2026-04-29T10:00:00.000Z"
  }
}
```

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- token JWT
- ids internos de outros usuários
- dados internos de autenticação

---

## 9. Error Response Shape

```ts
type LogWorkoutError = {
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
TRAINING_PLAN_NOT_FOUND
WORKOUT_LOG_ALREADY_EXISTS
WORKOUT_LOG_INVALID_INPUT
WORKOUT_LOG_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
POST /progress/workout-logs
```

No futuro, pode ser exposto também por RPC:

```txt
progress.log-workout
```

---

## 12. HTTP Request

```http
POST /progress/workout-logs
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "trainingPlanId": "training_123",
  "workoutDayIndex": 1,
  "durationMinutes": 52,
  "completedExercises": [
    {
      "name": "push_up",
      "setsDone": 4,
      "repsDone": 12
    }
  ]
}
```

---

## 13. Summary

O contrato do MVP exige:

- identidade derivada da sessão
- `trainingPlanId` no body
- validação de ownership
- resposta segura do log criado
