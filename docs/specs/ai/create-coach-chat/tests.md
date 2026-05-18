# Tests — Create Coach Chat

## Coverage

- cria conversa automaticamente quando necessário
- persiste mensagens do usuário e do assistant
- gera reply heurístico baseado no contexto
- retorna `conversationId` e `reply`
- funciona com fallback quando faltam sinais de check-in ou nutrição
- rejeita payload inválido
- protege o endpoint com autenticação
- mantém isolamento por usuário
