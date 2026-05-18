# Contract — Generate Coach Feedback

## 1. Overview

Este documento define o contrato do use-case `generate-coach-feedback`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
ai.generate-coach-feedback
```

---

## 3. Input

```ts
type GenerateCoachFeedbackInput = {
  authUserId: string;
  startDateUtc: string;
  endDateUtc: string;
};
```

Observações:

- `authUserId` vem exclusivamente da sessão/JWT validada
- `startDateUtc` e `endDateUtc` são resolvidos internamente
- a janela de análise usa os últimos 7 dias corridos incluindo hoje em UTC
- `WorkoutLog.date` deve ser interpretado como `YYYY-MM-DD` em UTC
- `startDateUtc` e `endDateUtc` são inclusivos
- o cliente não envia `userProfileId`
- o cliente não envia `fitnessProfileId`
- o cliente não envia `trainingPlanId`
- o cliente não envia `WorkoutLogs`
- o endpoint não aceita body funcional no MVP

---

## 4. Input Example

```http
POST /ai/coach-feedback
Authorization: Bearer <access-token>
```

Body:

```json
{}
```

Body com campos extras:

```json
{
  "authUserId": "forbidden",
  "trainingPlanId": "forbidden"
}
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

### request body

- no functional fields accepted
- any functional or identity field in body must be rejected at HTTP layer
- extra fields must return `400 AI_COACH_INVALID_INPUT`

---

## 6. Output

```ts
type GenerateCoachFeedbackOutput = {
  message: string;
  insights: string[];
  recommendations: string[];
};
```

Observações:

- `message` deve ser curta, clara e segura
- `message` deve ter no máximo `240` caracteres
- `insights` contém observações derivadas dos dados
- `insights` deve ter no máximo `3` itens
- `recommendations` contém próximos passos acionáveis
- `recommendations` deve ter no máximo `3` itens
- cada item de `insights` e `recommendations` deve ter no máximo `160` caracteres
- o sistema deve responder mesmo com poucos dados
- se não houver logs, o payload ainda deve ser válido

Postcondition:

- após sucesso, um `CoachFeedback` deve estar persistido
- essa persistência não altera o response shape
- ela é apenas uma postcondition obrigatória do `POST /ai/coach-feedback`

---

## 7. Success Response Example

```json
{
  "message": "Great consistency this week! You're on a 4-day streak.",
  "insights": [
    "You trained 4 times this week",
    "Your average duration increased"
  ],
  "recommendations": [
    "Keep your current rhythm",
    "Try increasing intensity next session"
  ]
}
```

### No Logs Example

```json
{
  "message": "You are ready to start your first training streak.",
  "insights": ["No completed workouts were found yet"],
  "recommendations": [
    "Complete your first workout today",
    "Start with the current plan to build momentum"
  ]
}
```

### Beginner Example

```json
{
  "message": "Good start this week. You already logged your first workouts and can build consistency from here.",
  "insights": [
    "You completed 2 workouts in the last 7 days",
    "Your current streak is 1 day"
  ],
  "recommendations": [
    "Repeat this rhythm for one more session this week",
    "Focus on finishing your planned workout window"
  ]
}
```

### Inconsistent Example

```json
{
  "message": "You have room to rebuild your rhythm this week.",
  "insights": [
    "You completed 1 workout in the last 7 days",
    "Your current pace is below your expected weekly availability"
  ],
  "recommendations": [
    "Schedule your next session within the next 24 hours",
    "Aim to match your weekly availability target"
  ]
}
```

### High Streak Example

```json
{
  "message": "Great consistency this week. You're on a 4-day streak.",
  "insights": [
    "You trained 4 times in the last 7 days",
    "Your streak shows strong consistency"
  ],
  "recommendations": [
    "Keep your current rhythm",
    "Increase intensity only if your recovery feels good"
  ]
}
```

### Consistent Without High Streak Example

```json
{
  "message": "You matched your expected training rhythm this week.",
  "insights": [
    "You completed 3 workouts in the last 7 days",
    "Your weekly frequency is aligned with your expected target"
  ],
  "recommendations": [
    "Keep the same training cadence next week",
    "Maintain your current session quality and recovery"
  ]
}
```

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- raw JWT
- prompt interno
- chain-of-thought
- dados brutos completos de `WorkoutLogs`
- ids internos de outros usuários

---

## 9. Error Response Shape

```ts
type GenerateCoachFeedbackError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 10. Possible Error Codes

```txt
AI_COACH_INVALID_INPUT
AUTH_INVALID_SESSION
USER_PROFILE_NOT_FOUND
FITNESS_PROFILE_NOT_FOUND
AI_COACH_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato é exposto por HTTP:

```txt
POST /ai/coach-feedback
```

No futuro, pode ser exposto também por RPC:

```txt
ai.generate-coach-feedback
```

---

## 12. HTTP Request

```http
POST /ai/coach-feedback
Authorization: Bearer <access-token>
Content-Type: application/json
```

Body esperado no MVP:

```json
{}
```

Nenhum id de identificação é aceito no MVP.

Se o body vier com qualquer campo extra, a API deve rejeitar a requisição com:

```txt
400 AI_COACH_INVALID_INPUT
```

---

## 13. Summary

O contrato do MVP é intencionalmente fechado:

- identidade derivada da sessão
- sem input funcional do cliente
- body com campos extras é inválido
- output textual simples e seguro
- sem IA externa
- sem mutação de dados de fitness, treino ou progresso
- com persistência obrigatória de `CoachFeedback`
