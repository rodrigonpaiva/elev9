# Use Case — Create Fitness Profile

## 1. Overview

O use-case `create-fitness-profile` cria o perfil fitness inicial do usuário no Elev9 Coach.

No MVP, este use-case pertence ao `Fitness Context` e cria apenas um `FitnessProfile`.

Ele não cria `TrainingPlan`, não acessa `Nutrition` e não acessa `AI`.

---

## 2. Context

```txt
Bounded Context: Fitness
Module: fitness
Use-case: create-fitness-profile
Canonical name: fitness.create-fitness-profile
```

---

## 3. Goal

Permitir que um usuário autenticado crie seu perfil fitness usando:

- `heightCm`
- `weightKg`
- `goal`
- `activityLevel`
- `trainingAvailability`
- `limitations` opcionais

O perfil fitness é associado ao `UserProfile` do usuário autenticado.

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- usar `authUserId` da sessão para localizar `UserProfile`
- verificar existência de `UserProfile`
- validar input fitness
- impedir múltiplos `FitnessProfile` ativos por `UserProfile`
- criar `FitnessProfile`
- aplicar `status = "active"`
- retornar resposta segura

Não incluído:

- criação de `TrainingPlan`
- acesso a `Nutrition`
- acesso a `AI`
- geração automática de recomendações

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `UserProfile` para o usuário autenticado
- ainda não existe `FitnessProfile` ativo para esse `UserProfile`

---

## 6. Postconditions

Após sucesso:

- um `FitnessProfile` é criado
- `userProfileId` é persistido no perfil fitness
- `status` inicia como `active`

Nenhum outro contexto é alterado.

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `FitnessProfile`

---

## 8. Related Specs

- `auth/validate-session`
- `users/create-user-profile`
- `fitness/update-fitness-profile`

---

## 9. Business Value

Este use-case cria o contexto físico inicial necessário para personalização futura de treino no produto.

Ele separa identidade funcional de contexto fitness e prepara o usuário para etapas posteriores do MVP.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é protegido por JWT/AuthGuard
- `authUserId` vem da sessão para localizar `UserProfile`
- `FitnessProfile` pertence ao `UserProfile`, não diretamente ao `AuthUser`
- `userProfileId` é persistido no `FitnessProfile`
- só pode existir um `FitnessProfile` ativo por `UserProfile`
- o use-case cria apenas `FitnessProfile`
- o use-case não cria `TrainingPlan`
- o use-case não acessa `Nutrition`
- o use-case não acessa `AI`

---

## 11. Summary

O use-case deve priorizar:

- vínculo correto com `UserProfile`
- unicidade de perfil fitness ativo
- resposta segura
- isolamento de `Training`, `Nutrition` e `AI`
