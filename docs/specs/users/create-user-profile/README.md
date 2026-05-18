# Use Case — Create User Profile

## 1. Overview

O use-case `create-user-profile` cria o perfil funcional do usuário no Elev9 Coach após autenticação.

No MVP, este use-case pertence ao `Users Context` e cria apenas um `UserProfile`.

Ele não cria `FitnessProfile`, não cria `NutritionProfile` e não acessa `AI`.

---

## 2. Context

```txt
Bounded Context: Users
Module: users
Use-case: create-user-profile
Canonical name: users.create-user-profile
```

---

## 3. Goal

Permitir que um usuário autenticado crie seu perfil funcional inicial usando:

- `name`
- `birthDate` opcional
- `gender` opcional

Os demais campos obrigatórios do MVP são preenchidos com defaults seguros quando não informados.

---

## 4. MVP Scope

Incluído:

- validar sessão JWT
- usar `userId` vindo da sessão, não do body
- validar input do perfil
- verificar se já existe `UserProfile` para o `AuthUser`
- criar `UserProfile`
- aplicar defaults de `language`, `timezone` e `status`
- retornar resposta segura

Não incluído:

- criação de `FitnessProfile`
- criação de `NutritionProfile`
- leitura ou escrita em `AI`
- atualização de perfil existente

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe um `AuthUser` válido na sessão
- ainda não existe `UserProfile` para esse `AuthUser`

---

## 6. Postconditions

Após sucesso:

- um `UserProfile` é criado
- `authUserId` é derivado da sessão autenticada
- `language` inicia como `en-US`
- `timezone` inicia como `UTC`
- `status` inicia como `active`

Nenhum outro contexto é alterado.

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`

---

## 8. Related Specs

- [auth/register-user](../../auth/register-user/README.md)
- [auth/login-user](../../auth/login-user/README.md)
- [auth/validate-session](../../auth/validate-session/README.md)
- `users/get-user-profile`

---

## 9. Business Value

Este use-case cria a identidade funcional do usuário dentro do produto.

Ele separa autenticação de perfil de produto e prepara o usuário para as próximas etapas do MVP.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT
- `userId` vem da sessão/JWT, nunca do body
- um `AuthUser` pode ter no máximo um `UserProfile`
- defaults:
  - `language = "en-US"`
  - `timezone = "UTC"`
  - `status = "active"`
- `create-user-profile` não cria `FitnessProfile`
- `create-user-profile` não cria `NutritionProfile`

---

## 11. Summary

O use-case deve priorizar:

- separação entre `Auth` e `Users`
- unicidade de perfil por `AuthUser`
- resposta segura
- isolamento de `Fitness`, `Nutrition` e `AI`
