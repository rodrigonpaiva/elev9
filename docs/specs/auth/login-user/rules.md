# Rules — Login User

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `login-user`.

O objetivo é garantir que o login seja:

- seguro
- consistente
- previsível
- desacoplado dos outros domínios

---

## 2. Business Rules

### RULE-001 — Email is required

O campo `email` é obrigatório.

### RULE-002 — Email must be valid

O e-mail deve ter formato válido.

### RULE-003 — Email must be normalized

Antes da busca, o e-mail deve ser normalizado com:

- `trim`
- `lowercase`

### RULE-004 — Password is required

O campo `password` é obrigatório.

### RULE-005 — Password must be compared securely

A senha informada deve ser comparada com `passwordHash` usando `bcrypt` via `PasswordHasher`.

### RULE-006 — Invalid credentials must be generic

Se o usuário não existir ou a senha estiver incorreta, o sistema deve retornar sempre:

- `AUTH_INVALID_CREDENTIALS`

O cliente nunca deve conseguir inferir se o e-mail existe.

### RULE-007 — Login returns access token only

No MVP, o login retorna:

- `accessToken JWT`
- dados seguros do usuário

### RULE-008 — No refresh token in MVP

O fluxo de login não gera `refresh token` no MVP.

### RULE-009 — Response must be safe

A resposta nunca deve retornar:

- `password`
- `passwordHash`
- segredos do JWT
- dados internos de sessão

### RULE-010 — Login does not create UserProfile

`login-user` não cria:

- `UserProfile`
- `FitnessProfile`
- `NutritionProfile`
- `TrainingPlan`
- `NutritionPlan`
- `DailyCheckIn`

### RULE-011 — Errors must not expose internal details

Erros internos não devem expor:

- stack trace
- detalhes do banco
- detalhes do provider JWT
- detalhes internos do hash

---

## 3. Technical Rules

### TECH-001 — Use repository abstraction

O use-case depende de `AuthUserRepository`, não de Mongoose diretamente.

### TECH-002 — Use password hasher abstraction

O use-case depende de `PasswordHasher`.

Para `register-user` e `login-user`, essa abstração deve suportar:

- `hash(password)`
- `compare(password, passwordHash)`

Para login, a comparação deve ser segura e baseada em `bcrypt`.

### TECH-003 — Use token service abstraction

O use-case deve depender de `AccessTokenSigner` como abstração para assinar o JWT.

### TECH-004 — Use DTO validation

A entrada deve ser validada com `class-validator`, alinhado ao padrão do NestJS no MVP.

### TECH-005 — Use explicit error codes

Erros devem usar códigos estáveis:

- `AUTH_INVALID_INPUT`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_INTERNAL_ERROR`

### TECH-006 — Maintain Auth isolation

`login-user` não deve depender de `UsersService`, nem acessar `Fitness`, `Nutrition` ou `AI`.

### TECH-007 — Do not reveal account existence

O mesmo erro deve ser usado para:

- e-mail inexistente
- senha incorreta

---

## 4. Summary

O use-case existe para autenticar com segurança e devolver um token de acesso mínimo para o MVP.
