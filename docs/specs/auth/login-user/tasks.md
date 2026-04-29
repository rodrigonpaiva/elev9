# Tasks — Login User

## 1. Overview

Este documento define o checklist técnico para implementar o use-case `login-user`.

O objetivo é transformar a spec em tarefas claras de desenvolvimento.

---

## 2. Folder Structure

Estrutura sugerida:

```txt
src/modules/auth/
  domain/
    repositories/
      auth-user.repository.ts
    services/
      password-hasher.service.ts
      access-token-signer.service.ts
  application/
    use-cases/
      login-user/
        login-user.input.ts
        login-user.output.ts
        login-user.use-case.ts
        login-user.errors.ts
  infrastructure/
    persistence/
      mongoose/
        mongoose-auth-user.repository.ts
    security/
      bcrypt-password-hasher.service.ts
      jwt-access-token-signer.service.ts
  presentation/
    http/
      auth.controller.ts
      dto/
        login-user.request.dto.ts
        login-user.response.dto.ts
  auth.module.ts
```

---

## 3. Domain Tasks

- [ ] Reuse `AuthUser` entity
- [ ] Reuse `AuthUserRepository`
- [ ] Extend `PasswordHasher` with:
  - [ ] `hash(password)`
  - [ ] `compare(password, passwordHash)`
- [ ] Create `AccessTokenSigner` interface

---

## 4. Application Tasks

- [ ] Create `LoginUserInput`
- [ ] Create `LoginUserOutput`
- [ ] Create `LoginUserUseCase`
- [ ] Implement input validation
- [ ] Normalize email
- [ ] Load `AuthUser`
- [ ] Compare password using `PasswordHasher`
- [ ] Generate `accessToken JWT`
- [ ] Return safe output
- [ ] Map domain errors

---

## 5. Infrastructure Tasks

- [ ] Reuse Mongoose repository lookup by email
- [ ] Implement password compare in bcrypt service
- [ ] Implement `AccessTokenSigner`
- [ ] Register providers in `AuthModule`

---

## 6. Presentation Tasks

- [ ] Create `POST /auth/login` endpoint
- [ ] Create request DTO
- [ ] Create response DTO
- [ ] Map invalid input to `400`
- [ ] Map invalid credentials to `401`
- [ ] Map internal errors to `500`

---

## 7. Test Tasks

- [ ] Unit test: successful login
- [ ] Unit test: invalid input
- [ ] Unit test: invalid credentials for unknown email
- [ ] Unit test: invalid credentials for wrong password
- [ ] Unit test: token generation
- [ ] Unit test: safe response
- [ ] Integration test: repository lookup
- [ ] E2E test: `POST /auth/login`

---

## 8. Security Tasks

- [ ] Ensure raw password is never persisted
- [ ] Ensure `passwordHash` is never returned
- [ ] Ensure account existence is not revealed
- [ ] Ensure email is normalized before repository lookup
- [ ] Ensure no `refreshToken` is generated in MVP

---

## 9. Acceptance Criteria

O use-case está pronto quando:

- [ ] usuário consegue autenticar com credenciais válidas
- [ ] `accessToken JWT` é retornado
- [ ] credenciais inválidas retornam `AUTH_INVALID_CREDENTIALS`
- [ ] e-mail é buscado já normalizado
- [ ] response não retorna dados sensíveis
- [ ] nenhum `UserProfile` é criado
- [ ] nenhum contexto externo é acessado
- [ ] testes principais passam

---

## 10. Summary

Ordem recomendada:

`domain -> application -> infrastructure -> presentation -> tests`

Este use-case deve permanecer isolado de `Users`, `Fitness`, `Nutrition`, `Training`, `Progress` e `AI`.

O use-case deve depender de `AccessTokenSigner`, não diretamente de `JwtService`.
