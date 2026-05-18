# Tasks — Replay Coach Feedback

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `replay-coach-feedback`.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/ai/
  application/
    use-cases/
      replay-coach-feedback/
        replay-coach-feedback.input.ts
        replay-coach-feedback.output.ts
        replay-coach-feedback.errors.ts
        replay-coach-feedback.use-case.ts
  presentation/
    http/
      ai.controller.ts
      dto/
        replay-coach-feedback.response.dto.ts
```

---

## 3. Application Tasks

- [ ] Create `ReplayCoachFeedbackInput`
- [ ] Create `ReplayCoachFeedbackOutput`
- [ ] Create `ReplayCoachFeedbackUseCase`
- [ ] Resolve `UserProfile` from `authUserId`
- [ ] Load `CoachFeedback` by id
- [ ] Validate ownership
- [ ] Validate `contextSnapshot`
- [ ] Validate `generatorVersion`
- [ ] Map snapshot to generator input
- [ ] Reuse `CoachFeedbackGenerator`
- [ ] Build `matches`
- [ ] Map domain errors

---

## 4. Presentation Tasks

- [ ] Expose `GET /ai/debug/coach-feedback/:id/replay`
- [ ] Protect endpoint with validated session
- [ ] Reject body with `400 AI_COACH_REPLAY_INVALID_INPUT`
- [ ] Create response DTO
- [ ] Map invalid input to `400`
- [ ] Map invalid session to `401`
- [ ] Map missing `UserProfile` to `404`
- [ ] Map missing ownership-safe feedback to `404`
- [ ] Map missing replay context to `400`
- [ ] Map unsupported version to `400`
- [ ] Map internal errors to `500`

---

## 5. Test Tasks

- [ ] Unit test: replay with valid snapshot
- [ ] Unit test: missing contextSnapshot
- [ ] Unit test: unsupported generatorVersion
- [ ] Unit test: ownership isolation
- [ ] Unit test: match flags
- [ ] Unit test: no persistence side effect
- [ ] HTTP test: authenticated replay endpoint
- [ ] HTTP test: invalid body mapping

---

## 6. Acceptance Criteria

- [ ] endpoint existe
- [ ] replay reutiliza o generator real
- [ ] replay depende de `contextSnapshot`
- [ ] replay depende de `generatorVersion`
- [ ] replay respeita ownership
- [ ] replay não persiste resultados
- [ ] `matches` é retornado com comparação simples

---

## 7. Summary

Ordem recomendada:

`application -> presentation -> tests`

Este fluxo deve nascer simples, determinístico e estritamente read-only.
