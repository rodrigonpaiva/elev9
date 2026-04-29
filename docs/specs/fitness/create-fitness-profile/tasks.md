# Tasks — Create Fitness Profile

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `create-fitness-profile`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/fitness/
  domain/
    entities/
      fitness-profile.entity.ts
    repositories/
      fitness-profile.repository.ts
  application/
    use-cases/
      create-fitness-profile/
        create-fitness-profile.input.ts
        create-fitness-profile.output.ts
        create-fitness-profile.use-case.ts
        create-fitness-profile.errors.ts
  infrastructure/
    persistence/
      mongoose/
        fitness-profile.schema.ts
        mongoose-fitness-profile.repository.ts
  presentation/
    http/
      fitness.controller.ts
      dto/
        create-fitness-profile.request.dto.ts
        create-fitness-profile.response.dto.ts
  fitness.module.ts
```

---

## 3. Domain Tasks

- [ ] Create `FitnessProfile` entity
- [ ] Create `FitnessProfileRepository` interface
- [ ] Define dependency on `UserProfileRepository` inside the Fitness Context to resolve `UserProfile` from `authUserId`
- [ ] Define invariants and defaults

---

## 4. Application Tasks

- [ ] Create `CreateFitnessProfileInput`
- [ ] Create `CreateFitnessProfileOutput`
- [ ] Create `CreateFitnessProfileUseCase`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Validate input
- [ ] Check existing active profile by `userProfileId`
- [ ] Create `FitnessProfile`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Create Mongoose `FitnessProfile` schema
- [ ] Add unique index on `userProfileId`
- [ ] Translate unique index violation on `userProfileId` to `FITNESS_PROFILE_ALREADY_EXISTS`
- [ ] Implement `MongooseFitnessProfileRepository`
- [ ] Register providers in `FitnessModule`

---

## 6. Presentation Tasks

- [ ] Create `POST /fitness/profile` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Derive `authUserId` from session
- [ ] Resolve `UserProfile`
- [ ] Create request DTO
- [ ] Create response DTO
- [ ] Map invalid input to `400`
- [ ] Map existing profile to `409`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map invalid session to `401`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: successful fitness profile creation
- [ ] Unit test: invalid input
- [ ] Unit test: user profile not found
- [ ] Unit test: fitness profile already exists
- [ ] Unit test: safe response
- [ ] Integration test: Mongo persistence
- [ ] E2E test: `POST /fitness/profile`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body
- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure no `TrainingPlan` is created
- [ ] Ensure no `Nutrition` or `AI` access happens

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado com `UserProfile` consegue criar perfil fitness
- [ ] `status` default é aplicado
- [ ] duplicidade retorna `FITNESS_PROFILE_ALREADY_EXISTS`
- [ ] ausência de `UserProfile` retorna `USER_PROFILE_NOT_FOUND`
- [ ] sessão inválida retorna `AUTH_INVALID_SESSION`
- [ ] response não retorna dados sensíveis
- [ ] nenhum plano downstream é criado
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`domain -> application -> infrastructure -> presentation -> tests`

Este use-case deve permanecer isolado de `Training`, `Nutrition` e `AI`.
