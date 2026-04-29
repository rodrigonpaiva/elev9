# Rules — Get My Fitness Profile

## 1. Overview

Este documento define as regras de negócio e técnicas do use-case `get-my-fitness-profile`.

O objetivo é garantir que a leitura do perfil fitness seja:

- segura
- consistente
- previsível
- isolada de outros domínios

---

## 2. Business Rules

### RULE-001 — Session is required

O endpoint deve ser acessível apenas com sessão/JWT válida.

### RULE-002 — authUserId comes from session

O `authUserId` deve vir exclusivamente da sessão autenticada.

### RULE-003 — Never accept IDs from client

O sistema não deve aceitar:

- `authUserId`
- `userProfileId`
- `fitnessProfileId`

vindos do body, query string ou path params para este use-case.

A resolução deve ser exclusivamente via sessão autenticada.

### RULE-004 — UserProfile must exist

O sistema deve localizar `UserProfile` pelo `authUserId`.

Se não existir:

- `USER_PROFILE_NOT_FOUND`

### RULE-005 — Return only active FitnessProfile

O sistema deve retornar apenas `FitnessProfile` com:

```txt
status = active
```

### RULE-006 — FitnessProfile must belong to authenticated user

O `FitnessProfile` retornado deve ser resolvido a partir do `userProfileId` do usuário autenticado.

O sistema não pode revelar dados de outro usuário.

O use-case nunca deve aceitar ou usar `fitnessProfileId`, `userProfileId` ou `authUserId` vindos do cliente.

### RULE-007 — No Training access

O use-case não acessa `Training`.

### RULE-008 — No Nutrition access

O use-case não acessa `Nutrition`.

### RULE-009 — No AI access

O use-case não acessa `AI`.

---

## 3. Technical Rules

### TECH-001 — Use repository abstraction

O use-case depende de `UserProfileRepository` e `FitnessProfileRepository`, não de Mongoose diretamente.

### TECH-002 — Use session-derived identity

O controller ou camada de entrada deve derivar `authUserId` da sessão validada antes de chamar o use-case.

### TECH-003 — Use explicit error codes

Erros devem usar códigos estáveis:

- `AUTH_INVALID_SESSION`
- `USER_PROFILE_NOT_FOUND`
- `FITNESS_PROFILE_NOT_FOUND`
- `FITNESS_PROFILE_INTERNAL_ERROR`

### TECH-004 — Maintain Fitness isolation

O use-case não deve depender de `Training`, `Nutrition` ou `AI`.

---

## 4. Summary

O use-case existe para consultar com segurança o perfil fitness ativo do usuário autenticado, sem aceitar ids externos e sem expor dados de outros usuários.
