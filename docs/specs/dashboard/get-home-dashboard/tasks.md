# Tasks — Get Home Dashboard

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `get-home-dashboard`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/dashboard/
  application/
    use-cases/
      get-home-dashboard/
        get-home-dashboard.input.ts
        get-home-dashboard.output.ts
        get-home-dashboard.use-case.ts
        get-home-dashboard.errors.ts
  presentation/
    http/
      dashboard.controller.ts
      dto/
        get-home-dashboard.response.dto.ts
```

---

## 3. Domain Tasks

- [ ] Reuse `UserProfileRepository`
- [ ] Reuse `FitnessProfileRepository`
- [ ] Reuse `TrainingPlanRepository`
- [ ] Reuse progress summary logic or abstraction
- [ ] Define read-only dashboard invariants

---

## 4. Application Tasks

- [ ] Create `GetHomeDashboardInput`
- [ ] Create `GetHomeDashboardOutput`
- [ ] Create `GetHomeDashboardUseCase`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Resolve active `FitnessProfile` from `userProfileId`
- [ ] Resolve active `TrainingPlan` from `fitnessProfileId`
- [ ] Resolve weekly `progressSummary`
- [ ] Compute `todayWorkout` from UTC weekday
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Reuse existing repositories from `Users`, `Fitness`, `Training` and `Progress`
- [ ] Reuse `Clock` abstraction for UTC date logic
- [ ] Ensure no write path is triggered

---

## 6. Presentation Tasks

- [ ] Create `GET /dashboard/home` endpoint
- [ ] Protect endpoint with validated session/JWT
- [ ] Derive `authUserId` from session
- [ ] Ensure no ids are accepted from body/query/path
- [ ] Create response DTO
- [ ] Map invalid session to `401`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: full dashboard success
- [ ] Unit test: user profile not found
- [ ] Unit test: null fitnessProfile
- [ ] Unit test: null trainingPlan
- [ ] Unit test: zero progress summary
- [ ] Unit test: `todayWorkout` with UTC match
- [ ] Unit test: `todayWorkout = null` without match
- [ ] Integration test: repository composition
- [ ] E2E test: `GET /dashboard/home`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body
- [ ] Ensure no `userProfileId`, `fitnessProfileId` or `trainingPlanId` is accepted from client
- [ ] Ensure endpoint requires valid session
- [ ] Ensure response does not expose auth internals
- [ ] Ensure no `Nutrition` or `AI` access happens
- [ ] Ensure no data mutation happens

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário autenticado com `UserProfile` consegue carregar a home
- [ ] ausência de `UserProfile` retorna `USER_PROFILE_NOT_FOUND`
- [ ] ausência de `FitnessProfile` retorna `fitnessProfile = null`
- [ ] ausência de `TrainingPlan` retorna `trainingPlan = null`
- [ ] `progressSummary` semanal é retornado corretamente
- [ ] `todayWorkout` segue a regra UTC definida
- [ ] response não retorna dados sensíveis
- [ ] nenhum id é aceito do cliente
- [ ] nenhum acesso a `Nutrition` ou `AI` ocorre
- [ ] nenhuma mutação de dados ocorre
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`application -> presentation -> tests`

Este use-case deve permanecer isolado de `Nutrition` e `AI`, e operar apenas em modo leitura.
