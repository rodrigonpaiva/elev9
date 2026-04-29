# Contract — Validate Session

## 1. Overview

Este documento define o contrato do use-case `validate-session`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
auth.validate-session
```

---

## 3. Input

```ts
type ValidateSessionInput = {
  authorizationHeader: string;
};
```

O campo `authorizationHeader` entra bruto no use-case.

A extração e o parsing do token devem ocorrer dentro do próprio `validate-session`.

---

## 4. Input Example

```json
{
  "authorizationHeader": "Bearer jwt-token-value"
}
```

---

## 5. Input Validation

### authorizationHeader

- required
- string
- must match `Bearer <token>`

---

## 6. Output

```ts
type ValidateSessionOutput = {
  user: {
    id: string;
    email: string;
  };
};
```

### JWT Payload (Minimum)

O `accessToken` do MVP deve conter no mínimo:

```ts
type AccessTokenPayload = {
  sub: string;
  email: string;
};
```

---

## 7. Success Response Example

```json
{
  "user": {
    "id": "usr_123",
    "email": "rodrigo@email.com"
  }
}
```

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- token bruto
- `refreshToken`
- claims internos desnecessários

---

## 9. Error Response Shape

```ts
type ValidateSessionError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 10. Possible Error Codes

```txt
AUTH_INVALID_INPUT
AUTH_INVALID_SESSION
AUTH_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
GET /auth/session
```

No futuro, pode ser exposto também por RPC:

```txt
auth.validate-session
```

---

## 12. HTTP Request

```http
GET /auth/session
Authorization: Bearer jwt-token-value
```

---

## 13. HTTP Success Status

```txt
200 OK
```

---

## 14. HTTP Error Status Mapping

```txt
AUTH_INVALID_INPUT   -> 400
AUTH_INVALID_SESSION -> 401
AUTH_INTERNAL_ERROR  -> 500
```

---

## 15. Domain Notes

- o token deve ser lido do header `Authorization`
- o formato aceito é `Bearer <token>`
- o payload mínimo validado deve conter `sub` e `email`
- falha por token ausente, inválido ou expirado retorna `AUTH_INVALID_SESSION`
- `validate-session` não acessa `UserProfile`
- `validate-session` não acessa `Fitness`, `Nutrition` ou `AI`
- `refresh token` não faz parte do MVP

---

## 16. Summary

Este contrato garante uma validação de sessão simples e segura para o MVP em NestJS + MongoDB/Mongoose.
