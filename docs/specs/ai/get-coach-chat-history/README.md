# Use Case — Get Coach Chat History

## 1. Overview

O use-case `get-coach-chat-history` retorna o histórico conversacional do usuário autenticado no Elev9 Coach.

No MVP, o fluxo lê mensagens persistidas de `CoachConversation` e `CoachMessage`, sem memória longa, sem LLM e sem replay.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: get-coach-chat-history
Canonical name: ai.get-coach-chat-history
```

---

## 3. Goal

Permitir que o usuário autenticado consulte as mensagens da sua conversa atual com o coach, com:

- isolamento por usuário
- ordenação cronológica
- `limit` opcional
- resposta vazia segura quando não houver mensagens

No MVP, o fluxo resolve internamente:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `CoachConversation` do usuário
- `CoachMessage` da conversa

---

## 4. MVP Scope

Incluído:

- proteger endpoint com `AuthSessionGuard`
- usar `authUserId` exclusivamente da sessão
- resolver `UserProfile`
- buscar a conversa atual do usuário
- buscar mensagens da conversa
- ordenar mensagens por `createdAt asc`
- aplicar `limit` com default `50`
- retornar `[]` se não houver histórico

Não incluído:

- OpenAI
- streaming
- multi-conversation UX
- memória longa
- semantic memory
- replay
- analytics

---

## 5. Preconditions

- a requisição está autenticada por sessão/JWT
- existe `UserProfile` para o usuário autenticado

Se não houver conversa ou mensagens, o endpoint deve responder com lista vazia.

---

## 6. Postconditions

Após sucesso:

- nenhum dado de outros usuários é exposto
- nenhuma entidade é alterada por este endpoint
- uma lista cronológica de mensagens é retornada

Observação:

- a criação da conversa e o armazenamento das mensagens acontecem em `POST /ai/chat`

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `CoachConversation`
- `CoachMessage`

---

## 8. Related Specs

- [auth/validate-session](../../auth/validate-session/README.md)
- [users/create-user-profile](../../users/create-user-profile/README.md)
- [ai/create-coach-chat](../create-coach-chat/README.md)
- [ai/build-user-health-context](../build-user-health-context/README.md)
- [ai/generate-coach-feedback](../generate-coach-feedback/README.md)
- [ai/get-coach-chat-debug](../get-coach-chat-debug/README.md)
- [ai/get-coach-chat-memory-debug](../get-coach-chat-memory-debug/README.md)

---

## 9. Business Value

Este use-case fornece continuidade ao MVP conversacional sem introduzir estado complexo.

Ele prepara a base para:

- revisão do histórico pelo usuário
- continuidade de conversa
- futura evolução para chat assistido por LLM

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é `GET /ai/chat/history`
- o endpoint é protegido por sessão/JWT
- o cliente não envia body
- `limit` é opcional
- `limit` default = `50`
- o histórico retorna apenas mensagens do usuário autenticado
- a lista é retornada em ordem cronológica
- nenhuma IA externa é usada no MVP

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- leitura simples e consistente
- isolamento por usuário
- resposta segura quando não houver mensagens
- base pronta para evolução futura de conversação
