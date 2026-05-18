# Use Case — Get Coach Chat Memory Debug

## 1. Overview

O use-case `get-coach-chat-memory-debug` expõe uma superfície determinística de inspeção da memória conversacional resumida do Elev9 Coach.

Ele lê o estado atual de `CoachConversationMemory` e retorna apenas um preview sanitizado da memória resumida, sem recalcular o conteúdo e sem executar LLM.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: get-coach-chat-memory-debug
Canonical name: ai.get-coach-chat-memory-debug
```

---

## 3. Goal

Permitir que um usuário autenticado inspecione, via `GET /ai/chat/debug/memory`, o estado atual da memória conversacional resumida associada à sua conversa.

No fluxo atual, o endpoint:

- resolve o `UserProfile`
- resolve a conversa atual do usuário
- lê a memória resumida persistida
- retorna apenas dados reduzidos, sanitizados e determinísticos

---

## 4. MVP Scope

Incluído:

- proteger endpoint com `AuthSessionGuard`
- usar `authUserId` exclusivamente da sessão
- resolver `UserProfile`
- buscar a conversa atual do usuário
- buscar a memória resumida associada à conversa
- retornar somente preview sanitizado
- manter o endpoint inspection-only

Não incluído:

- OpenAI execution
- memory recalculation
- semantic memory
- embeddings
- vector retrieval
- LangGraph
- replay
- streaming

---

## 5. Preconditions

- a requisição está autenticada por sessão/JWT
- existe `UserProfile` para o usuário autenticado

Se não houver conversa ou memória, o endpoint deve responder com payload vazio.

---

## 6. Postconditions

Após sucesso:

- nenhum resumo bruto é exposto
- nenhum histórico bruto é exposto
- nenhum prompt bruto é exposto
- nenhum dado de sessão/autenticação é retornado
- nenhuma entidade é mutada
- a inspeção permanece apenas de leitura

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `CoachConversation`
- `CoachConversationMemory`

---

## 8. Related Specs

- `ai/create-coach-chat`
- `ai/get-coach-chat-history`
- `ai/get-coach-chat-debug`
- `ai/get-coach-chat-debug-history`
- `ai/get-coach-chat-prompt-debug`
- `ai/get-coach-chat-reply-path-debug`

---

## 9. Business Value

Esta superfície dedicada facilita a inspeção do estado resumido de memória sem depender do endpoint unificado.

Ela ajuda a validar a memória conversacional determinística, a continuidade do coaching e a compatibilidade com a arquitetura de debug já existente.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é `GET /ai/chat/debug/memory`
- o endpoint é protegido por sessão/JWT
- o endpoint é de leitura apenas
- o endpoint lê a memória resumida persistida
- o endpoint retorna apenas preview sanitizado
- nenhuma chamada real para OpenAI é executada

---

## 11. Summary

O use-case deve priorizar:

- inspeção isolada da memória conversacional
- isolamento por usuário
- respostas sanitizadas e determinísticas
- zero mutação de estado
- compatibilidade com a camada conversacional atual
