# Rules — Validate Session

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `validate-session`.

O objetivo é garantir que a validação de sessão seja:

- segura
- consistente
- previsível
- desacoplada dos outros domínios

---

## 2. Business Rules

### RULE-001 — Authorization header is required

O header `Authorization` é obrigatório.

### RULE-002 — Authorization header must be Bearer

O formato aceito é:

```txt
Bearer <token>
```

### RULE-003 — Session is validated by access token

No MVP, a validação usa apenas `accessToken JWT`.

### RULE-004 — Access token payload must contain minimum fields

O payload mínimo deve conter:

- `sub`
- `email`

Mesmo que o JWT contenha claims extras, o use-case não deve confiar em dados além de:

- `sub`
- `email`

### RULE-005 — Invalid session must be generic

Se o token estiver ausente, inválido ou expirado, o sistema deve retornar sempre:

- `AUTH_INVALID_SESSION`

### RULE-006 — Response must be safe

A resposta nunca deve retornar:

- token bruto
- `password`
- `passwordHash`
- claims internos desnecessários

### RULE-007 — No refresh token in MVP

O fluxo de `validate-session` não usa `refresh token`.

### RULE-008 — Validate-session does not access UserProfile

`validate-session` não acessa:

- `UserProfile`
- `FitnessProfile`
- `NutritionProfile`
- `TrainingPlan`
- `DailyCheckIn`

### RULE-009 — Errors must not expose internal details

Erros internos não devem expor:

- stack trace
- detalhes do provider JWT
- claims internos além do necessário

---

## 3. Technical Rules

### TECH-001 — Use token verifier abstraction

O use-case deve depender de `AccessTokenVerifier`, não diretamente de `JwtService`.

### TECH-002 — Use explicit error codes

Erros devem usar códigos estáveis:

- `AUTH_INVALID_INPUT`
- `AUTH_INVALID_SESSION`
- `AUTH_INTERNAL_ERROR`

### TECH-003 — Maintain Auth isolation

`validate-session` não deve depender de `UsersService`, nem acessar `Fitness`, `Nutrition` ou `AI`.

### TECH-004 — Use minimal token payload

O verificador deve operar com payload mínimo:

- `sub`
- `email`

---

## 4. Summary

O use-case existe para validar sessão autenticada com JWT de forma mínima, segura e alinhada ao MVP.
