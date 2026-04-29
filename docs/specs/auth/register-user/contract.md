# Contract — Register User

## 1. Overview

Este documento define o contrato do use-case `register-user`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
auth.register-user
```

---

## 3. Input

```ts
type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
};
```

---

## 4. Input Example

```json
{
  "name": "Rodrigo Paiva",
  "email": "rodrigo@email.com",
  "password": "StrongPassword123!"
}
```

---

## 5. Input Validation

### name

- required
- string
- trimmed before validation
- min length: `2`
- max length: `80`

### email

- required
- valid email
- normalized with `trim + lowercase`
- unique in `auth_users`

### password

- required
- string
- min length: `8`
- must contain at least:
  - `1` uppercase letter
  - `1` lowercase letter
  - `1` number

---

## 6. Output

```ts
type RegisterUserOutput = {
  user: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
    createdAt: Date;
  };
};
```

---

## 7. Success Response Example

```json
{
  "user": {
    "id": "usr_123",
    "email": "rodrigo@email.com",
    "name": "Rodrigo Paiva",
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
- `internalProviderId`
- `securityMetadata`

---

## 9. Error Response Shape

```ts
type RegisterUserError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 10. Possible Error Codes

```txt
AUTH_INVALID_INPUT
AUTH_EMAIL_ALREADY_EXISTS
AUTH_PASSWORD_TOO_WEAK
AUTH_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
POST /auth/register
```

No futuro, pode ser exposto também por RPC:

```txt
auth.register-user
```

---

## 12. HTTP Request

```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "name": "Rodrigo Paiva",
  "email": "rodrigo@email.com",
  "password": "StrongPassword123!"
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
AUTH_INVALID_INPUT        -> 400
AUTH_PASSWORD_TOO_WEAK    -> 400
AUTH_EMAIL_ALREADY_EXISTS -> 409
AUTH_INTERNAL_ERROR       -> 500
```

---

## 15. Domain Notes

- o e-mail deve ser salvo sempre normalizado
- o e-mail deve ser normalizado com `trim + lowercase`
- `name` deve ser normalizado com `trim` antes da validação e antes de compor o output
- a senha deve ser hasheada antes da persistência
- `isEmailVerified` inicia como `false`
- `register-user` cria apenas `AuthUser`
- `UserProfile` será criado por `users/create-user-profile`
- erro de índice único do MongoDB/Mongoose deve ser traduzido para `AUTH_EMAIL_ALREADY_EXISTS`, inclusive em condição de corrida

---

## 16. Summary

Este contrato garante um cadastro simples, seguro e compatível com a separação entre `Auth` e `Users`.
