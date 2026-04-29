# Contract — Create Training Plan

## 1. Overview

Este documento define o contrato do use-case `create-training-plan`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
training.create-training-plan
```

---

## 3. Input

```ts
type CreateTrainingPlanInput = {
  fitnessProfileId: string;
};
```

Observações:

- o endpoint HTTP é protegido por JWT/AuthGuard
- `fitnessProfileId` vem no body do `POST /training/plans`
- `authUserId` vem exclusivamente da sessão autenticada
- `authUserId` nunca é aceito no body
- a sessão válida é obrigatória para acesso ao endpoint
- o plano é vinculado ao `fitnessProfileId` informado
- o body HTTP não aceita regras customizadas de geração no MVP

---

## 4. Input Example

```json
{
  "fitnessProfileId": "fitness_123"
}
```

---

## 5. Input Validation

### fitnessProfileId

- required
- string
- non-empty
- deve referenciar `FitnessProfile` existente

---

## 6. Output

```ts
type CreateTrainingPlanOutput = {
  trainingPlan: {
    id: string;
    fitnessProfileId: string;
    goal: "lose_weight" | "gain_muscle" | "maintain";
    activityLevel: "low" | "medium" | "high";
    weeklySchedule: Array<{
      dayIndex: number;
      title: string;
      focus: string;
      intensity: "low" | "moderate" | "high";
      format: "strength" | "circuit";
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      }>;
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
  "trainingPlan": {
    "id": "training_123",
    "fitnessProfileId": "fitness_123",
    "goal": "gain_muscle",
    "activityLevel": "medium",
    "weeklySchedule": [
      {
        "dayIndex": 1,
        "title": "Upper Body Strength",
        "focus": "upper_body_strength",
        "intensity": "moderate",
        "format": "strength",
        "exercises": [
          {
            "name": "push_up",
            "sets": 4,
            "reps": "8-12",
            "restSeconds": 90
          }
        ]
      }
    ],
    "status": "active",
    "createdAt": "2026-04-29T10:00:00.000Z"
  }
}
```

Observação:

- `format` é obrigatório em todos os itens de `weeklySchedule`

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- token JWT
- dados internos de autenticação
- prompts internos
- metadados de geração por IA

---

## 9. Error Response Shape

```ts
type CreateTrainingPlanError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 10. Possible Error Codes

```txt
TRAINING_PLAN_ALREADY_EXISTS
FITNESS_PROFILE_NOT_FOUND
AUTH_INVALID_SESSION
TRAINING_PLAN_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
POST /training/plans
```

No futuro, pode ser exposto também por RPC:

```txt
training.create-training-plan
```

---

## 12. HTTP Request

```http
POST /training/plans
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "fitnessProfileId": "fitness_123"
}
```

`authUserId` não deve aparecer no body.

---

## 13. Summary

O contrato do MVP é mínimo:

- entrada com `fitnessProfileId`
- sessão JWT obrigatória
- saída segura com plano gerado por regras
- sem qualquer acoplamento com `Nutrition` ou `AI`
