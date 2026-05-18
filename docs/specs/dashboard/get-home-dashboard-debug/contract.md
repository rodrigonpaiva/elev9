# Contract — Get Home Dashboard Debug

## 1. Overview

Este documento define o contrato do use-case `get-home-dashboard-debug`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
dashboard.get-home-dashboard-debug
```

---

## 3. Input

```ts
type GetHomeDashboardDebugInput = {
  authUserId: string;
};
```

Observações:

- `authUserId` vem exclusivamente da sessão validada
- o cliente não envia `authUserId`
- o cliente não envia `userProfileId`

---

## 4. Input Example

```http
GET /dashboard/home/debug
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
type GetHomeDashboardDebugOutput = {
  generatedAt: string;
  recovery: {
    fatigueLevel: string;
    recoveryTrend: string;
    recoverySignals: string[];
  };
  nutrition: {
    priority: string;
    signals: string[];
  };
};
```

Observações:

- `generatedAt` deve ser serializado em ISO 8601
- `recoverySignals` deve conter apenas sinais determinísticos
- `nutrition.signals` deve conter apenas sinais determinísticos
- o payload não expõe ids internos, email, token ou sessão

---

## 7. Success Response Example

```json
{
  "generatedAt": "2026-05-18T10:00:00.000Z",
  "recovery": {
    "fatigueLevel": "HIGH",
    "recoveryTrend": "needs_recovery",
    "recoverySignals": [
      "high_fatigue",
      "poor_sleep",
      "high_soreness",
      "needs_recovery_trend"
    ]
  },
  "nutrition": {
    "priority": "recovery",
    "signals": [
      "high_fatigue",
      "poor_sleep",
      "high_soreness",
      "needs_recovery_trend"
    ]
  }
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
type GetHomeDashboardDebugError = {
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

```txt
GET /dashboard/home/debug
```
