# Contract — Get My Training Plan

## 1. Overview

Este documento define o contrato do use-case `get-my-training-plan`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
training.get-my-training-plan
```

---

## 3. Input

```ts
type GetMyTrainingPlanInput = {
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

Não existe body nem query params de identificação no endpoint HTTP do MVP.

O identificador do usuário é derivado da sessão autenticada.

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

---

## 6. Output

```ts
type GetMyTrainingPlanOutput = {
  trainingPlan: {
    id: string;
    fitnessProfileId: string;
    status: "active";
    goal: "lose_weight" | "gain_muscle" | "maintain";
    activityLevel: "low" | "medium" | "high";
    weeklySchedule: Array<{
      dayIndex: number;
      title: string;
      focus: string;
      format: string;
      intensity: "low" | "moderate" | "high";
      exercises: Array<{
        name: string;
        sets: number;
        reps: number;
        restSeconds: number;
      }>;
    }>;
    createdAt: Date;
  };
};
```

Observações:

- `weeklySchedule` deve refletir apenas o `TrainingPlan` ativo do usuário autenticado
- `weeklySchedule` deve ser retornado ordenado por `dayIndex` crescente
- `format` é obrigatório em todos os itens de `weeklySchedule`
- `sets`, `reps` e `restSeconds` são retornados como `number`

---

## 7. Success Response Example

```json
{
  "trainingPlan": {
    "id": "training_123",
    "fitnessProfileId": "fitness_123",
    "status": "active",
    "goal": "gain_muscle",
    "activityLevel": "medium",
    "weeklySchedule": [
      {
        "dayIndex": 1,
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
    ],
    "createdAt": "2026-04-29T10:00:00.000Z"
  }
}
```

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- token JWT
- ids de outros usuários
- dados internos de autenticação
- dados de outros `TrainingPlan`

---

## 9. Error Response Shape

```ts
type GetMyTrainingPlanError = {
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
TRAINING_PLAN_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
GET /training/plans/current
```

No futuro, pode ser exposto também por RPC:

```txt
training.get-my-training-plan
```

---

## 12. HTTP Request

```http
GET /training/plans/current
Authorization: Bearer <access-token>
```

Não existe body nem query params de identificação no MVP.

---

## 13. Summary

O contrato do MVP é intencionalmente fechado:

- identidade derivada da sessão
- sem ids vindos do cliente
- resposta segura com o `TrainingPlan` ativo do usuário autenticado
