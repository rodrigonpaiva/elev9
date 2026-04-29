# Rules — Create User Profile

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `create-user-profile`.

O objetivo é garantir que a criação do perfil seja:

- segura
- consistente
- previsível
- desacoplada dos outros domínios

---

## 2. Business Rules

### RULE-001 — Session is required

O endpoint deve ser acessível apenas com sessão/JWT válida.

### RULE-002 — authUserId comes from session

O `authUserId` deve vir exclusivamente da sessão autenticada.

O body não pode fornecer `authUserId`.

### RULE-003 — Name is required

O campo `name` é obrigatório.

### RULE-004 — Name must be trimmed before validation

O `name` deve ser normalizado com `trim` antes de validar tamanho.

### RULE-005 — Name length

O nome deve ter:

- mínimo: `2` caracteres
- máximo: `80` caracteres

### RULE-006 — BirthDate is optional

`birthDate` é opcional, mas deve ser válida quando presente.

Quando persistida, `birthDate` deve ser normalizada como `Date`, não como string.

### RULE-007 — Gender is optional

`gender` é opcional, mas quando presente deve ser um valor permitido.

### RULE-008 — Only one UserProfile per AuthUser

Um `AuthUser` pode ter no máximo um `UserProfile`.

Se já existir perfil:

- `USER_PROFILE_ALREADY_EXISTS`

### RULE-009 — Default values must be applied

No MVP:

- `language = "en-US"`
- `timezone = "UTC"`
- `status = "active"`

### RULE-010 — Response must be safe

A resposta nunca deve retornar:

- `password`
- `passwordHash`
- token JWT
- dados internos de autenticação

### RULE-011 — No downstream profile creation

`create-user-profile` não cria:

- `FitnessProfile`
- `NutritionProfile`

### RULE-012 — No AI access

O use-case não acessa `AI`.

---

## 3. Technical Rules

### TECH-001 — Use repository abstraction

O use-case depende de `UserProfileRepository`, não de Mongoose diretamente.

### TECH-002 — Use session-derived identity

O controller ou camada de entrada deve derivar `authUserId` da sessão validada antes de chamar o use-case.

### TECH-003 — Use DTO validation

A entrada deve ser validada com `class-validator`, alinhado ao padrão do NestJS no MVP.

### TECH-004 — Use explicit error codes

Erros devem usar códigos estáveis:

- `USER_PROFILE_INVALID_INPUT`
- `USER_PROFILE_ALREADY_EXISTS`
- `AUTH_INVALID_SESSION`
- `USER_PROFILE_INTERNAL_ERROR`

### TECH-005 — Maintain Users isolation

O use-case não deve depender de `Fitness`, `Nutrition` ou `AI`.

---

## 4. Summary

O use-case existe para criar a identidade funcional inicial do usuário no produto, separada do contexto de autenticação.
