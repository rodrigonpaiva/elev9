# Tasks — Register User

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `register-user`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/auth/
  domain/
    entities/
      auth-user.entity.ts
    repositories/
      auth-user.repository.ts
    services/
      password-hasher.service.ts
  application/
    use-cases/
      register-user/
        register-user.input.ts
        register-user.output.ts
        register-user.use-case.ts
        register-user.errors.ts
  infrastructure/
    persistence/
      mongoose/
        auth-user.schema.ts
        mongoose-auth-user.repository.ts
    security/
      bcrypt-password-hasher.service.ts
  presentation/
    http/
      auth.controller.ts
      dto/
        register-user.request.dto.ts
        register-user.response.dto.ts
  auth.module.ts
```

---

## 3. Domain Tasks

- [ ] Create `AuthUser` entity
- [ ] Create `AuthUserRepository` interface
- [ ] Create `PasswordHasher` interface
- [ ] Define `isEmailVerified` field

---

## 4. Application Tasks

- [ ] Create `RegisterUserInput`
- [ ] Create `RegisterUserOutput`
- [ ] Create `RegisterUserUseCase`
- [ ] Implement input validation
- [ ] Trim `name` before validation
- [ ] Normalize email
- [ ] Check email uniqueness
- [ ] Hash password
- [ ] Create `AuthUser`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Create Mongoose `AuthUser` schema
- [ ] Add unique index on email
- [ ] Implement `MongooseAuthUserRepository`
- [ ] Implement `BcryptPasswordHasher`
- [ ] Register providers in `AuthModule`
- [ ] Translate unique index violation to `AUTH_EMAIL_ALREADY_EXISTS`

---

## 6. Presentation Tasks

- [ ] Create `POST /auth/register` endpoint
- [ ] Create request DTO
- [ ] Create response DTO
- [ ] Map validation errors to `400`
- [ ] Map duplicate email to `409`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: successful registration
- [ ] Unit test: invalid input
- [ ] Unit test: weak password
- [ ] Unit test: email already exists
- [ ] Unit test: password is hashed
- [ ] Unit test: safe response
- [ ] Unit test: no `UserProfile` creation
- [ ] Integration test: Mongo persistence
- [ ] E2E test: `POST /auth/register`

---

## 8. Security Tasks

- [ ] Ensure raw password is never persisted
- [ ] Ensure `passwordHash` is never returned
- [ ] Ensure internal errors are not exposed
- [ ] Ensure email is normalized before uniqueness check
- [ ] Ensure `name` is trimmed before validation and before response mapping

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário pode registrar com dados válidos
- [ ] e-mail duplicado retorna `AUTH_EMAIL_ALREADY_EXISTS`
- [ ] senha fraca retorna `AUTH_PASSWORD_TOO_WEAK`
- [ ] e-mail é salvo normalizado
- [ ] password é salvo apenas como hash
- [ ] response não retorna dados sensíveis
- [ ] nenhum `UserProfile` é criado nesse fluxo
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`domain -> application -> infrastructure -> presentation -> tests`

Este use-case deve permanecer isolado de `Users`, `Fitness`, `Nutrition`, `Training`, `Progress` e `AI`.
