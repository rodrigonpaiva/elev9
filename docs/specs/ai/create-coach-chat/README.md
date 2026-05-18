# Use Case — Create Coach Chat

## 1. Overview

O use-case `create-coach-chat` inicia a camada conversacional do Elev9 Coach com uma resposta determinística baseada em contexto.

No MVP, o fluxo não usa LLM externo. Ele persiste uma conversa e mensagens do usuário/assistant, injeta `UserHealthContext` e gera uma resposta heurística simples baseada em recuperação, treino e nutrição.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: create-coach-chat
Canonical name: ai.create-coach-chat
```

---

## 3. Goal

Permitir que um usuário autenticado envie uma mensagem para o coach e receba uma resposta conversacional inicial baseada em contexto atual.

No MVP, o fluxo resolve internamente:

- `authUserId` pela sessão
- `UserProfile` pelo `authUserId`
- `UserHealthContext` pelo `userProfileId`
- `CoachConversation` ativa pelo `userProfileId`
- `CoachMessage` do usuário e do assistant

---

## 4. MVP Scope

Incluído:

- proteger endpoint com `AuthSessionGuard`
- usar `authUserId` da sessão
- resolver `UserProfile`
- criar `CoachConversation` automaticamente quando necessário
- persistir mensagem do usuário
- gerar resposta heurística determinística
- persistir resposta do assistant
- retornar `conversationId` e `reply`
- reutilizar `BuildUserHealthContextService`
- responder com fallback seguro quando houver poucos dados

Não incluído:

- OpenAI
- streaming
- memória longa
- semantic memory
- RAG
- vector database
- multi-agent orchestration
- prompt engineering complexo

---

## 5. Preconditions

- a requisição está autenticada por sessão/JWT
- existe `UserProfile` para o usuário autenticado

Se não houver conversa anterior, o sistema deve criar uma nova automaticamente.

---

## 6. Postconditions

Após sucesso:

- a mensagem do usuário é persistida
- a resposta do assistant é persistida
- uma conversa do usuário é criada se não existia
- o payload público retorna apenas `conversationId` e `reply`

Se a persistência falhar:

- o endpoint falha com `AI_CHAT_INTERNAL_ERROR`
- nenhuma resposta não persistida é tratada como sucesso

---

## 7. Related Entities

- `AuthUser`
- `UserProfile`
- `UserHealthContext`
- `CoachConversation`
- `CoachMessage`

---

## 8. Related Specs

- [auth/validate-session](../../auth/validate-session/README.md)
- [users/create-user-profile](../../users/create-user-profile/README.md)
- [ai/build-user-health-context](../build-user-health-context/README.md)
- [ai/get-ai-context](../get-ai-context/README.md)
- [ai/generate-coach-feedback](../generate-coach-feedback/README.md)
- [ai/get-coach-feedback-history](../get-coach-feedback-history/README.md)
- [ai/get-coach-chat-history](../get-coach-chat-history/README.md)
- [ai/get-coach-chat-debug](../get-coach-chat-debug/README.md)
- [ai/get-coach-chat-memory-debug](../get-coach-chat-memory-debug/README.md)

---

## 9. Business Value

Este use-case adiciona a primeira interface conversacional do produto sem depender de LLM externo.

Ele transforma dados já existentes em interação direta com o coach:

- contexto de recuperação
- awareness de nutrição
- leitura do momento atual do usuário

Isso prepara a base para evolução futura com LLM, sem comprometer o MVP determinístico.

---

## 10. Decision

Decisões fechadas para o MVP:

- o endpoint é `POST /ai/chat`
- o endpoint é protegido por sessão/JWT
- o body aceita apenas `message`
- a conversa é criada automaticamente se não existir
- a resposta é determinística e baseada em contexto atual
- `UserHealthContext` é resolvido no fluxo
- `CoachMessage` do usuário e do assistant são persistidos
- o cliente recebe somente `conversationId` e `reply`
- nenhuma IA externa é usada no MVP

---

## 11. Summary

O use-case deve priorizar:

- resolução exclusiva via sessão
- persistência simples e consistente
- resposta segura e contextual
- nenhuma mutação de dados de usuário além da conversa
- arquitetura pronta para futura integração com IA generativa
