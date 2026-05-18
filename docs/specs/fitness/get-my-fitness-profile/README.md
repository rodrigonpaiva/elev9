# Use Case — Get My Fitness Profile

## 1. Overview

O use-case `get-my-fitness-profile` retorna o perfil fitness ativo do usuário autenticado no Elev9 Coach.

No MVP, este use-case pertence ao `Fitness Context` e retorna apenas um `FitnessProfile`.

Ele não acessa `Training`, `Nutrition` ou `AI`.

---

## 2. Context

```txt
Bounded Context: Fitness
Module: fitness
Use-case: get-my-fitness-profile
Canonical name: fitness.get-my-fitness-profile
```

---

## 3. Goal

Permitir que um usuário autenticado consulte seu próprio `FitnessProfile` ativo a partir da sessão atual.

O fluxo resolve:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `FitnessProfile` ativo pelo `userProfileId`

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- usar `authUserId` da sessão
- localizar `UserProfile`
- localizar `FitnessProfile` ativo
- retornar resposta segura

Não incluído:

- consulta por `userProfileId`
- consulta por `fitnessProfileId`
- acesso a `Training`
- acesso a `Nutrition`
- acesso a `AI`

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `UserProfile` para o usuário autenticado
- existe `FitnessProfile` ativo para esse `UserProfile`

---

## 6. Postconditions

Após sucesso:

- nenhum dado é alterado
- o `FitnessProfile` ativo do usuário autenticado é retornado

Nenhum outro contexto é alterado.

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `FitnessProfile`

---

## 8. Related Specs

- [auth/validate-session](../../auth/validate-session/README.md)
- [users/create-user-profile](../../users/create-user-profile/README.md)
- [fitness/create-fitness-profile](../create-fitness-profile/README.md)

---

## 9. Business Value

Este use-case permite que o app recupere o estado fitness atual do usuário autenticado sem expor ids sensíveis nem depender de outros contexts.

Ele suporta onboarding, telas de perfil e fluxos posteriores que dependem do contexto físico do usuário.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT/AuthGuard
- `authUserId` vem da sessão
- o sistema resolve `UserProfile` pelo `authUserId`
- o sistema resolve `FitnessProfile` ativo pelo `userProfileId`
- nenhum id é aceito do cliente
- o use-case não acessa `Training`
- o use-case não acessa `Nutrition`
- o use-case não acessa `AI`

---

## 11. Summary

O use-case deve priorizar:

- resolução de identidade apenas pela sessão
- isolamento entre usuários
- retorno apenas do perfil fitness ativo
- ausência de dependência com `Training`, `Nutrition` e `AI`
