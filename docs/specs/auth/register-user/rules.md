# Rules — Register User

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `register-user`.

O objetivo é garantir que o registro seja:

- seguro
- consistente
- previsível
- desacoplado do restante do domínio

---

## 2. Business Rules

### RULE-001 — Name is required

O campo `name` é obrigatório.

### RULE-002 — Name length

O `name` deve ser normalizado com `trim` antes de qualquer validação de tamanho.

O nome deve ter:

- mínimo: `2` caracteres
- máximo: `80` caracteres

### RULE-003 — Email is required

O campo `email` é obrigatório.

### RULE-004 — Email must be valid

O e-mail deve ter formato válido.

### RULE-005 — Email must be normalized

Antes de verificar unicidade, o e-mail deve ser normalizado com:

- `trim`
- `lowercase`

### RULE-005A — Name must be trimmed before output

O valor de `name` retornado ao cliente deve refletir a versão normalizada com `trim`.

### RULE-006 — Email must be unique

Não pode existir outro `AuthUser` com o mesmo e-mail normalizado.

Em caso de duplicidade:

- `AUTH_EMAIL_ALREADY_EXISTS`

### RULE-007 — Password is required

O campo `password` é obrigatório.

### RULE-008 — Password minimum length

A senha deve ter no mínimo `8` caracteres.

### RULE-009 — Password complexity

A senha deve conter pelo menos:

- `1` letra maiúscula
- `1` letra minúscula
- `1` número

### RULE-010 — Password must never be persisted raw

A senha original nunca deve ser salva.

### RULE-011 — Password hash must be generated server-side

O cliente envia `password`, nunca `passwordHash`.

### RULE-012 — AuthUser starts with unverified email

Todo usuário criado inicia com:

```txt
isEmailVerified: false
```

### RULE-013 — Register does not authenticate user automatically

No MVP, o registro não cria sessão automaticamente.

### RULE-014 — Register does not create UserProfile

`register-user` não cria:

- `UserProfile`
- `FitnessProfile`
- `NutritionProfile`
- `TrainingPlan`
- `NutritionPlan`
- `DailyCheckIn`

### RULE-015 — Response must be safe

A resposta nunca deve retornar:

- `password`
- `passwordHash`
- tokens internos
- metadados sensíveis

### RULE-016 — Errors must not expose internal details

Erros internos não devem expor:

- stack trace
- detalhes do banco
- configuração de hash
- detalhes internos de provider

---

## 3. Technical Rules

### TECH-001 — Use repository abstraction

O use-case depende de `AuthUserRepository`, não de Mongoose diretamente.

### TECH-002 — Use password hasher abstraction

O use-case depende de `PasswordHasher`.

Implementação sugerida no MVP:

- `bcrypt`

### TECH-003 — Use DTO validation

A entrada deve ser validada com `class-validator`, alinhado ao padrão do NestJS no MVP.

### TECH-004 — Use explicit error codes

Erros devem usar códigos estáveis:

- `AUTH_INVALID_INPUT`
- `AUTH_EMAIL_ALREADY_EXISTS`
- `AUTH_PASSWORD_TOO_WEAK`
- `AUTH_INTERNAL_ERROR`

### TECH-005 — Maintain Auth isolation

`register-user` não deve depender de `UsersService` nem disparar criação automática de perfil.

### TECH-006 — Translate unique index errors

Se houver violação de índice único em MongoDB/Mongoose para o campo de e-mail, o erro deve ser traduzido para:

- `AUTH_EMAIL_ALREADY_EXISTS`

Isso também se aplica a condição de corrida entre a checagem prévia de unicidade e a persistência final.

---

## 4. Summary

O use-case existe para criar identidade de autenticação com segurança.

Ele não deve assumir responsabilidade por onboarding nem por identidade funcional do produto.
