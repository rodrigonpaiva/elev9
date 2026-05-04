# Tasks — Generate Coach Feedback

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `generate-coach-feedback`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/ai/
  domain/
    entities/
      coach-feedback.entity.ts
    repositories/
      coach-feedback.repository.ts
  application/
    services/
      coach-feedback/
        generate-coach-feedback.service.ts
    use-cases/
      generate-coach-feedback/
        generate-coach-feedback.input.ts
        generate-coach-feedback.output.ts
        generate-coach-feedback.use-case.ts
        generate-coach-feedback.errors.ts
  presentation/
    http/
      ai.controller.ts
      dto/
        generate-coach-feedback.response.dto.ts
  infrastructure/
    mongoose/
      coach-feedback.schema.ts
      mongoose-coach-feedback.repository.ts
```

---

## 3. Domain Tasks

- [ ] Reuse `UserProfileRepository`
- [ ] Reuse `FitnessProfileRepository`
- [ ] Reuse `TrainingPlanRepository`
- [ ] Reuse `WorkoutLogRepository`
- [ ] Reuse or align with `ProgressSummary` aggregation
- [ ] Define no-mutation invariants for fitness/training/progress data
- [ ] Create `CoachFeedback` entity and repository contract

---

## 4. Application Tasks

- [ ] Create `GenerateCoachFeedbackInput`
- [ ] Create `GenerateCoachFeedbackOutput`
- [ ] Create `GenerateCoachFeedbackUseCase`
- [ ] Create deterministic `GenerateCoachFeedbackService`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Resolve active `FitnessProfile` from `userProfileId`
- [ ] Resolve active `TrainingPlan` when available
- [ ] Resolve fixed 7-day UTC window including today
- [ ] Resolve recent `WorkoutLogs`
- [ ] Resolve or reuse progress summary metrics
- [ ] Permitir recomputação interna das métricas no MVP
- [ ] Garantir equivalência algorítmica com `progress/get-progress-summary`
- [ ] Evitar dependência direta obrigatória com `GetProgressSummaryUseCase`
- [ ] Resolve `expectedWorkouts` from `trainingAvailability.daysPerWeek`
- [ ] Resolve `expectedWorkouts` fallback from `activityLevel`
- [ ] Derive coaching metrics
- [ ] Implement duration trend com logs da janela ordenados por `date asc` e `createdAt asc`
- [ ] Classify `no logs`, `beginner`, `consistent`, `inconsistent`, `high streak`
- [ ] Generate `message`
- [ ] Generate `insights`
- [ ] Generate `recommendations`
- [ ] Persist `CoachFeedback` after successful generation
- [ ] Fail request if `CoachFeedback` persistence fails
- [ ] Enforce message priority order
- [ ] Enforce output size limits
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Reuse `MongooseUserProfileRepository`
- [ ] Reuse `MongooseFitnessProfileRepository`
- [ ] Reuse `MongooseTrainingPlanRepository`
- [ ] Reuse `MongooseWorkoutLogRepository`
- [ ] Create Mongoose persistence for `CoachFeedback`
- [ ] Reuse progress aggregation logic when possible
- [ ] Keep existing modules untouched except for required `CoachFeedback` persistence

---

## 6. Presentation Tasks

- [ ] Create `POST /ai/coach-feedback` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Derive `authUserId` from session
- [ ] Ensure no functional body fields are required
- [ ] Reject any functional body fields with `400 AI_COACH_INVALID_INPUT`
- [ ] Ensure no ids are accepted from body/query/path
- [ ] Create response DTO
- [ ] Map invalid input to `400`
- [ ] Map invalid session to `401`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map missing `FitnessProfile` to `404`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: user with many logs
- [ ] Unit test: beginner user
- [ ] Unit test: inconsistent user
- [ ] Unit test: no logs
- [ ] Unit test: high streak
- [ ] Unit test: duration trend insight
- [ ] Unit test: no duration trend insight when fewer than 4 logs exist
- [ ] Unit test: duration trend uses first half vs second half average
- [ ] Unit test: goal-aware recommendation
- [ ] Unit test: activity-level-aware recommendation
- [ ] Unit test: training-availability-based expected frequency
- [ ] Unit test: activity-level fallback expected frequency
- [ ] Unit test: no `TrainingPlan` degraded coaching
- [ ] Unit test: user profile not found
- [ ] Unit test: fitness profile not found
- [ ] Unit test: invalid input
- [ ] Unit test: internal failure
- [ ] Unit test: feedback persistence on success
- [ ] Unit test: persistence failure
- [ ] Unit test: message priority order
- [ ] Unit test: output length limits
- [ ] HTTP test: safe response shape
- [ ] HTTP test: invalid input mapping
- [ ] HTTP test: invalid session mapping
- [ ] HTTP test: missing profile mapping
- [ ] E2E test: `POST /ai/coach-feedback`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body
- [ ] Ensure no `userProfileId`, `fitnessProfileId` or `trainingPlanId` is accepted from client
- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure no raw internal prompt is returned
- [ ] Ensure no external AI provider is called
- [ ] Ensure `Nutrition` is never read in MVP
- [ ] Ensure no nutritional recommendation is generated
- [ ] Ensure no data mutation happens

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado recebe feedback coerente
- [ ] ausência de `UserProfile` retorna `USER_PROFILE_NOT_FOUND`
- [ ] ausência de `FitnessProfile` ativo retorna `FITNESS_PROFILE_NOT_FOUND`
- [ ] ausência de logs retorna mensagem motivacional inicial
- [ ] streak alto influencia positivamente a mensagem
- [ ] `TrainingPlan` ausente não bloqueia feedback
- [ ] `expectedWorkouts` segue `trainingAvailability.daysPerWeek` com fallback por `activityLevel`
- [ ] janela fixa usa os últimos 7 dias corridos incluindo hoje em UTC
- [ ] recomendações são acionáveis
- [ ] body com campos extras retorna `AI_COACH_INVALID_INPUT`
- [ ] `Nutrition` permanece isolado
- [ ] output respeita limites de tamanho
- [ ] response não retorna dados sensíveis
- [ ] nenhuma IA externa é usada
- [ ] nenhuma mutação ocorre em `FitnessProfile`, `TrainingPlan` ou `WorkoutLogs`
- [ ] `CoachFeedback` é persistido com sucesso
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`application -> deterministic service -> presentation -> tests`

Este use-case deve nascer simples, previsível e preparado para futura evolução com LLM real.
