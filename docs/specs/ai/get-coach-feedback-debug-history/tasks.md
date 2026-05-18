# Tasks — Get Coach Feedback Debug History

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `get-coach-feedback-debug-history`.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/ai/
  application/
    use-cases/
      get-coach-feedback-debug-history/
        get-coach-feedback-debug-history.input.ts
        get-coach-feedback-debug-history.output.ts
        get-coach-feedback-debug-history.errors.ts
        get-coach-feedback-debug-history.use-case.ts
  presentation/
    http/
      ai.controller.ts
      dto/
        get-coach-feedback-debug-history.query.dto.ts
        get-coach-feedback-debug-history.response.dto.ts
```

---

## 3. Application Tasks

- [ ] Create `GetCoachFeedbackDebugHistoryInput`
- [ ] Create `GetCoachFeedbackDebugHistoryOutput`
- [ ] Create `GetCoachFeedbackDebugHistoryUseCase`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Validate `limit`
- [ ] Apply default `20`
- [ ] Enforce max `100`
- [ ] Query `CoachFeedback` by `userProfileId`
- [ ] Map legacy `influences` to `[]`
- [ ] Return `generatorVersion` when available
- [ ] Return `contextSnapshot` when available
- [ ] Map domain errors

---

## 4. Presentation Tasks

- [ ] Expose `GET /ai/debug/coach-feedback`
- [ ] Protect endpoint with validated session
- [ ] Reject body with `400 AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT`
- [ ] Create query DTO with `limit`
- [ ] Create response DTO with internal metadata
- [ ] Map invalid input to `400`
- [ ] Map invalid session to `401`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map internal errors to `500`

---

## 5. Test Tasks

- [ ] Unit test: return debug history with influences
- [ ] Unit test: default limit
- [ ] Unit test: explicit limit
- [ ] Unit test: empty history
- [ ] Unit test: user isolation
- [ ] Unit test: legacy document fallback
- [ ] Unit test: user profile not found
- [ ] Unit test: invalid limit
- [ ] HTTP test: authenticated debug endpoint
- [ ] HTTP test: invalid body mapping

---

## 6. Acceptance Criteria

- [ ] endpoint existe
- [ ] histórico continua isolado por usuário
- [ ] `influences` é retornado
- [ ] `generatorVersion` é retornado quando existir
- [ ] `contextSnapshot` é retornado quando existir
- [ ] documentos legados continuam válidos
- [ ] endpoints públicos continuam inalterados

---

## 7. Summary

Ordem recomendada:

`application -> presentation -> tests`

Este fluxo deve nascer simples, interno e compatível com a arquitetura de explainability já persistida.
