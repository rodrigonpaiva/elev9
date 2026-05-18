# Rules — Create Coach Chat

## Authentication

- o endpoint exige sessão autenticada
- `authUserId` vem exclusivamente da sessão

## Determinism

- a resposta é determinística
- não existe LLM ativo neste MVP

## Persistence

- a conversa é persistida em `CoachConversation`
- as mensagens são persistidas em `CoachMessage`
- a mensagem do usuário e a resposta do assistant devem ser salvas

## Context Use

- o fluxo reutiliza `BuildUserHealthContextService`
- o fluxo usa sinais atuais do usuário
- o cliente não envia contexto extra

## Safety

- não fazer claims médicos
- não criar memória longa
- não criar replay
- não criar streaming
- não expor dados sensíveis no payload público
