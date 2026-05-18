# Contract — Get Progress Summary

## 1. Overview

Este documento define o contrato do use-case `get-progress-summary`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
progress.get-progress-summary
```

---

## 3. Input

```ts
type GetProgressSummaryInput = {
  authUserId: string;
  period?: 'week' | 'month';
};
```

Observações:

- `authUserId` vem exclusivamente da sessão/JWT validada
- `period` pode vir da query string
- `period` default é `week`
- `authUserId` não é aceito no body
- `userProfileId` não é aceito no body ou query
- `fitnessProfileId` não é aceito no body ou query

---

## 4. Input Example

```http
GET /progress/summary?period=week
Authorization: Bearer <access-token>
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

### period

- optional
- string
- allowed values:
  - `week`
  - `month`
- default:
  - `week`

---

## 6. Output

```ts
type GetProgressSummaryOutput = {
  summary: {
    period: 'week' | 'month';
    workoutsCompleted: number;
    totalDurationMinutes: number;
    averageDurationMinutes: number;
    lastWorkoutDate: string | null;
  };
};
```

Observações:

- `lastWorkoutDate` usa string UTC no formato `YYYY-MM-DD`
- `averageDurationMinutes` é um `number` arredondado com 2 casas decimais
- o JSON não precisa forçar exibição textual como `50.00`; pode retornar `50`
- se não houver logs no período:
  - `workoutsCompleted = 0`
  - `totalDurationMinutes = 0`
  - `averageDurationMinutes = 0`
  - `lastWorkoutDate = null`

---

## 7. Success Response Example

```json
{
  "summary": {
    "period": "week",
    "workoutsCompleted": 3,
    "totalDurationMinutes": 155,
    "averageDurationMinutes": 51.67,
    "lastWorkoutDate": "2026-04-29"
  }
}
```

### Empty Response Example

```json
{
  "summary": {
    "period": "week",
    "workoutsCompleted": 0,
    "totalDurationMinutes": 0,
    "averageDurationMinutes": 0,
    "lastWorkoutDate": null
  }
}
```

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- token JWT
- ids internos de outros usuários
- detalhes de outros `WorkoutLogs`

---

## 9. Error Response Shape

```ts
type GetProgressSummaryError = {
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
PROGRESS_SUMMARY_INVALID_INPUT
PROGRESS_SUMMARY_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
GET /progress/summary
```

No futuro, pode ser exposto também por RPC:

```txt
progress.get-progress-summary
```

---

## 12. HTTP Request

```http
GET /progress/summary?period=week
Authorization: Bearer <access-token>
```

Query params aceitos:

- `period=week`
- `period=month`

`period` ausente defaulta para `week`.

Nenhum id de identificação é aceito no MVP.

Qualquer outro query param deve ser rejeitado na camada HTTP quando aplicável.

---

## 13. Summary

O contrato do MVP é intencionalmente fechado:

- identidade derivada da sessão
- `period` opcional e restrito
- sem ids vindos do cliente
- resposta agregada e segura baseada em `WorkoutLogs`
