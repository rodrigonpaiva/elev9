# Use Case — Get Coach Chat Debug

## 1. Overview

O use-case `get-coach-chat-debug` expõe a superfície unificada de debugging da camada conversacional do Elev9 Coach.

Ele agrega, em uma resposta autenticada e sanitizada:

- o snapshot de prompt debug
- o snapshot de reply-path debug
- o histórico recente de chat debug
- o preview resumido da memória conversacional determinística

O objetivo é acelerar inspeção e triagem técnica da arquitetura conversacional sem expor prompt bruto, dados sensíveis ou payloads internos completos.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: get-coach-chat-debug
Canonical name: ai.get-coach-chat-debug
```

---

## 3. Goal

Permitir que um usuário autenticado inspecione a visão consolidada do debug conversacional via `GET /ai/chat/debug`.

No fluxo atual, o endpoint:

- resolve o `UserProfile`
- reutiliza o `UserHealthContext`
- reutiliza os debug use-cases existentes
- retorna apenas dados reduzidos e seguros

---

## 4. MVP Scope

Incluído:

- proteger endpoint com `AuthSessionGuard`
- usar `authUserId` exclusivamente da sessão
- agregar prompt debug
- agregar reply-path debug
- incluir histórico recente de chat debug
- limitar o histórico recente
- retornar somente snapshots sanitizados

Não incluído:

- OpenAI orchestration
- streaming
- replay
- semantic memory
- LangGraph
- multi-agent routing
- voice interface

---

## 5. Preconditions

- a requisição está autenticada por sessão/JWT
- existe `UserProfile` para o usuário autenticado
- os use-cases de prompt debug, reply-path debug e history debug existem no módulo `ai`

Se não houver histórico, o endpoint deve continuar retornando a visão agregada com lista vazia de mensagens recentes.

---

## 6. Postconditions

Após sucesso:

- nenhum prompt bruto é exposto
- nenhum payload OpenAI bruto é exposto
- nenhum dado de sessão/autenticação é retornado
- nenhuma entidade é mutada
- a inspeção permanece apenas de leitura

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `UserHealthContext`
- `CoachConversation`
- `CoachMessage`
- `CoachConversationMemory`

---

## 8. Related Specs

- `ai/create-coach-chat`
- `ai/get-coach-chat-history`
- `ai/get-coach-chat-debug-history`
- `ai/get-coach-chat-memory-debug` (`./get-coach-chat-memory-debug/README.md`)
- `ai/get-coach-chat-prompt-debug`
- `ai/get-coach-chat-reply-path-debug`

---

## 9. Business Value

Esta superfície unificada reduz o custo de suporte e debug da camada conversacional.

Ela consolida a inspeção técnica em um único endpoint sem introduzir replay, memória longa ou dependência de provider generativo no caminho de debug.

O preview de memória exposto aqui vem da camada determinística de memory summarization e não representa semantic memory.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é `GET /ai/chat/debug`
- o endpoint é protegido por sessão/JWT
- o endpoint é de leitura apenas
- o endpoint agrega os debug use-cases já existentes
- o endpoint retorna apenas dados sanitizados
- nenhuma chamada real para OpenAI é executada

---

## 11. Summary

O use-case deve priorizar:

- inspeção unificada
- isolamento por usuário
- respostas sanitizadas e determinísticas
- zero mutação de estado
- compatibilidade com a arquitetura conversacional atual
