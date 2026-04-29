# Tasks — Get My Fitness Profile

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `get-my-fitness-profile`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/fitness/
  application/
    use-cases/
      get-my-fitness-profile/
        get-my-fitness-profile.input.ts
        get-my-fitness-profile.output.ts
        get-my-fitness-profile.use-case.ts
        get-my-fitness-profile.errors.ts
  presentation/
    http/
      fitness.controller.ts
      dto/
        get-my-fitness-profile.response.dto.ts
```

---

## 3. Domain Tasks

- [ ] Reuse `FitnessProfileRepository`
- [ ] Reuse `UserProfileRepository`
- [ ] Define safe read invariants

---

## 4. Application Tasks

- [ ] Create `GetMyFitnessProfileInput`
- [ ] Create `GetMyFitnessProfileOutput`
- [ ] Create `GetMyFitnessProfileUseCase`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Resolve active `FitnessProfile` from `userProfileId`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Reuse `MongooseUserProfileRepository`
- [ ] Reuse `MongooseFitnessProfileRepository`
- [ ] Ensure repository supports lookup by active `userProfileId`

---

## 6. Presentation Tasks

- [ ] Create `GET /fitness/profile` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Derive `authUserId` from session
- [ ] Ensure no ids are accepted from body/query/path
- [ ] Create response DTO
- [ ] Map invalid session to `401`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map missing `FitnessProfile` to `404`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: successful retrieval
- [ ] Unit test: user profile not found
- [ ] Unit test: fitness profile not found
- [ ] Unit test: safe response
- [ ] Integration test: Mongo read
- [ ] E2E test: `GET /fitness/profile`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body
- [ ] Ensure no `userProfileId` or `fitnessProfileId` is accepted from client
- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure no `Training`, `Nutrition` or `AI` access happens

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado com perfil ativo consegue consultar seu `FitnessProfile`
- [ ] ausência de `UserProfile` retorna `USER_PROFILE_NOT_FOUND`
- [ ] ausência de `FitnessProfile` ativo retorna `FITNESS_PROFILE_NOT_FOUND`
- [ ] sessão inválida retorna `AUTH_INVALID_SESSION`
- [ ] response não retorna dados sensíveis
- [ ] nenhum id é aceito do cliente
- [ ] nenhum acesso a `Training`, `Nutrition` ou `AI` ocorre
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`application -> presentation -> tests`

Este use-case deve permanecer isolado de `Training`, `Nutrition` e `AI`.
