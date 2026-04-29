# Tasks — Validate Session

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `validate-session`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/auth/
  domain/
    services/
      access-token-verifier.service.ts
  application/
    use-cases/
      validate-session/
        validate-session.input.ts
        validate-session.output.ts
        validate-session.use-case.ts
        validate-session.errors.ts
  infrastructure/
    security/
      jwt-access-token-verifier.service.ts
  presentation/
    http/
      auth.controller.ts
      dto/
        validate-session.request.dto.ts
        validate-session.response.dto.ts
  auth.module.ts
```

---

## 3. Domain Tasks

- [ ] Create `AccessTokenVerifier` interface
- [ ] Define minimum payload contract with `sub` and `email`

---

## 4. Application Tasks

- [ ] Create `ValidateSessionInput`
- [ ] Create `ValidateSessionOutput`
- [ ] Create `ValidateSessionUseCase`
- [ ] Validate `Authorization` header
- [ ] Extract bearer token
- [ ] Verify token using `AccessTokenVerifier`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Implement JWT token verifier
- [ ] Register verifier provider in `AuthModule`

---

## 6. Presentation Tasks

- [ ] Create `GET /auth/session` endpoint
- [ ] Read `Authorization` header
- [ ] Create response DTO
- [ ] Map invalid input to `400`
- [ ] Map invalid session to `401`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: valid session
- [ ] Unit test: missing authorization header
- [ ] Unit test: malformed bearer header
- [ ] Unit test: invalid token
- [ ] Unit test: expired token
- [ ] Unit test: safe response
- [ ] E2E test: `GET /auth/session`

---

## 8. Security Tasks

- [ ] Ensure token bruto nunca é retornado
- [ ] Ensure apenas `sub` e `email` são usados do payload mínimo
- [ ] Ensure session invalid responses are generic
- [ ] Ensure no `refresh token` is involved

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] token válido retorna `user.id` e `user.email`
- [ ] token ausente, inválido ou expirado retorna `AUTH_INVALID_SESSION`
- [ ] response não retorna dados sensíveis
- [ ] nenhum `UserProfile` é acessado
- [ ] nenhum contexto externo é acessado
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`domain -> application -> infrastructure -> presentation -> tests`

Este use-case deve permanecer isolado de `Users`, `Fitness`, `Nutrition`, `Training`, `Progress` e `AI`.
