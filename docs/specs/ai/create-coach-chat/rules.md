# Rules — Create Coach Chat

## Authentication

- o endpoint exige sessão autenticada
- `authUserId` vem exclusivamente da sessão

## Determinism

- a resposta continua determinística quando o LLM falha ou está desabilitado
- o LLM é opcional e protegido por safety, reliability e observability
- a versão do prompt é resolvida por registry interno e rollout canário determinístico

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
- não alterar o contrato síncrono público
- não expor dados sensíveis no payload público
- não expor metadata interna de experimento, rollout ou prompt version ao cliente
