# Tasks — Get Workout History

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `get-workout-history`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/progress/
  application/
    use-cases/
      get-workout-history/
        get-workout-history.input.ts
        get-workout-history.output.ts
        get-workout-history.use-case.ts
        get-workout-history.errors.ts
  presentation/
    http/
      progress.controller.ts
      dto/
        get-workout-history.response.dto.ts
        get-workout-history.query.dto.ts
```

---

## 3. Domain Tasks

- [ ] Reuse `WorkoutLogRepository`
- [ ] Reuse `TrainingPlanRepository`
- [ ] Reuse `FitnessProfileRepository`
- [ ] Reuse `UserProfileRepository`
- [ ] Define read-only history invariants

---

## 4. Application Tasks

- [ ] Create `GetWorkoutHistoryInput`
- [ ] Create `GetWorkoutHistoryOutput`
- [ ] Create `GetWorkoutHistoryUseCase`
- [ ] Validate and normalize `limit`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Resolve active `FitnessProfile` from `userProfileId`
- [ ] Resolve active `TrainingPlans` from active `FitnessProfile`
- [ ] Extract `trainingPlanIds`
- [ ] Resolve eligible `WorkoutLogs` using `trainingPlanId IN trainingPlanIds`
- [ ] Sort logs by `date desc`, then `createdAt desc`
- [ ] Apply `limit`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Reuse `MongooseUserProfileRepository`
- [ ] Reuse `MongooseFitnessProfileRepository`
- [ ] Reuse `MongooseTrainingPlanRepository`
- [ ] Extend `WorkoutLogRepository` with history lookup if necessary
- [ ] Ensure filtering uses `WorkoutLog.date` as `YYYY-MM-DD` UTC string
- [ ] Ensure repository ordering is deterministic by `date desc`, `createdAt desc`

---

## 6. Presentation Tasks

- [ ] Create `GET /progress/workout-logs` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Derive `authUserId` from session
- [ ] Accept optional `limit` query param
- [ ] Reject extra query params when applicable
- [ ] Ensure no ids are accepted from body/query/path
- [ ] Create query DTO
- [ ] Create response DTO
- [ ] Map invalid session to `401`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map missing `FitnessProfile` to `404`
- [ ] Map invalid input to `400`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: successful history fetch
- [ ] Unit test: default limit
- [ ] Unit test: custom limit
- [ ] Unit test: empty history when no TrainingPlans
- [ ] Unit test: empty history when no logs
- [ ] Unit test: date desc ordering
- [ ] Unit test: createdAt desc tie-breaker
- [ ] Unit test: invalid limit
- [ ] Unit test: user profile not found
- [ ] Unit test: fitness profile not found
- [ ] Unit test: safe response
- [ ] HTTP test: extra query param rejected
- [ ] Integration test: ordered lookup
- [ ] E2E test: `GET /progress/workout-logs`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body
- [ ] Ensure no `userProfileId` or `fitnessProfileId` is accepted from client
- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure only logs of the authenticated user's active fitness scope are returned
- [ ] Ensure no `Nutrition` or `AI` access happens
- [ ] Ensure no data mutation happens

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado com perfil ativo consegue consultar seu histórico
- [ ] ausência de `UserProfile` retorna `USER_PROFILE_NOT_FOUND`
- [ ] ausência de `FitnessProfile` ativo retorna `FITNESS_PROFILE_NOT_FOUND`
- [ ] `limit` inválido retorna `WORKOUT_HISTORY_INVALID_INPUT`
- [ ] ausência de `TrainingPlans` ou logs retorna array vazio
- [ ] response não retorna dados sensíveis
- [ ] nenhum id é aceito do cliente
- [ ] nenhum acesso a `Nutrition` ou `AI` ocorre
- [ ] nenhuma mutação de dados ocorre
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`application -> infrastructure -> presentation -> tests`

Este use-case deve permanecer isolado de `Nutrition` e `AI`, e operar apenas em modo leitura.
