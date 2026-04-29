# Contract — Create Fitness Profile

## 1. Overview

Este documento define o contrato do use-case `create-fitness-profile`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
fitness.create-fitness-profile
```

---

## 3. Input

```ts
type CreateFitnessProfileInput = {
  authUserId: string;
  heightCm: number;
  weightKg: number;
  goal: "lose_weight" | "gain_muscle" | "maintain";
  activityLevel: "low" | "medium" | "high";
  trainingAvailability: {
    daysPerWeek: number;
    minutesPerSession: number;
  };
  limitations?: Array<{
    type: string;
    description?: string;
    severity: "low" | "medium" | "high";
  }>;
};
```

Observações:

- `authUserId` vem da sessão/JWT validada
- dentro do `Fitness Context`, o vínculo persistido deve ser `userProfileId`
- o body HTTP não aceita `authUserId`

---

## 4. Input Example

```json
{
  "heightCm": 178,
  "weightKg": 82,
  "goal": "gain_muscle",
  "activityLevel": "medium",
  "trainingAvailability": {
    "daysPerWeek": 4,
    "minutesPerSession": 60
  },
  "limitations": [
    {
      "type": "knee_pain",
      "description": "Right knee discomfort",
      "severity": "low"
    }
  ]
}
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

### heightCm

- required
- number
- min: `100`
- max: `250`

### weightKg

- required
- number
- min: `30`
- max: `300`

### goal

- required
- one of:
  - `lose_weight`
  - `gain_muscle`
  - `maintain`

### activityLevel

- required
- one of:
  - `low`
  - `medium`
  - `high`

### trainingAvailability.daysPerWeek

- required
- number
- min: `1`
- max: `7`

### trainingAvailability.minutesPerSession

- required
- number
- min: `10`
- max: `180`

### limitations

- optional
- array when present
- defaults to `[]` when absent

---

## 6. Output

```ts
type CreateFitnessProfileOutput = {
  fitnessProfile: {
    id: string;
    userProfileId: string;
    heightCm: number;
    weightKg: number;
    goal: "lose_weight" | "gain_muscle" | "maintain";
    activityLevel: "low" | "medium" | "high";
    trainingAvailability: {
      daysPerWeek: number;
      minutesPerSession: number;
    };
    limitations?: Array<{
      type: string;
      description?: string;
      severity: "low" | "medium" | "high";
    }>;
    status: "active";
    createdAt: Date;
  };
};
```

---

## 7. Success Response Example

```json
{
  "fitnessProfile": {
    "id": "fitness_123",
    "userProfileId": "profile_123",
    "heightCm": 178,
    "weightKg": 82,
    "goal": "gain_muscle",
    "activityLevel": "medium",
    "trainingAvailability": {
      "daysPerWeek": 4,
      "minutesPerSession": 60
    },
    "limitations": [
      {
        "type": "knee_pain",
        "description": "Right knee discomfort",
        "severity": "low"
      }
    ],
    "status": "active",
    "createdAt": "2026-04-28T10:00:00.000Z"
  }
}
```

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- token JWT
- dados internos de autenticação

---

## 9. Error Response Shape

```ts
type CreateFitnessProfileError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 10. Possible Error Codes

```txt
FITNESS_PROFILE_INVALID_INPUT
FITNESS_PROFILE_ALREADY_EXISTS
USER_PROFILE_NOT_FOUND
AUTH_INVALID_SESSION
FITNESS_PROFILE_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
POST /fitness/profile
```

No futuro, pode ser exposto também por RPC:

```txt
fitness.create-fitness-profile
```

---

## 12. HTTP Request

```http
POST /fitness/profile
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "heightCm": 178,
  "weightKg": 82,
  "goal": "gain_muscle",
  "activityLevel": "medium",
  "trainingAvailability": {
    "daysPerWeek": 4,
    "minutesPerSession": 60
  }
}
```

---

## 13. HTTP Success Status

```txt
201 Created
```

---

## 14. HTTP Error Status Mapping

```txt
FITNESS_PROFILE_INVALID_INPUT   -> 400
FITNESS_PROFILE_ALREADY_EXISTS  -> 409
USER_PROFILE_NOT_FOUND          -> 404
AUTH_INVALID_SESSION           -> 401
FITNESS_PROFILE_INTERNAL_ERROR -> 500
```

---

## 15. Domain Notes

- `authUserId` deve vir da sessão/JWT validada
- `UserProfile` deve ser resolvido antes da criação do `FitnessProfile`
- o vínculo persistido no `FitnessProfile` é `userProfileId`
- `status` default = `active`
- não criar `TrainingPlan`
- não acessar `Nutrition`
- não acessar `AI`
- índice único em `userProfileId` deve reforçar unicidade de perfil ativo

---

## 16. Summary

Este contrato garante criação simples, segura e isolada do perfil fitness no MVP.
