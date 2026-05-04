# Tasks — Get Coach Feedback History

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `get-coach-feedback-history`.

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
    use-cases/
      get-coach-feedback-history/
        get-coach-feedback-history.input.ts
        get-coach-feedback-history.output.ts
        get-coach-feedback-history.errors.ts
        get-coach-feedback-history.use-case.ts
  infrastructure/
    mongoose/
      coach-feedback.schema.ts
      mongoose-coach-feedback.repository.ts
  presentation/
    http/
      ai.controller.ts
      dto/
        get-coach-feedback-history.query.dto.ts
        get-coach-feedback-history.response.dto.ts
```

---

## 3. Domain Tasks

- [ ] Create `CoachFeedback` entity
- [ ] Create `CoachFeedbackRepository`
- [ ] Define repository read path by `userProfileId`
- [ ] Define repository create path for `POST /ai/coach-feedback`

---

## 4. Application Tasks

- [ ] Create `GetCoachFeedbackHistoryInput`
- [ ] Create `GetCoachFeedbackHistoryOutput`
- [ ] Create `GetCoachFeedbackHistoryUseCase`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Validate `limit`
- [ ] Parse `limit` from query string
- [ ] Ensure `limit` is a positive decimal integer
- [ ] Apply `limit` default `20`
- [ ] Query `CoachFeedback` by `userProfileId`
- [ ] Reject any body field with `AI_FEEDBACK_HISTORY_INVALID_INPUT`
- [ ] Order results by `createdAt desc`
- [ ] Apply `id desc` tie-break when applicable
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Persistence Tasks

- [ ] Create Mongoose schema for `CoachFeedback`
- [ ] Add index for `userProfileId + createdAt`
- [ ] Implement `findByUserProfileIdOrdered`
- [ ] Implement `create`
- [ ] Update `POST /ai/coach-feedback` to persist feedback after generation
- [ ] Fail `POST /ai/coach-feedback` when persistence fails

---

## 6. Presentation Tasks

- [ ] Expose `GET /ai/coach-feedback`
- [ ] Protect endpoint with validated session/JWT
- [ ] Derive `authUserId` from session
- [ ] Accept optional query `limit`
- [ ] Reject any body field with `400 AI_FEEDBACK_HISTORY_INVALID_INPUT`
- [ ] Create response DTO
- [ ] Map invalid input to `400`
- [ ] Map invalid session to `401`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: empty history
- [ ] Unit test: multiple feedbacks
- [ ] Unit test: default limit
- [ ] Unit test: limit=1
- [ ] Unit test: explicit limit
- [ ] Unit test: createdAt desc ordering
- [ ] Unit test: user isolation
- [ ] Unit test: persist feedback during `POST /ai/coach-feedback`
- [ ] Unit test: persistence failure during `POST /ai/coach-feedback`
- [ ] Unit test: user profile not found
- [ ] Unit test: invalid limit
- [ ] Unit test: invalid limit > 50
- [ ] Unit test: GET with unexpected body
- [ ] Unit test: internal failure
- [ ] HTTP test: safe response shape
- [ ] HTTP test: invalid input mapping
- [ ] HTTP test: invalid session mapping
- [ ] HTTP test: missing profile mapping
- [ ] E2E test: `GET /ai/coach-feedback`

---

## 8. Security Tasks

- [ ] Ensure `authUserId` never comes from request body or query
- [ ] Ensure history is filtered by authenticated `userProfileId`
- [ ] Ensure response does not expose `userProfileId`
- [ ] Ensure `Nutrition` is never read in MVP
- [ ] Ensure no external AI provider is called

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] feedback gerado é persistido no `POST /ai/coach-feedback`
- [ ] histórico retorna apenas itens do usuário autenticado
- [ ] histórico vem ordenado por `createdAt desc`
- [ ] empate usa `id desc` quando aplicável
- [ ] `limit` default = `20`
- [ ] `limit` máximo = `50`
- [ ] `GET` com body indevido retorna `AI_FEEDBACK_HISTORY_INVALID_INPUT`
- [ ] histórico vazio retorna `[]`
- [ ] response não retorna dados sensíveis
- [ ] `Nutrition` permanece isolado
- [ ] nenhuma IA externa é usada
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`domain -> persistence -> update POST generation flow -> GET use-case -> presentation -> tests`

Este use-case deve nascer simples, persistente e pronto para evolução para memória de coach e chat.
