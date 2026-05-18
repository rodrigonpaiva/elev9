# Contract — Get My Fitness Profile

## 1. Overview

Este documento define o contrato do use-case `get-my-fitness-profile`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
fitness.get-my-fitness-profile
```

---

## 3. Input

```ts
type GetMyFitnessProfileInput = {
  authUserId: string;
};
```

Observações:

- `authUserId` vem exclusivamente da sessão/JWT validada
- o cliente não envia `authUserId`
- o cliente não envia `userProfileId`
- o cliente não envia `fitnessProfileId`

---

## 4. Input Example

Não existe body no endpoint HTTP do MVP.

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
type GetMyFitnessProfileOutput = {
  fitnessProfile: {
    id: string;
    userProfileId: string;
    heightCm: number;
    weightKg: number;
    goal: 'lose_weight' | 'gain_muscle' | 'maintain';
    activityLevel: 'low' | 'medium' | 'high';
    trainingAvailability: {
      daysPerWeek: number;
      minutesPerSession: number;
    };
    limitations: Array<{
      type: string;
      description?: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    status: 'active';
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
    "limitations": [],
    "status": "active",
    "createdAt": "2026-04-29T10:00:00.000Z"
  }
}
```

Observação:

- `limitations` sempre deve retornar array, inclusive `[]` quando vazio

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- token JWT
- ids de outros usuários
- dados internos de autenticação

---

## 9. Error Response Shape

```ts
type GetMyFitnessProfileError = {
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
FITNESS_PROFILE_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
GET /fitness/profile
```

No futuro, pode ser exposto também por RPC:

```txt
fitness.get-my-fitness-profile
```

---

## 12. HTTP Request

```http
GET /fitness/profile
Authorization: Bearer <access-token>
```

Não existe body nem query params de identificação no MVP.

---

## 13. Summary

O contrato do MVP é intencionalmente fechado:

- identidade derivada da sessão
- sem ids vindos do cliente
- resposta segura com o `FitnessProfile` ativo do usuário autenticado
