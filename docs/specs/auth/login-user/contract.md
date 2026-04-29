# Contract — Login User

## 1. Overview

Este documento define o contrato do use-case `login-user`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
auth.login-user
```

---

## 3. Input

```ts
type LoginUserInput = {
  email: string;
  password: string;
};
```

---

## 4. Input Example

```json
{
  "email": "rodrigo@email.com",
  "password": "StrongPassword123!"
}
```

---

## 5. Input Validation

### email

- required
- valid email
- normalized with `trim + lowercase`

### password

- required
- string
- non-empty

---

## 6. Output

```ts
type LoginUserOutput = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    isEmailVerified: boolean;
    createdAt: Date;
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
  "accessToken": "jwt-token-value",
  "user": {
    "id": "usr_123",
    "email": "rodrigo@email.com",
    "isEmailVerified": false,
    "createdAt": "2026-04-28T10:00:00.000Z"
  }
}
```

---

## 8. Fields That Must Never Be Returned

- `password`
- `passwordHash`
- `refreshToken`
- dados internos de sessão
- metadados sensíveis

---

## 9. Error Response Shape

```ts
type LoginUserError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 10. Possible Error Codes

```txt
AUTH_INVALID_INPUT
AUTH_INVALID_CREDENTIALS
AUTH_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
POST /auth/login
```

No futuro, pode ser exposto também por RPC:

```txt
auth.login-user
```

---

## 12. HTTP Request

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "rodrigo@email.com",
  "password": "StrongPassword123!"
}
```

---

## 13. HTTP Success Status

```txt
200 OK
```

---

## 14. HTTP Error Status Mapping

```txt
AUTH_INVALID_INPUT       -> 400
AUTH_INVALID_CREDENTIALS -> 401
AUTH_INTERNAL_ERROR      -> 500
```

---

## 15. Domain Notes

- o e-mail deve ser normalizado com `trim + lowercase`
- a senha deve ser comparada com `bcrypt` via `PasswordHasher`
- o payload mínimo do JWT deve conter `sub` e `email`
- falha de autenticação nunca deve revelar se o e-mail existe
- o retorno inclui `accessToken JWT`
- `refresh token` não faz parte do MVP
- `login-user` não cria `UserProfile`
- `login-user` não acessa `Fitness`, `Nutrition` ou `AI`

---

## 16. Summary

Este contrato garante um login simples, seguro e compatível com o MVP em NestJS + MongoDB/Mongoose.
