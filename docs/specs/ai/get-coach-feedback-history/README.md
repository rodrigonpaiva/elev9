# Use Case — Get Coach Feedback History

## 1. Overview

O use-case `get-coach-feedback-history` retorna o histórico de feedbacks de coach já gerados para o usuário autenticado no Elev9 Coach.

No MVP, este fluxo depende da persistência simples de `CoachFeedback` no contexto `AI`, sem uso de LLM externo e sem leitura do contexto `Nutrition`.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: get-coach-feedback-history
Canonical name: ai.get-coach-feedback-history
```

---

## 3. Goal

Permitir que o usuário autenticado consulte os feedbacks de coach já gerados anteriormente, com:

- isolamento por usuário
- ordenação por `createdAt desc`
- `limit` opcional
- resposta vazia segura quando não houver histórico

No MVP, o fluxo resolve internamente:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `CoachFeedbacks` pelo `userProfileId`

---

## 4. MVP Scope

Incluído:

- proteger endpoint com JWT/AuthGuard
- usar `authUserId` exclusivamente da sessão
- resolver `UserProfile`
- buscar `CoachFeedback` por `userProfileId`
- ordenar por `createdAt desc`
- aplicar `limit` com default `20` e máximo `50`
- retornar `[]` se não houver feedbacks
- atualizar `POST /ai/coach-feedback` para persistir feedback gerado
- usar `id desc` como desempate quando `createdAt` empatar, se o repositório/driver suportar

Não incluído:

- OpenAI
- chat multi-turn
- ranking de recomendações
- timeline visual
- integração com `Nutrition`
- edição ou exclusão de histórico

---

## 5. Preconditions

- a requisição está autenticada por JWT
- existe `UserProfile` para o usuário autenticado
- o módulo `AI` já persiste `CoachFeedback` ao gerar novo feedback

---

## 6. Postconditions

Após sucesso:

- nenhum dado de outros usuários é exposto
- nenhuma entidade é alterada por este endpoint
- uma lista ordenada de `CoachFeedback` é retornada

Observação:

- a criação de `CoachFeedback` acontece no `POST /ai/coach-feedback`, não neste `GET`

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `CoachFeedback`

---

## 8. Related Specs

- `auth/validate-session`
- `users/create-user-profile`
- `ai/generate-coach-feedback`

---

## 9. Business Value

Este use-case transforma o feedback instantâneo de coach em um histórico navegável.

Isso prepara a base para:

- timeline de coach
- memória simples do produto
- futura integração com chat e continuidade conversacional

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é `GET /ai/coach-feedback`
- o endpoint é protegido por sessão/JWT
- o cliente não envia body
- `limit` é opcional
- `limit` default = `20`
- `limit` máximo = `50`
- o histórico retorna apenas feedbacks do usuário autenticado
- o módulo `AI` não lê `Nutrition`
- `POST /ai/coach-feedback` deve persistir sempre o feedback gerado
- o histórico depende da persistência bem-sucedida feita por `POST /ai/coach-feedback`

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- persistência simples e consistente
- leitura isolada por usuário
- resposta segura quando não houver dados
- base pronta para evolução futura de AI coach
