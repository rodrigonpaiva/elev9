# Tasks — Get Progress Summary

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `get-progress-summary`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/progress/
  application/
    use-cases/
      get-progress-summary/
        get-progress-summary.input.ts
        get-progress-summary.output.ts
        get-progress-summary.use-case.ts
        get-progress-summary.errors.ts
  presentation/
    http/
      progress.controller.ts
      dto/
        get-progress-summary.response.dto.ts
        get-progress-summary.query.dto.ts
```

---

## 3. Domain Tasks

- [ ] Reuse `WorkoutLogRepository`
- [ ] Reuse `TrainingPlanRepository`
- [ ] Reuse `FitnessProfileRepository`
- [ ] Reuse `UserProfileRepository`
- [ ] Define read-only aggregation invariants

---

## 4. Application Tasks

- [ ] Create `GetProgressSummaryInput`
- [ ] Create `GetProgressSummaryOutput`
- [ ] Create `GetProgressSummaryUseCase`
- [ ] Validate and normalize `period`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Resolve active `FitnessProfile` from `userProfileId`
- [ ] Resolve `TrainingPlans` from active `FitnessProfile`
- [ ] Extract `trainingPlanIds`
- [ ] Resolve eligible `WorkoutLogs` using `trainingPlanId IN trainingPlanIds`
- [ ] Aggregate summary
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Reuse `MongooseUserProfileRepository`
- [ ] Reuse `MongooseFitnessProfileRepository`
- [ ] Reuse `MongooseTrainingPlanRepository`
- [ ] Extend `WorkoutLogRepository` with period-based lookup if necessary
- [ ] Ensure queries use UTC-compatible filtering with inclusive `startDate` and `endDate`
- [ ] Ensure filtering uses `WorkoutLog.date` as `YYYY-MM-DD` UTC string

---

## 6. Presentation Tasks

- [ ] Create `GET /progress/summary` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Derive `authUserId` from session
- [ ] Accept optional `period` query param
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

- [ ] Unit test: successful weekly summary
- [ ] Unit test: successful monthly summary
- [ ] Unit test: default period
- [ ] Unit test: empty summary returns zeros
- [ ] Unit test: no TrainingPlans returns zeros
- [ ] Unit test: week filters logs inside last 7 UTC days
- [ ] Unit test: month filters logs inside last 30 UTC days
- [ ] Unit test: UTC day boundary
- [ ] Unit test: average with 2 decimal places
- [ ] Unit test: invalid period
- [ ] Unit test: user profile not found
- [ ] Unit test: fitness profile not found
- [ ] Unit test: safe response
- [ ] HTTP test: extra query param rejected
- [ ] Integration test: UTC filtering
- [ ] E2E test: `GET /progress/summary`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body
- [ ] Ensure no `userProfileId` or `fitnessProfileId` is accepted from client
- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure only logs of the authenticated user's active fitness scope are aggregated
- [ ] Ensure no `Nutrition` or `AI` access happens
- [ ] Ensure no data mutation happens

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado com perfil ativo consegue consultar seu resumo
- [ ] ausência de `UserProfile` retorna `USER_PROFILE_NOT_FOUND`
- [ ] ausência de `FitnessProfile` ativo retorna `FITNESS_PROFILE_NOT_FOUND`
- [ ] `period` inválido retorna `PROGRESS_SUMMARY_INVALID_INPUT`
- [ ] ausência de logs retorna zeros e `lastWorkoutDate = null`
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
