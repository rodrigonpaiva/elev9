# Contract — Get Home Dashboard

## 1. Overview

Este documento define o contrato do use-case `get-home-dashboard`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
dashboard.get-home-dashboard
```

---

## 3. Input

```ts
type GetHomeDashboardInput = {
  authUserId: string;
};
```

Observações:

- `authUserId` vem exclusivamente da sessão/JWT validada
- o cliente não envia `authUserId`
- o cliente não envia `userProfileId`
- o cliente não envia `fitnessProfileId`
- o cliente não envia `trainingPlanId`

---

## 4. Input Example

```http
GET /dashboard/home
Authorization: Bearer <access-token>
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

---

## 6. Output

```ts
type GetHomeDashboardOutput = {
  dashboard: {
    user: {
      name: string;
    };
    fitnessProfile: {
      id: string;
      goal: 'lose_weight' | 'gain_muscle' | 'maintain';
      activityLevel: 'low' | 'medium' | 'high';
    } | null;
    trainingPlan: {
      id: string;
      todayWorkout: {
        dayIndex: number;
        title: string;
        focus: string;
        format: string;
        intensity: 'low' | 'moderate' | 'high';
        exercises: Array<{
          name: string;
          sets: number;
          reps: number;
          restSeconds: number;
        }>;
      } | null;
    } | null;
    progressSummary: {
      period: 'week';
      workoutsCompleted: number;
      totalDurationMinutes: number;
      averageDurationMinutes: number;
      lastWorkoutDate: string | null;
    };
  };
};
```

Observações:

- `fitnessProfile` pode ser `null`
- `trainingPlan` pode ser `null`
- `todayWorkout` pode ser `null`
- `progressSummary.period` é sempre `week` no MVP
- mapeamento do dia da semana UTC para `weeklySchedule.dayIndex`:
  - `Monday = 1`
  - `Tuesday = 2`
  - `Wednesday = 3`
  - `Thursday = 4`
  - `Friday = 5`
  - `Saturday = 6`
  - `Sunday = 7`

---

## 7. Success Response Example

```json
{
  "dashboard": {
    "user": {
      "name": "Rodrigo Paiva"
    },
    "fitnessProfile": {
      "id": "fitness_123",
      "goal": "gain_muscle",
      "activityLevel": "medium"
    },
    "trainingPlan": {
      "id": "training_123",
      "todayWorkout": {
        "dayIndex": 3,
        "title": "Upper Body Strength",
        "focus": "upper_body_strength",
        "format": "strength",
        "intensity": "high",
        "exercises": [
          {
            "name": "Push Up",
            "sets": 4,
            "reps": 10,
            "restSeconds": 90
          }
        ]
      }
    },
    "progressSummary": {
      "period": "week",
      "workoutsCompleted": 3,
      "totalDurationMinutes": 155,
      "averageDurationMinutes": 51.67,
      "lastWorkoutDate": "2026-04-29"
    }
  }
}
```

### Partial Response Example

```json
{
  "dashboard": {
    "user": {
      "name": "Rodrigo Paiva"
    },
    "fitnessProfile": null,
    "trainingPlan": null,
    "progressSummary": {
      "period": "week",
      "workoutsCompleted": 0,
      "totalDurationMinutes": 0,
      "averageDurationMinutes": 0,
      "lastWorkoutDate": null
    }
  }
}
```

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- token JWT
- ids internos de outros usuários
- detalhes sensíveis de outros recursos

---

## 9. Error Response Shape

```ts
type GetHomeDashboardError = {
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
DASHBOARD_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
GET /dashboard/home
```

No futuro, pode ser exposto também por RPC:

```txt
dashboard.get-home-dashboard
```

---

## 12. HTTP Request

```http
GET /dashboard/home
Authorization: Bearer <access-token>
```

Não existe body nem query params funcionais no MVP.

Nenhum id de identificação é aceito.

---

## 13. Summary

O contrato do MVP é intencionalmente fechado:

- identidade derivada da sessão
- sem ids vindos do cliente
- resposta consolidada da home com tolerância a dados opcionais
