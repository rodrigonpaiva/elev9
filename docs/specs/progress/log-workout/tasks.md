# Tasks — Log Workout

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `log-workout`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/progress/
  domain/
    entities/
      workout-log.entity.ts
    repositories/
      workout-log.repository.ts
  application/
    use-cases/
      log-workout/
        log-workout.input.ts
        log-workout.output.ts
        log-workout.use-case.ts
        log-workout.errors.ts
  infrastructure/
    persistence/
      mongoose/
        workout-log.schema.ts
        mongoose-workout-log.repository.ts
  presentation/
    http/
      progress.controller.ts
      dto/
        log-workout.request.dto.ts
        log-workout.response.dto.ts
  progress.module.ts
```

---

## 3. Domain Tasks

- [ ] Create `WorkoutLog` entity
- [ ] Create `WorkoutLogRepository` interface
- [ ] Define uniqueness invariant for `trainingPlanId + workoutDayIndex + date`

---

## 4. Application Tasks

- [ ] Create `LogWorkoutInput`
- [ ] Create `LogWorkoutOutput`
- [ ] Create `LogWorkoutUseCase`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Resolve active `FitnessProfile`
- [ ] Resolve `TrainingPlan`
- [ ] Validate ownership
- [ ] Validate `workoutDayIndex` against `weeklySchedule[].dayIndex`
- [ ] Validate payload
- [ ] Generate `date` in UTC as `YYYY-MM-DD`
- [ ] Check duplicate log
- [ ] Create `WorkoutLog`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Create Mongoose `WorkoutLog` schema
- [ ] Add unique index for `trainingPlanId + workoutDayIndex + date`
- [ ] Translate duplicate index violation to `WORKOUT_LOG_ALREADY_EXISTS`
- [ ] Persist `date` as UTC string `YYYY-MM-DD`
- [ ] Implement `MongooseWorkoutLogRepository`
- [ ] Register providers in `ProgressModule`

---

## 6. Presentation Tasks

- [ ] Create `POST /progress/workout-logs` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Accept `trainingPlanId` in request body
- [ ] Ensure `authUserId`, `userProfileId` and `fitnessProfileId` never come from request body
- [ ] Create request DTO
- [ ] Create response DTO
- [ ] Map invalid input to `400`
- [ ] Map duplicate log to `409`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map missing `FitnessProfile` to `404`
- [ ] Map missing `TrainingPlan` to `404`
- [ ] Map invalid session to `401`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: successful workout log creation
- [ ] Unit test: invalid `workoutDayIndex`
- [ ] Unit test: invalid `durationMinutes`
- [ ] Unit test: empty `completedExercises`
- [ ] Unit test: `TrainingPlan` not found
- [ ] Unit test: ownership failure returns `TRAINING_PLAN_NOT_FOUND`
- [ ] Unit test: duplicate log
- [ ] Unit test: same `trainingPlanId + workoutDayIndex` on different dates is allowed
- [ ] Unit test: same `trainingPlanId + workoutDayIndex + same UTC date` is blocked
- [ ] Unit test: safe response
- [ ] Integration test: Mongo persistence
- [ ] E2E test: `POST /progress/workout-logs`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body
- [ ] Ensure `userProfileId` never comes from request body
- [ ] Ensure `fitnessProfileId` never comes from request body
- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure `TrainingPlan` is not modified
- [ ] Ensure no `AI` or `Nutrition` access happens

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado consegue registrar treino em plano próprio
- [ ] plano de outro usuário retorna `TRAINING_PLAN_NOT_FOUND`
- [ ] duplicidade retorna `WORKOUT_LOG_ALREADY_EXISTS`
- [ ] payload inválido retorna `WORKOUT_LOG_INVALID_INPUT`
- [ ] sessão inválida retorna `AUTH_INVALID_SESSION`
- [ ] response não retorna dados sensíveis
- [ ] `TrainingPlan` não é alterado
- [ ] nenhum acesso a `AI` ou `Nutrition` ocorre
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`domain -> application -> infrastructure -> presentation -> tests`

Este use-case deve permanecer isolado de `AI`, `Nutrition` e mutações em `TrainingPlan`.
