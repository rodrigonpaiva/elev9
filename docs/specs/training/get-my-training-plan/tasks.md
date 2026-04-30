# Tasks — Get My Training Plan

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `get-my-training-plan`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/training/
  application/
    use-cases/
      get-my-training-plan/
        get-my-training-plan.input.ts
        get-my-training-plan.output.ts
        get-my-training-plan.use-case.ts
        get-my-training-plan.errors.ts
  presentation/
    http/
      training.controller.ts
      dto/
        get-my-training-plan.response.dto.ts
```

---

## 3. Domain Tasks

- [ ] Reuse `TrainingPlanRepository`
- [ ] Reuse `FitnessProfileRepository`
- [ ] Reuse `UserProfileRepository`
- [ ] Define safe read invariants

---

## 4. Application Tasks

- [ ] Create `GetMyTrainingPlanInput`
- [ ] Create `GetMyTrainingPlanOutput`
- [ ] Create `GetMyTrainingPlanUseCase`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Resolve active `FitnessProfile` from `userProfileId`
- [ ] Resolve active `TrainingPlan` from `fitnessProfileId`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Reuse `MongooseUserProfileRepository`
- [ ] Reuse `MongooseFitnessProfileRepository`
- [ ] Reuse `MongooseTrainingPlanRepository`
- [ ] Ensure repository supports lookup by active `fitnessProfileId`

---

## 6. Presentation Tasks

- [ ] Create `GET /training/plans/current` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Derive `authUserId` from session
- [ ] Ensure no ids are accepted from body/query/path
- [ ] Create response DTO
- [ ] Map invalid session to `401`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map missing `FitnessProfile` to `404`
- [ ] Map missing `TrainingPlan` to `404`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: successful retrieval
- [ ] Unit test: user profile not found
- [ ] Unit test: fitness profile not found
- [ ] Unit test: training plan not found
- [ ] Unit test: safe response
- [ ] Integration test: Mongo reads
- [ ] E2E test: `GET /training/plans/current`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body
- [ ] Ensure no `userProfileId`, `fitnessProfileId` or `trainingPlanId` is accepted from client
- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure no `Nutrition` or `AI` access happens
- [ ] Ensure no mutation of `TrainingPlan` happens

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado com plano ativo consegue consultar seu `TrainingPlan`
- [ ] ausência de `UserProfile` retorna `USER_PROFILE_NOT_FOUND`
- [ ] ausência de `FitnessProfile` ativo retorna `FITNESS_PROFILE_NOT_FOUND`
- [ ] ausência de `TrainingPlan` ativo retorna `TRAINING_PLAN_NOT_FOUND`
- [ ] sessão inválida retorna `AUTH_INVALID_SESSION`
- [ ] response não retorna dados sensíveis
- [ ] nenhum id é aceito do cliente
- [ ] nenhum acesso a `Nutrition` ou `AI` ocorre
- [ ] nenhuma mutação de `TrainingPlan` ocorre
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`application -> presentation -> tests`

Este use-case deve permanecer isolado de `Nutrition` e `AI`, e não deve criar ou alterar plano.
