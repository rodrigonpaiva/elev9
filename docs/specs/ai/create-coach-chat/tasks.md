# Tasks — Create Coach Chat

## Implementation Tasks

- validar o payload `{ message }`
- resolver `UserProfile`
- construir `UserHealthContext`
- resolver ou criar `CoachConversation`
- persistir mensagem do usuário
- gerar reply determinístico
- persistir mensagem do assistant
- retornar `conversationId` e `reply`

## Validation Tasks

- verificar autenticação
- verificar isolamento por usuário
- verificar persistência das mensagens
- verificar fallback seguro quando faltarem sinais
- verificar contrato do endpoint
