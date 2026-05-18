# Flow — Create Coach Chat

## 1. Authenticate request

O endpoint valida a sessão com `AuthSessionGuard`.

## 2. Resolve user profile

O fluxo resolve `UserProfile` usando `authUserId`.

## 3. Resolve health context

O fluxo constrói `UserHealthContext` para recuperar sinais de treino, recuperação e nutrição.

## 4. Load or create conversation

O sistema busca uma `CoachConversation` do usuário.

Se não existir conversa, uma nova é criada automaticamente.

## 5. Persist user message

A mensagem do usuário é persistida como `CoachMessage` com role `user`.

## 6. Generate deterministic reply

O reply é gerado por regras determinísticas simples, usando sinais como:

- `fatigueLevel`
- `recoveryTrend`
- `nutrition guidance`
- `latestCheckIn`

## 7. Persist assistant message

A resposta do coach é persistida como `CoachMessage` com role `assistant`.

## 8. Return response

O endpoint retorna:

- `conversationId`
- `reply`

## 9. Safety fallback

Quando faltam sinais, o fluxo responde com orientação segura e conservadora, sem claims médicos.
