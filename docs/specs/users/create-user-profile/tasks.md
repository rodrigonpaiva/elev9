# Tasks — Create User Profile

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `create-user-profile`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/users/
  domain/
    entities/
      user-profile.entity.ts
    repositories/
      user-profile.repository.ts
  application/
    use-cases/
      create-user-profile/
        create-user-profile.input.ts
        create-user-profile.output.ts
        create-user-profile.use-case.ts
        create-user-profile.errors.ts
  infrastructure/
    persistence/
      mongoose/
        user-profile.schema.ts
        mongoose-user-profile.repository.ts
  presentation/
    http/
      users.controller.ts
      dto/
        create-user-profile.request.dto.ts
        create-user-profile.response.dto.ts
  users.module.ts
```

---

## 3. Domain Tasks

- [ ] Create `UserProfile` entity
- [ ] Create `UserProfileRepository` interface
- [ ] Define defaults and invariants

---

## 4. Application Tasks

- [ ] Create `CreateUserProfileInput`
- [ ] Create `CreateUserProfileOutput`
- [ ] Create `CreateUserProfileUseCase`
- [ ] Validate input
- [ ] Trim `name`
- [ ] Check if profile already exists by `authUserId`
- [ ] Create `UserProfile`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Create Mongoose `UserProfile` schema
- [ ] Add unique index on `authUserId`
- [ ] Translate unique index violation on `authUserId` to `USER_PROFILE_ALREADY_EXISTS`
- [ ] Implement `MongooseUserProfileRepository`
- [ ] Register providers in `UsersModule`

---

## 6. Presentation Tasks

- [ ] Create `POST /users/profile` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Derive `authUserId` from session
- [ ] Create request DTO
- [ ] Create response DTO
- [ ] Map invalid input to `400`
- [ ] Map existing profile to `409`
- [ ] Map invalid session to `401`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: successful profile creation
- [ ] Unit test: invalid input
- [ ] Unit test: profile already exists
- [ ] Unit test: defaults applied
- [ ] Unit test: safe response
- [ ] Integration test: Mongo persistence
- [ ] E2E test: `POST /users/profile`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body
- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure no `FitnessProfile` or `NutritionProfile` is created

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado consegue criar perfil
- [ ] `name` é salvo normalizado
- [ ] defaults são aplicados corretamente
- [ ] duplicidade retorna `USER_PROFILE_ALREADY_EXISTS`
- [ ] sessão inválida retorna `AUTH_INVALID_SESSION`
- [ ] response não retorna dados sensíveis
- [ ] nenhum perfil downstream é criado
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`domain -> application -> infrastructure -> presentation -> tests`

Este use-case deve permanecer isolado de `Fitness`, `Nutrition` e `AI`.
