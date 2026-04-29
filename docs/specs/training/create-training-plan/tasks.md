# Tasks — Create Training Plan

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `create-training-plan`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/training/
  domain/
    entities/
      training-plan.entity.ts
    repositories/
      training-plan.repository.ts
  application/
    use-cases/
      create-training-plan/
        create-training-plan.input.ts
        create-training-plan.output.ts
        create-training-plan.use-case.ts
        create-training-plan.errors.ts
  infrastructure/
    persistence/
      mongoose/
        training-plan.schema.ts
        mongoose-training-plan.repository.ts
  presentation/
    http/
      training.controller.ts
      dto/
        create-training-plan.request.dto.ts
        create-training-plan.response.dto.ts
  training.module.ts
```

---

## 3. Domain Tasks

- [ ] Create `TrainingPlan` entity
- [ ] Create `TrainingPlanRepository` interface
- [ ] Define dependency on `FitnessProfileRepository` inside the Training Context to resolve `FitnessProfile` from `fitnessProfileId`
- [ ] Define plan structure for weekly schedule
- [ ] Define invariants and defaults

---

## 4. Application Tasks

- [ ] Create `CreateTrainingPlanInput`
- [ ] Create `CreateTrainingPlanOutput`
- [ ] Create `CreateTrainingPlanUseCase`
- [ ] Resolve `authUserId` from validated session before invoking the use-case
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Resolve `FitnessProfile` from `fitnessProfileId`
- [ ] Validate that `FitnessProfile` belongs to authenticated `UserProfile`
- [ ] Check existing active plan by `fitnessProfileId`
- [ ] Generate plan by deterministic rules
- [ ] Persist `TrainingPlan`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Create Mongoose `TrainingPlan` schema
- [ ] Add unique index on `fitnessProfileId`
- [ ] Translate unique index violation on `fitnessProfileId` to `TRAINING_PLAN_ALREADY_EXISTS`
- [ ] Implement `MongooseTrainingPlanRepository`
- [ ] Register providers in `TrainingModule`

---

## 6. Presentation Tasks

- [ ] Create `POST /training/plans` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Accept `fitnessProfileId` in request body
- [ ] Ensure `authUserId` never comes from request body
- [ ] Create request DTO
- [ ] Create response DTO
- [ ] Map existing plan to `409`
- [ ] Map missing `FitnessProfile` to `404`
- [ ] Map invalid session to `401`
- [ ] Map internal errors to `500`

---

## 7. Rule Engine Tasks

- [ ] Define rule map for `gain_muscle`
- [ ] Define rule map for `lose_weight`
- [ ] Define rule map for `maintain`
- [ ] Define maintain plan as balanced with `2–4 sets`, `8–15 reps`, moderate intensity, and mixed strength/mobility/light cardio
- [ ] Map `activityLevel` to weekly frequency
- [ ] Fix weekly frequency map: `low=2`, `medium=3`, `high=4`
- [ ] Define default exercise templates for MVP
- [ ] Define minimum `weeklySchedule` shape with `dayIndex`, `title`, `focus`, `intensity`, and `exercises[]`
- [ ] Ensure no AI provider is used

---

## 8. Test Tasks

- [ ] Unit test: successful plan creation for `gain_muscle`
- [ ] Unit test: successful plan creation for `lose_weight`
- [ ] Unit test: successful plan creation for `maintain`
- [ ] Unit test: `activityLevel` changes number of days
- [ ] Unit test: ownership violation returns `FITNESS_PROFILE_NOT_FOUND`
- [ ] Unit test: fitness profile not found
- [ ] Unit test: plan already exists
- [ ] Unit test: safe response
- [ ] Integration test: Mongo persistence
- [ ] E2E test: `POST /training/plans`

---

## 9. Security Tasks

- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure no `Nutrition` access happens
- [ ] Ensure no `AI` access happens

---

## 10. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado consegue criar plano para `FitnessProfile` existente
- [ ] `FitnessProfile` de outro usuário retorna `FITNESS_PROFILE_NOT_FOUND`
- [ ] duplicidade retorna `TRAINING_PLAN_ALREADY_EXISTS`
- [ ] ausência de `FitnessProfile` retorna `FITNESS_PROFILE_NOT_FOUND`
- [ ] sessão inválida retorna `AUTH_INVALID_SESSION`
- [ ] plano é gerado por regras, não IA
- [ ] response não retorna dados sensíveis
- [ ] nenhum acesso a `Nutrition` ou `AI` ocorre
- [ ] testes principais passam

---

## 11. Summary

Ordem recomendada:

`domain -> application -> rule generation -> infrastructure -> presentation -> tests`

Este use-case deve permanecer isolado de `Nutrition` e `AI`.
