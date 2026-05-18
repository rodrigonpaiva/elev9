# Contract — Create User Profile

## 1. Overview

Este documento define o contrato do use-case `create-user-profile`.

Ele especifica:

- input
- output
- validações
- resposta de sucesso
- resposta de erro

---

## 2. Use Case Name

```txt
users.create-user-profile
```

---

## 3. Input

```ts
type CreateUserProfileInput = {
  authUserId: string;
  name: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
};
```

Observação:

- a identidade vinda da sessão/JWT representa `AuthUser.id`
- dentro do `Users Context`, essa identidade é persistida como `authUserId`
- `authUserId` não vem do body HTTP
- o body não pode aceitar `authUserId`

---

## 4. Input Example

```json
{
  "name": "Rodrigo Paiva",
  "birthDate": "1994-06-15",
  "gender": "male"
}
```

---

## 5. Input Validation

### authUserId

- required
- string
- sourced from validated session

### name

- required
- string
- trimmed before validation
- min length: `2`
- max length: `80`

### birthDate

- optional
- valid date when present

### gender

- optional
- must be one of:
  - `male`
  - `female`
  - `other`
  - `prefer_not_to_say`

---

## 6. Output

```ts
type CreateUserProfileOutput = {
  userProfile: {
    id: string;
    authUserId: string;
    name: string;
    birthDate?: Date;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    language: 'en-US';
    timezone: 'UTC';
    status: 'active';
    createdAt: Date;
  };
};
```

---

## 7. Success Response Example

```json
{
  "userProfile": {
    "id": "profile_123",
    "authUserId": "usr_123",
    "name": "Rodrigo Paiva",
    "birthDate": "1994-06-15T00:00:00.000Z",
    "gender": "male",
    "language": "en-US",
    "timezone": "UTC",
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
type CreateUserProfileError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 10. Possible Error Codes

```txt
USER_PROFILE_INVALID_INPUT
USER_PROFILE_ALREADY_EXISTS
AUTH_INVALID_SESSION
USER_PROFILE_INTERNAL_ERROR
```

---

## 11. Transport

No MVP, o contrato pode ser exposto por HTTP:

```txt
POST /users/profile
```

No futuro, pode ser exposto também por RPC:

```txt
users.create-user-profile
```

---

## 12. HTTP Request

```http
POST /users/profile
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "name": "Rodrigo Paiva",
  "birthDate": "1994-06-15",
  "gender": "male"
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
USER_PROFILE_INVALID_INPUT   -> 400
USER_PROFILE_ALREADY_EXISTS  -> 409
AUTH_INVALID_SESSION         -> 401
USER_PROFILE_INTERNAL_ERROR  -> 500
```

---

## 15. Domain Notes

- `authUserId` deve vir da sessão/JWT validada
- `name` deve ser normalizado com `trim`
- `language` default = `en-US`
- `timezone` default = `UTC`
- `status` default = `active`
- um `AuthUser` pode ter no máximo um `UserProfile`
- o use-case não cria `FitnessProfile`
- o use-case não cria `NutritionProfile`
- o use-case não acessa `AI`

---

## 16. Summary

Este contrato garante criação simples, segura e isolada do perfil funcional do usuário no MVP.
