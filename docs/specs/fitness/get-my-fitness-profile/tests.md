# Tests — Get My Fitness Profile

## 1. Overview

Este documento define os cenários de teste do use-case `get-my-fitness-profile`.

Objetivos:

- garantir comportamento correto
- cobrir sucesso e falha
- validar resolução por sessão
- preservar isolamento do contexto `Fitness`

---

## 2. Test Strategy

Tipos de teste recomendados:

```txt
Unit tests
Integration tests
E2E tests
```

---

## 3. Success Scenarios

### TEST-001 — Get active fitness profile successfully

Given:

- sessão válida
- `UserProfile` existente
- `FitnessProfile` ativo existente

Then:

- perfil fitness é retornado
- resposta contém apenas dados seguros

### TEST-002 — Return only active profile

Given:

- existe perfil fitness ativo para o usuário

Then:

- apenas o perfil com `status = active` é retornado

---

## 4. Business Errors

### TEST-003 — User profile not found

Expected:

- `USER_PROFILE_NOT_FOUND`

### TEST-004 — Fitness profile not found

Expected:

- `FITNESS_PROFILE_NOT_FOUND`

---

## 5. Security Tests

### TEST-005 — Session required

Expected:

- `AUTH_INVALID_SESSION`

### TEST-006 — No IDs from client

Expected:

- o endpoint funciona sem aceitar `authUserId`, `userProfileId` ou `fitnessProfileId`

### TEST-007 — Reject or ignore extra body/query ids

Request:

- `GET /fitness/profile?fitnessProfileId=...`
- `GET /fitness/profile?userProfileId=...`
- `GET /fitness/profile` com body indevido contendo ids

Expected:

- o endpoint não usa esses ids
- conforme o padrão HTTP atual do projeto, body/query extras devem ser rejeitados por validação quando aplicável
- a resolução do perfil continua vindo apenas da sessão

### TEST-008 — No Training, Nutrition or AI access

Then:

- não acessa `Training`
- não acessa `Nutrition`
- não acessa `AI`

---

## 6. Persistence Tests

### TEST-009 — FitnessProfile is read from database

Then:

- documento existe em `fitness_profiles`
- a leitura ocorre via `userProfileId`

---

## 7. Failure Scenarios

### TEST-010 — Database failure

Expected:

- `FITNESS_PROFILE_INTERNAL_ERROR`

---

## 8. E2E Scenario

### TEST-011 — Full API flow

Request:

```http
GET /fitness/profile
Authorization: Bearer <access-token>
```

Expected:

- `200 OK`
- resposta segura
- nenhum id é enviado pelo cliente

---

## 9. Summary

Esse conjunto de testes garante:

- resolução correta via sessão
- retorno apenas do perfil fitness ativo
- ausência de ids externos
- separação de `Training`, `Nutrition` e `AI`
